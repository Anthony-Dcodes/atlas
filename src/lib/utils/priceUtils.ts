import type { OHLCVRow } from "@/types";
import { daysAgo } from "@/lib/utils/dateHelpers";

/**
 * Returns the percentage change over the last `daysBack` days.
 * `sortedPrices` must already be sorted ascending by `ts`.
 * Returns null if there is insufficient data.
 */
export function calcChange(sortedPrices: OHLCVRow[], daysBack: number): number | null {
  if (sortedPrices.length === 0) return null;
  const cutoff = daysAgo(daysBack);
  const recent = sortedPrices.filter((p) => p.ts >= cutoff);
  if (recent.length < 2) return null;
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  if (first.close === 0) return null;
  return ((last.close - first.close) / first.close) * 100;
}
