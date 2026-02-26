import type { Asset } from "@/types";

const stockColors = ["#3b82f6", "#60a5fa", "#93c5fd", "#2563eb", "#1d4ed8"];
const cryptoColors = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#7c3aed", "#6d28d9"];
const commodityColors = ["#f59e0b", "#fbbf24", "#fcd34d", "#d97706", "#b45309"];

export function buildColorMap(assets: Asset[]): Map<string, string> {
  const map = new Map<string, string>();
  const byType = new Map<string, Asset[]>();

  for (const asset of assets) {
    const list = byType.get(asset.asset_type) ?? [];
    list.push(asset);
    byType.set(asset.asset_type, list);
  }

  for (const [type, typeAssets] of byType) {
    const palette =
      type === "stock" ? stockColors : type === "crypto" ? cryptoColors : commodityColors;
    const sorted = [...typeAssets].sort((a, b) => a.added_at - b.added_at);
    sorted.forEach((asset, i) => {
      map.set(asset.id, palette[i % palette.length]!);
    });
  }

  return map;
}
