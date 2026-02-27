use crate::models::{DateRange, OHLCVRow, SymbolSearchResult};
use crate::providers::MarketDataProvider;
use async_trait::async_trait;
use serde::Deserialize;
use std::collections::HashMap;

pub struct CoinGeckoProvider {
    client: reqwest::Client,
    api_key: Option<String>,
}

impl CoinGeckoProvider {
    pub fn new() -> Self {
        Self::new_with_key(None)
    }

    pub fn new_with_key(api_key: Option<String>) -> Self {
        Self {
            client: reqwest::Client::builder()
                .user_agent("atlas/0.1")
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
            api_key,
        }
    }

    fn auth_params(&self) -> Vec<(&str, String)> {
        match &self.api_key {
            Some(key) => vec![("x_cg_demo_api_key", key.clone())],
            None => vec![],
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
    total_volumes: Vec<[f64; 2]>,
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
    prices: HashMap<String, CoinPrice>,
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

        // Clamp `from` to within the 365-day free-tier limit.
        // Handles range.from == 0 (first fetch via CoinGecko fallback path).
        let limit = chrono::Utc::now().timestamp() - 364 * 86400;
        let from = if range.from == 0 || range.from < limit {
            limit
        } else {
            range.from
        };

        // /market_chart/range returns { prices: [[ts_ms, close], ...], total_volumes: [[ts_ms, vol], ...] }
        // Uses explicit from/to Unix timestamps — perfect for incremental fetching.
        // Daily granularity for ranges > 90 days; hourly for shorter ranges (deduped to daily below).
        let mut query: Vec<(&str, String)> = vec![
            ("vs_currency", "usd".to_string()),
            ("from", from.to_string()),
            ("to", range.to.to_string()),
        ];
        query.extend(self.auth_params());

        let resp: MarketChartResponse = self
            .client
            .get(format!(
                "https://api.coingecko.com/api/v3/coins/{}/market_chart/range",
                coin_id
            ))
            .query(&query)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        // Build volume map keyed by ts_day for O(1) lookup
        let volume_map: HashMap<i64, f64> = resp
            .total_volumes
            .iter()
            .map(|point| {
                let ts = (point[0] / 1000.0) as i64;
                let ts_day = ts - (ts % 86400);
                (ts_day, point[1])
            })
            .collect();

        let mut rows: Vec<OHLCVRow> = resp
            .prices
            .iter()
            .map(|point| {
                let ts = (point[0] / 1000.0) as i64;
                let ts_day = ts - (ts % 86400);
                let close = point[1];
                OHLCVRow {
                    id: None,
                    asset_id: String::new(),
                    ts: ts_day,
                    open: Some(close),
                    high: Some(close),
                    low: Some(close),
                    close,
                    volume: volume_map.get(&ts_day).copied(),
                }
            })
            .collect();

        // Sort by timestamp, then deduplicate by day (keeps last point per day for hourly ranges)
        rows.sort_by_key(|r| r.ts);
        rows.dedup_by_key(|r| r.ts);
        Ok(rows)
    }

    async fn fetch_current_price(&self, symbol: &str) -> anyhow::Result<f64> {
        let coin_id = ticker_to_coin_id(symbol);

        let mut query: Vec<(&str, String)> = vec![
            ("ids", coin_id.clone()),
            ("vs_currencies", "usd".to_string()),
        ];
        query.extend(self.auth_params());

        let resp: SimplePriceResponse = self
            .client
            .get("https://api.coingecko.com/api/v3/simple/price")
            .query(&query)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        resp.prices
            .get(&coin_id)
            .and_then(|p| p.usd)
            .ok_or_else(|| anyhow::anyhow!("No price found for {}", symbol))
    }

    async fn search_symbols(&self, query: &str) -> anyhow::Result<Vec<SymbolSearchResult>> {
        let mut params: Vec<(&str, String)> = vec![("query", query.to_string())];
        params.extend(self.auth_params());

        let resp: CoinSearchResponse = self
            .client
            .get("https://api.coingecko.com/api/v3/search")
            .query(&params)
            .send()
            .await?
            .error_for_status()?
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
