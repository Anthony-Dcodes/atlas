pub mod coingecko;
pub mod twelve_data;

use crate::models::{DateRange, OHLCVRow};
use async_trait::async_trait;

#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    fn name(&self) -> &str;
    async fn fetch_ohlcv(&self, symbol: &str, range: &DateRange) -> anyhow::Result<Vec<OHLCVRow>>;
    async fn fetch_current_price(&self, symbol: &str) -> anyhow::Result<f64>;
}
