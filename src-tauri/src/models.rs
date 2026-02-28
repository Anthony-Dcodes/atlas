use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AssetType {
    Stock,
    Crypto,
    Commodity,
}

impl AssetType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AssetType::Stock => "stock",
            AssetType::Crypto => "crypto",
            AssetType::Commodity => "commodity",
        }
    }

    pub fn from_str(s: &str) -> anyhow::Result<Self> {
        match s {
            "stock" => Ok(AssetType::Stock),
            "crypto" => Ok(AssetType::Crypto),
            "commodity" => Ok(AssetType::Commodity),
            _ => anyhow::bail!("Invalid asset type: {}", s),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub asset_type: AssetType,
    pub currency: String,
    pub added_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OHLCVRow {
    pub id: Option<i64>,
    pub asset_id: String,
    pub ts: i64,
    pub open: Option<f64>,
    pub high: Option<f64>,
    pub low: Option<f64>,
    pub close: f64,
    pub volume: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceCacheMeta {
    pub asset_id: String,
    pub provider: String,
    pub last_fetched: i64,
}

#[derive(Debug, Clone)]
pub struct DateRange {
    pub from: i64,
    pub to: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TxType {
    Buy,
    Sell,
}

impl TxType {
    pub fn as_str(&self) -> &'static str {
        match self {
            TxType::Buy => "buy",
            TxType::Sell => "sell",
        }
    }

    pub fn from_str(s: &str) -> anyhow::Result<Self> {
        match s {
            "buy" => Ok(TxType::Buy),
            "sell" => Ok(TxType::Sell),
            _ => anyhow::bail!("Invalid transaction type: {}", s),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub asset_id: String,
    pub tx_type: TxType,
    pub quantity: f64,
    pub price_usd: f64,
    pub ts: i64,
    pub notes: Option<String>,
    pub created_at: i64,
    pub deleted_at: Option<i64>,
    pub locked_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolSearchResult {
    pub symbol: String,
    pub name: String,
    pub asset_type: String,
    pub provider: String,
    pub exchange: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetHoldingSummary {
    pub total_bought: f64,
    pub total_sold: f64,
    pub net_quantity: f64,
    pub total_cost_basis: f64,
    pub avg_cost_per_unit: f64,
}
