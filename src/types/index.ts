export type AssetType = "stock" | "crypto" | "commodity";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  currency: string;
  added_at: number;
  deleted_at: number | null;
}

export interface OHLCVRow {
  id: number | null;
  asset_id: string;
  ts: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

export interface PriceCacheMeta {
  asset_id: string;
  provider: string;
  last_fetched: number;
}

export type TxType = "buy" | "sell" | "snapshot";

export interface Transaction {
  id: string;
  asset_id: string;
  tx_type: TxType;
  quantity: number;
  price_usd: number;
  ts: number;
  notes: string | null;
  created_at: number;
  deleted_at: number | null;
  locked_at: number | null;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  asset_type: string;
  provider: string;
  exchange: string | null;
}

export interface AssetHoldingSummary {
  total_bought: number;
  total_sold: number;
  total_sold_value: number;
  snapshot_quantity: number;
  net_quantity: number;
  total_cost_basis: number;
  avg_cost_per_unit: number;
}
