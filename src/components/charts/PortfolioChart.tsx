import { useEffect, useRef } from "react";
import { createChart, type IChartApi, ColorType, AreaSeries } from "lightweight-charts";
import type { OHLCVRow, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { daysAgo } from "@/lib/utils/dateHelpers";
import type { UTCTimestamp, AreaData } from "lightweight-charts";

export type TimeRange = "7d" | "30d" | "90d" | "1y" | "5y" | "all";

interface Props {
  allPrices: Map<string, OHLCVRow[]>;
  transactions: Map<string, Transaction[]>;
  height?: number;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

function getQtyAtTime(txs: Transaction[], ts: number): number {
  return txs.reduce((qty, tx) => {
    if (tx.ts <= ts) {
      return tx.tx_type === "buy" ? qty + tx.quantity : qty - tx.quantity;
    }
    return qty;
  }, 0);
}

const ranges: { label: string; value: TimeRange }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
  { label: "All", value: "all" },
];

function getRangeStart(range: TimeRange): number {
  switch (range) {
    case "7d": return daysAgo(7);
    case "30d": return daysAgo(30);
    case "90d": return daysAgo(90);
    case "1y": return daysAgo(365);
    case "5y": return daysAgo(365 * 5);
    case "all": return 0;
  }
}

export function PortfolioChart({ allPrices, transactions, height = 300, timeRange, onTimeRangeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#111113" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "#1e1e22" },
        horzLines: { color: "#1e1e22" },
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: false,
      },
      rightPriceScale: {
        borderColor: "#27272a",
      },
    });

    chartRef.current = chart;

    // Aggregate portfolio value with forward-fill for missing days (e.g. weekends)
    const rangeStart = getRangeStart(timeRange);

    // Collect per-asset sorted price arrays for assets with transactions
    const assetArrays: { txs: Transaction[]; prices: OHLCVRow[] }[] = [];
    const allTimestamps = new Set<number>();

    for (const [assetId, rows] of allPrices.entries()) {
      const txs = transactions.get(assetId);
      if (!txs || txs.length === 0) continue;
      const filtered = rows.filter((r) => r.ts >= rangeStart).sort((a, b) => a.ts - b.ts);
      if (filtered.length === 0) continue;
      assetArrays.push({ txs, prices: filtered });
      for (const r of filtered) allTimestamps.add(r.ts);
    }

    // Binary search: find last price with ts <= target
    function getLastKnownClose(prices: OHLCVRow[], target: number): number | null {
      let lo = 0;
      let hi = prices.length - 1;
      let result: number | null = null;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (prices[mid]!.ts <= target) {
          result = prices[mid]!.close;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return result;
    }

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    const chartData: AreaData<UTCTimestamp>[] = sortedTimestamps.flatMap((ts) => {
      let total = 0;
      let hasPriceData = false;
      for (const { txs, prices } of assetArrays) {
        const qty = getQtyAtTime(txs, ts);
        const close = getLastKnownClose(prices, ts);
        if (close !== null) {
          total += qty * close;
          hasPriceData = true;
        }
      }
      return hasPriceData ? [{ time: ts as UTCTimestamp, value: total }] : [];
    });

    if (chartData.length > 0) {
      const series = chart.addSeries(AreaSeries, {
        lineColor: "#3b82f6",
        topColor: "rgba(59, 130, 246, 0.3)",
        bottomColor: "rgba(59, 130, 246, 0.02)",
        lineWidth: 2,
      });
      series.setData(chartData);
    }

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [allPrices, transactions, height, timeRange]);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        {ranges.map((r) => (
          <Button
            key={r.value}
            variant={timeRange === r.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onTimeRangeChange(r.value)}
          >
            {r.label}
          </Button>
        ))}
      </div>
      <div ref={containerRef} />
    </div>
  );
}
