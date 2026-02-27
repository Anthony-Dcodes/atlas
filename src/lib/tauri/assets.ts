import { invoke } from "@tauri-apps/api/core";
import type { Asset, AssetType } from "@/types";

export async function listAssets(): Promise<Asset[]> {
  return invoke<Asset[]>("list_assets");
}

export async function addAsset(
  symbol: string,
  name: string,
  assetType: AssetType,
): Promise<Asset> {
  return invoke<Asset>("add_asset", {
    symbol,
    name,
    assetType: assetType,
  });
}

export async function removeAsset(id: string): Promise<void> {
  return invoke<void>("remove_asset", { id });
}

export async function listAllAssets(): Promise<Asset[]> {
  return invoke<Asset[]>("list_all_assets");
}

export async function purgeAsset(id: string): Promise<void> {
  return invoke<void>("purge_asset", { id });
}
