import { describe, it, expect } from "vitest";
import { hasRealOHLC, toCandlestickData, toLineData } from "../toChartData";
import type { OHLCVRow } from "@/types";

const mockRows: OHLCVRow[] = [
  { id: 2, asset_id: "a1", ts: 1700086400, open: 155, high: 160, low: 150, close: 158, volume: 500 },
  { id: 1, asset_id: "a1", ts: 1700000000, open: 150, high: 155, low: 148, close: 153, volume: 1000 },
];

describe("toCandlestickData", () => {
  it("sorts by timestamp ascending", () => {
    const result = toCandlestickData(mockRows);
    expect(result[0]!.time).toBe(1700000000);
    expect(result[1]!.time).toBe(1700086400);
  });

  it("maps OHLC fields correctly", () => {
    const result = toCandlestickData(mockRows);
    expect(result[0]).toEqual({
      time: 1700000000,
      open: 150,
      high: 155,
      low: 148,
      close: 153,
    });
  });

  it("uses close as fallback for null OHLC", () => {
    const row: OHLCVRow = {
      id: 1, asset_id: "a1", ts: 1700000000,
      open: null, high: null, low: null, close: 100, volume: null,
    };
    const result = toCandlestickData([row]);
    expect(result[0]).toEqual({
      time: 1700000000,
      open: 100, high: 100, low: 100, close: 100,
    });
  });
});

describe("hasRealOHLC", () => {
  it("returns true for full OHLCV data", () => {
    expect(hasRealOHLC(mockRows)).toBe(true);
  });

  it("returns false for all-null OHLC (crypto scenario)", () => {
    const cryptoRows: OHLCVRow[] = [
      { id: 1, asset_id: "a1", ts: 1700000000, open: null, high: null, low: null, close: 100, volume: null },
      { id: 2, asset_id: "a1", ts: 1700086400, open: null, high: null, low: null, close: 105, volume: null },
    ];
    expect(hasRealOHLC(cryptoRows)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasRealOHLC([])).toBe(false);
  });
});

describe("toLineData", () => {
  it("extracts close as value", () => {
    const result = toLineData(mockRows);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ time: 1700000000, value: 153 });
    expect(result[1]).toEqual({ time: 1700086400, value: 158 });
  });
});
