use crate::models::{DateRange, OHLCVRow, SymbolSearchResult};
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
struct CoinSearchResponse {
    coins: Vec<CoinSearchItem>,
}

#[derive(Deserialize)]
struct CoinSearchItem {
    symbol: String,
    name: String,
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

/// Convert a DateRange `from` timestamp to the nearest valid CoinGecko OHLC `days` value.
/// First fetch (from <= Y2K) uses "max" to request all available history.
fn to_ohlc_days(range_from: i64, range_to: i64) -> String {
    // Sentinel for "get everything" — first fetch sets from = 946684800 (2000-01-01)
    if range_from <= 946684800 {
        return "max".to_string();
    }
    let days = ((range_to - range_from) / 86400) + 2; // +2 day buffer
    match days {
        d if d <= 7 => "7",
        d if d <= 14 => "14",
        d if d <= 30 => "30",
        d if d <= 90 => "90",
        d if d <= 180 => "180",
        d if d <= 365 => "365",
        _ => "max",
    }
    .to_string()
}

#[async_trait]
impl MarketDataProvider for CoinGeckoProvider {
    fn name(&self) -> &str {
        "coingecko"
    }

    async fn fetch_ohlcv(&self, symbol: &str, range: &DateRange) -> anyhow::Result<Vec<OHLCVRow>> {
        let coin_id = ticker_to_coin_id(symbol);
        let days = to_ohlc_days(range.from, range.to);

        // /ohlc returns [[ts_ms, open, high, low, close], ...]
        let raw: Vec<[f64; 5]> = self
            .client
            .get(format!(
                "https://api.coingecko.com/api/v3/coins/{}/ohlc",
                coin_id
            ))
            .query(&[("vs_currency", "usd"), ("days", days.as_str())])
            .send()
            .await?
            .json()
            .await?;

        let mut rows = Vec::with_capacity(raw.len());
        for point in &raw {
            let ts_ms = point[0];
            let ts = (ts_ms / 1000.0) as i64;
            // Normalize to start of day (UTC midnight)
            let ts_day = ts - (ts % 86400);

            rows.push(OHLCVRow {
                id: None,
                asset_id: String::new(),
                ts: ts_day,
                open: Some(point[1]),
                high: Some(point[2]),
                low: Some(point[3]),
                close: point[4],
                volume: None,
            });
        }

        // Deduplicate by day — keep the last candle per day (most recent for intraday ranges)
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

    async fn search_symbols(&self, query: &str) -> anyhow::Result<Vec<SymbolSearchResult>> {
        let resp: CoinSearchResponse = self
            .client
            .get("https://api.coingecko.com/api/v3/search")
            .query(&[("query", query)])
            .send()
            .await?
            .json()
            .await?;

        let results = resp
            .coins
            .into_iter()
            .take(5)
            .map(|coin| SymbolSearchResult {
                symbol: coin.symbol.to_uppercase(),
                name: coin.name,
                asset_type: "crypto".to_string(),
                provider: "CoinGecko".to_string(),
                exchange: None,
            })
            .collect();

        Ok(results)
    }
}
