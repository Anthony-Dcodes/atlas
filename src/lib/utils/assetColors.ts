import type { Asset } from "@/types";

const PALETTE = [
  "#3b82f6", // Cornflower Blue
  "#a855f7", // Amethyst
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#fb923c", // Orange
  "#8b5cf6", // Violet
  "#84cc16", // Lime
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Burnt Orange
];

export function buildColorMap(assets: Asset[]): Map<string, string> {
  const map = new Map<string, string>();
  const sorted = [...assets].sort((a, b) => a.added_at - b.added_at);
  sorted.forEach((asset, i) => {
    map.set(asset.id, PALETTE[i % PALETTE.length]!);
  });
  return map;
}
