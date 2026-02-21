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
