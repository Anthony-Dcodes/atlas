use crate::models::{DateRange, OHLCVRow};
use crate::providers::MarketDataProvider;
use async_trait::async_trait;
use serde::Deserialize;

pub struct CoinGeckoProvider {
    client: reqwest::Client,
}

impl CoinGeckoProvider {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .user_agent("atlas/0.1")
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }
}

/// Map common crypto tickers to CoinGecko coin IDs.
/// Returns an owned String to avoid lifetime issues with unknown tickers.
pub fn ticker_to_coin_id(ticker: &str) -> String {
    match ticker.to_uppercase().as_str() {
        "BTC" => "bitcoin".to_string(),
        "ETH" => "ethereum".to_string(),
        "SOL" => "solana".to_string(),
        "ADA" => "cardano".to_string(),
        "DOT" => "polkadot".to_string(),
        "DOGE" => "dogecoin".to_string(),
        "XRP" => "ripple".to_string(),
        "AVAX" => "avalanche-2".to_string(),
        "MATIC" | "POL" => "matic-network".to_string(),
        "LINK" => "chainlink".to_string(),
        "UNI" => "uniswap".to_string(),
        "ATOM" => "cosmos".to_string(),
        "LTC" => "litecoin".to_string(),
        "BNB" => "binancecoin".to_string(),
        other => other.to_lowercase(),
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

            rows.push(OHLCVRow {
                id: None,
                asset_id: String::new(),
                ts: ts_day,
                open: None,
                high: None,
                low: None,
                close: price,
                volume: None,
            });
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
            .query(&[("ids", coin_id.as_str()), ("vs_currencies", "usd")])
            .send()
            .await?
            .json()
            .await?;

        resp.prices
            .get(&coin_id)
            .and_then(|p| p.usd)
            .ok_or_else(|| anyhow::anyhow!("No price found for {}", symbol))
    }
}
