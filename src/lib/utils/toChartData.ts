import type { CandlestickData, LineData, UTCTimestamp } from "lightweight-charts";
import type { OHLCVRow } from "@/types";

export function toCandlestickData(rows: OHLCVRow[]): CandlestickData<UTCTimestamp>[] {
  return [...rows]
    .sort((a, b) => a.ts - b.ts)
    .map((r) => ({
      time: r.ts as UTCTimestamp,
      open: r.open ?? r.close,
      high: r.high ?? r.close,
      low: r.low ?? r.close,
      close: r.close,
    }));
}

export function hasRealOHLC(rows: OHLCVRow[]): boolean {
  if (rows.length === 0) return false;
  const withOHLC = rows.filter(
    (r) => r.open !== null && r.high !== null && r.low !== null,
  );
  return withOHLC.length / rows.length >= 0.1;
}

export function toLineData(rows: OHLCVRow[]): LineData<UTCTimestamp>[] {
  return [...rows]
    .sort((a, b) => a.ts - b.ts)
    .map((r) => ({
      time: r.ts as UTCTimestamp,
      value: r.close,
    }));
}
