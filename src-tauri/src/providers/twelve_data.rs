use crate::models::{DateRange, OHLCVRow, SymbolSearchResult};
use crate::providers::MarketDataProvider;
use async_trait::async_trait;
use chrono::DateTime;
use serde::Deserialize;

pub struct TwelveDataProvider {
    api_key: String,
    client: reqwest::Client,
}

impl TwelveDataProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: reqwest::Client::builder()
                .user_agent("atlas/0.1")
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }
}

#[derive(Deserialize)]
struct TimeSeriesResponse {
    values: Option<Vec<TimeSeriesValue>>,
    status: Option<String>,
    message: Option<String>,
}

#[derive(Deserialize)]
struct TimeSeriesValue {
    datetime: String,
    open: String,
    high: String,
    low: String,
    close: String,
    volume: Option<String>,
}

#[derive(Deserialize)]
struct PriceResponse {
    price: Option<String>,
    status: Option<String>,
    message: Option<String>,
}

#[async_trait]
impl MarketDataProvider for TwelveDataProvider {
    fn name(&self) -> &str {
        "twelve_data"
    }

    async fn fetch_ohlcv(&self, symbol: &str, range: &DateRange) -> anyhow::Result<Vec<OHLCVRow>> {
        let end = DateTime::from_timestamp(range.to, 0)
            .ok_or_else(|| anyhow::anyhow!("Invalid end timestamp"))?
            .format("%Y-%m-%d")
            .to_string();

        // On first fetch (from=0), omit start_date and rely on outputsize=5000
        // to get max available history (~20 years of daily data)
        let is_first_fetch = range.from == 0;

        let mut params = vec![
            ("symbol", symbol.to_string()),
            ("interval", "1day".to_string()),
            ("end_date", end),
            ("apikey", self.api_key.clone()),
            ("format", "JSON".to_string()),
            ("outputsize", "5000".to_string()),
        ];

        if !is_first_fetch {
            let start = DateTime::from_timestamp(range.from, 0)
                .ok_or_else(|| anyhow::anyhow!("Invalid start timestamp"))?
                .format("%Y-%m-%d")
                .to_string();
            params.push(("start_date", start));
        }

        let resp: TimeSeriesResponse = self
            .client
            .get("https://api.twelvedata.com/time_series")
            .query(&params)
            .send()
            .await?
            .json()
            .await?;

        if resp.status.as_deref() == Some("error") {
            anyhow::bail!(
                "Twelve Data API error: {}",
                resp.message.unwrap_or_else(|| "Unknown error".to_string())
            );
        }

        let values = resp.values.unwrap_or_default();
        let mut rows = Vec::with_capacity(values.len());

        for v in values {
            let ts = parse_date_to_unix(&v.datetime)?;
            rows.push(OHLCVRow {
                id: None,
                asset_id: String::new(),
                ts,
                open: Some(v.open.parse::<f64>()?),
                high: Some(v.high.parse::<f64>()?),
                low: Some(v.low.parse::<f64>()?),
                close: v.close.parse::<f64>()?,
                volume: v.volume.as_ref().and_then(|v| v.parse::<f64>().ok()),
            });
        }

        rows.sort_by_key(|r| r.ts);
        Ok(rows)
    }

    async fn fetch_current_price(&self, symbol: &str) -> anyhow::Result<f64> {
        let resp: PriceResponse = self
            .client
            .get("https://api.twelvedata.com/price")
            .query(&[("symbol", symbol), ("apikey", &self.api_key)])
            .send()
            .await?
            .json()
            .await?;

        if resp.status.as_deref() == Some("error") {
            anyhow::bail!(
                "Twelve Data API error: {}",
                resp.message.unwrap_or_else(|| "Unknown error".to_string())
            );
        }

        resp.price
            .ok_or_else(|| anyhow::anyhow!("No price returned"))?
            .parse::<f64>()
            .map_err(|e| anyhow::anyhow!("Failed to parse price: {}", e))
    }

    async fn search_symbols(&self, query: &str) -> anyhow::Result<Vec<SymbolSearchResult>> {
        let resp: SymbolSearchResponse = self
            .client
            .get("https://api.twelvedata.com/symbol_search")
            .query(&[("symbol", query), ("outputsize", "10")])
            .send()
            .await?
            .json()
            .await?;

        let items = resp.data.unwrap_or_default();
        let results = items
            .into_iter()
            .filter(|item| item.instrument_type != "Digital Currency")
            .take(10)
            .map(|item| SymbolSearchResult {
                symbol: item.symbol,
                name: item.instrument_name,
                asset_type: map_instrument_type(&item.instrument_type).to_string(),
                provider: "TwelveData".to_string(),
                exchange: Some(item.exchange),
            })
            .collect();

        Ok(results)
    }
}

#[derive(Deserialize)]
struct SymbolSearchResponse {
    data: Option<Vec<SymbolSearchItem>>,
}

#[derive(Deserialize)]
struct SymbolSearchItem {
    symbol: String,
    instrument_name: String,
    instrument_type: String,
    exchange: String,
    country: Option<String>,
}

fn map_instrument_type(t: &str) -> &str {
    match t {
        "Common Stock" | "Equity" => "stock",
        "ETF" | "Exchange Traded Fund" => "stock",
        "Physical Currency" | "Digital Currency" => "crypto",
        "Commodity" | "Mutual Fund" => "commodity",
        _ => "stock",
    }
}

fn parse_date_to_unix(datetime: &str) -> anyhow::Result<i64> {
    let dt = chrono::NaiveDate::parse_from_str(datetime, "%Y-%m-%d")
        .map_err(|e| anyhow::anyhow!("Failed to parse date '{}': {}", datetime, e))?;
    Ok(dt
        .and_hms_opt(0, 0, 0)
        .ok_or_else(|| anyhow::anyhow!("Invalid time"))?
        .and_utc()
        .timestamp())
}
