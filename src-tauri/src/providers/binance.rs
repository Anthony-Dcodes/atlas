use crate::models::{DateRange, OHLCVRow, SymbolSearchResult};
use crate::providers::MarketDataProvider;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::Value;

pub struct BinanceProvider {
    client: reqwest::Client,
}

impl BinanceProvider {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .user_agent("atlas/0.1")
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }

    fn to_symbol(ticker: &str) -> String {
        let upper = ticker.to_uppercase();
        let base = upper.trim_end_matches("USDT").trim_end_matches("BUSD");
        format!("{}USDT", base)
    }
}

/// Strip any trailing partial match of "USDT" so queries like
/// "BTCU", "BTCUS", "BTCUSD", "BTCUSDT" all reduce to "BTC".
fn strip_partial_usdt(s: &str) -> &str {
    const SUFFIX: &str = "USDT";
    for len in (1..=SUFFIX.len().min(s.len())).rev() {
        if s.ends_with(&SUFFIX[..len]) {
            return &s[..s.len() - len];
        }
    }
    s
}

#[derive(Deserialize)]
struct TickerPrice {
    symbol: String,
    price: String,
}

#[async_trait]
impl MarketDataProvider for BinanceProvider {
    fn name(&self) -> &str {
        "binance"
    }

    async fn fetch_ohlcv(&self, symbol: &str, range: &DateRange) -> anyhow::Result<Vec<OHLCVRow>> {
        let binance_symbol = Self::to_symbol(symbol);

        // For first fetch (range.from == 0), start from 2017-01-01.
        // Binance BTC data begins 2017-08-17; earlier start just returns from listing date.
        let mut start_ms: i64 = if range.from == 0 {
            1_483_228_800_000 // 2017-01-01 in ms
        } else {
            range.from * 1000
        };
        let to_ms = range.to * 1000;

        let mut all_rows: Vec<OHLCVRow> = Vec::new();

        loop {
            // Klines response: [[open_time_ms, open, high, low, close, volume, close_time_ms, ...], ...]
            // All price/volume fields are JSON strings; open_time and close_time are integers.
            let candles: Vec<Vec<Value>> = self
                .client
                .get("https://api.binance.com/api/v3/klines")
                .query(&[
                    ("symbol", binance_symbol.as_str()),
                    ("interval", "1d"),
                    ("startTime", &start_ms.to_string()),
                    ("limit", "1000"),
                ])
                .send()
                .await?
                .error_for_status()?
                .json()
                .await?;

            if candles.is_empty() {
                break;
            }

            let last_open_ms = candles
                .last()
                .and_then(|c| c.first())
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            let last_close_ms = candles
                .last()
                .and_then(|c| c.get(6))
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            for candle in &candles {
                let open_ms = candle.first().and_then(|v| v.as_i64()).unwrap_or(0);
                // Skip candles past the requested range
                if open_ms > to_ms {
                    break;
                }

                let parse_str = |v: Option<&Value>| -> anyhow::Result<f64> {
                    v.and_then(|v| v.as_str())
                        .ok_or_else(|| anyhow::anyhow!("missing field"))?
                        .parse::<f64>()
                        .map_err(Into::into)
                };

                let ts_sec = open_ms / 1000;
                let ts_day = ts_sec - (ts_sec % 86400); // normalize to UTC midnight

                all_rows.push(OHLCVRow {
                    id: None,
                    asset_id: String::new(),
                    ts: ts_day,
                    open: Some(parse_str(candle.get(1))?),
                    high: Some(parse_str(candle.get(2))?),
                    low: Some(parse_str(candle.get(3))?),
                    close: parse_str(candle.get(4))?,
                    volume: parse_str(candle.get(5)).ok(),
                });
            }

            // Stop if we got a partial page (no more data) or we've passed the end of range
            if candles.len() < 1000 || last_open_ms >= to_ms {
                break;
            }

            // Advance to the next page
            start_ms = last_close_ms + 1;
        }

        all_rows.sort_by_key(|r| r.ts);
        all_rows.dedup_by_key(|r| r.ts);
        Ok(all_rows)
    }

    async fn fetch_current_price(&self, symbol: &str) -> anyhow::Result<f64> {
        let binance_symbol = Self::to_symbol(symbol);

        let ticker: TickerPrice = self
            .client
            .get("https://api.binance.com/api/v3/ticker/price")
            .query(&[("symbol", binance_symbol.as_str())])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        ticker
            .price
            .parse::<f64>()
            .map_err(|e| anyhow::anyhow!("Failed to parse price: {}", e))
    }

    async fn search_symbols(&self, query: &str) -> anyhow::Result<Vec<SymbolSearchResult>> {
        let query_upper = query.to_uppercase();
        // Strip any partial USDT suffix so "BTCU"/"BTCUS"/"BTCUSD"/"BTCUSDT" all find BTC
        let search_base = strip_partial_usdt(&query_upper);

        // Fetch all active ticker prices; filter USDT pairs whose base starts with the query
        let tickers: Vec<TickerPrice> = self
            .client
            .get("https://api.binance.com/api/v3/ticker/price")
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        let results = tickers
            .into_iter()
            .filter(|t| t.symbol.ends_with("USDT"))
            .filter_map(|t| {
                let base = t.symbol.strip_suffix("USDT")?;
                if base.starts_with(search_base) {
                    Some(SymbolSearchResult {
                        // Return full Binance ticker so users see what they typed
                        symbol: format!("{}USDT", base),
                        name: base.to_string(),
                        asset_type: "crypto".to_string(),
                        provider: "Binance".to_string(),
                        exchange: Some("Binance".to_string()),
                    })
                } else {
                    None
                }
            })
            .take(5)
            .collect();

        Ok(results)
    }
}
