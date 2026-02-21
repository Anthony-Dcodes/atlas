import { invoke } from "@tauri-apps/api/core";
import type { OHLCVRow } from "@/types";

export async function fetchPrices(assetId: string): Promise<OHLCVRow[]> {
  return invoke<OHLCVRow[]>("fetch_prices", { assetId });
}

export async function refreshAsset(assetId: string): Promise<OHLCVRow[]> {
  return invoke<OHLCVRow[]>("refresh_asset", { assetId });
}
