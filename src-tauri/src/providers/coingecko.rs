use crate::models::{DateRange, OHLCVRow};
use crate::providers::MarketDataProvider;
use async_trait::async_trait;
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use serde::Deserialize;

pub struct CoinGeckoProvider {
    client: reqwest::Client,
}

impl CoinGeckoProvider {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }
}

// CoinGecko uses coin IDs, not tickers. Common mappings:
pub fn ticker_to_coin_id(ticker: &str) -> &str {
    match ticker.to_uppercase().as_str() {
        "BTC" => "bitcoin",
        "ETH" => "ethereum",
        "SOL" => "solana",
        "ADA" => "cardano",
        "DOT" => "polkadot",
        "DOGE" => "dogecoin",
        "XRP" => "ripple",
        "AVAX" => "avalanche-2",
        "MATIC" | "POL" => "matic-network",
        "LINK" => "chainlink",
        "UNI" => "uniswap",
        "ATOM" => "cosmos",
        "LTC" => "litecoin",
        "BNB" => "binancecoin",
        other => {
            // For unknown tickers, try lowercase as coin ID
            // This leaks the string but it's a fallback
            // Caller should handle errors
            Box::leak(other.to_lowercase().into_boxed_str())
        }
    }
}

#[derive(Deserialize)]
struct MarketChartResponse {
    prices: Vec<[f64; 2]>,
}

#[derive(Deserialize)]
struct SimplePriceResponse {
    #[serde(flatten)]
    prices: std::collections::HashMap<String, CoinPrice>,
}

#[derive(Deserialize)]
struct CoinPrice {
    usd: Option<f64>,
}

#[async_trait]
impl MarketDataProvider for CoinGeckoProvider {
    fn name(&self) -> &str {
        "coingecko"
    }

    async fn fetch_ohlcv(&self, symbol: &str, range: &DateRange) -> anyhow::Result<Vec<OHLCVRow>> {
        let coin_id = ticker_to_coin_id(symbol);

        let resp: MarketChartResponse = self
            .client
            .get(format!(
                "https://api.coingecko.com/api/v3/coins/{}/market_chart/range",
                coin_id
            ))
            .query(&[
                ("vs_currency", "usd"),
                ("from", &range.from.to_string()),
                ("to", &range.to.to_string()),
            ])
            .send()
            .await?
            .json()
            .await?;

        let mut rows = Vec::with_capacity(resp.prices.len());
        for point in &resp.prices {
            let ts_ms = point[0];
            let price = point[1];
            let ts = (ts_ms / 1000.0) as i64;
            // Normalize to start of day
            let ts_day = ts - (ts % 86400);

            if let Some(decimal_price) = Decimal::from_f64(price) {
                rows.push(OHLCVRow {
                    id: None,
                    asset_id: String::new(),
                    ts: ts_day,
                    open: None,
                    high: None,
                    low: None,
                    close: decimal_price,
                    volume: None,
                });
            }
        }

        // Deduplicate by day (keep last entry per day)
        rows.sort_by_key(|r| r.ts);
        rows.dedup_by_key(|r| r.ts);
        Ok(rows)
    }

    async fn fetch_current_price(&self, symbol: &str) -> anyhow::Result<f64> {
        let coin_id = ticker_to_coin_id(symbol);

        let resp: SimplePriceResponse = self
            .client
            .get("https://api.coingecko.com/api/v3/simple/price")
            .query(&[("ids", coin_id), ("vs_currencies", "usd")])
            .send()
            .await?
            .json()
            .await?;

        resp.prices
            .get(coin_id)
            .and_then(|p| p.usd)
            .ok_or_else(|| anyhow::anyhow!("No price found for {}", symbol))
    }
}
