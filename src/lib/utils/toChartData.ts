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

export function toLineData(rows: OHLCVRow[]): LineData<UTCTimestamp>[] {
  return [...rows]
    .sort((a, b) => a.ts - b.ts)
    .map((r) => ({
      time: r.ts as UTCTimestamp,
      value: r.close,
    }));
}
