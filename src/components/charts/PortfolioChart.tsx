import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, ColorType, AreaSeries } from "lightweight-charts";
import type { OHLCVRow } from "@/types";
import { Button } from "@/components/ui/button";
import { daysAgo } from "@/lib/utils/dateHelpers";
import type { UTCTimestamp, AreaData } from "lightweight-charts";

interface Props {
  allPrices: Map<string, OHLCVRow[]>;
  height?: number;
}

type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";

const ranges: { label: string; value: TimeRange }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1Y", value: "1y" },
  { label: "All", value: "all" },
];

function getRangeStart(range: TimeRange): number {
  switch (range) {
    case "7d": return daysAgo(7);
    case "30d": return daysAgo(30);
    case "90d": return daysAgo(90);
    case "1y": return daysAgo(365);
    case "all": return 0;
  }
}

export function PortfolioChart({ allPrices, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

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

    // Aggregate all prices by timestamp (sum close prices)
    const rangeStart = getRangeStart(timeRange);
    const priceMap = new Map<number, number>();

    for (const rows of allPrices.values()) {
      for (const row of rows) {
        if (row.ts >= rangeStart) {
          priceMap.set(row.ts, (priceMap.get(row.ts) ?? 0) + row.close);
        }
      }
    }

    const chartData: AreaData<UTCTimestamp>[] = Array.from(priceMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, value]) => ({
        time: ts as UTCTimestamp,
        value,
      }));

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
  }, [allPrices, height, timeRange]);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        {ranges.map((r) => (
          <Button
            key={r.value}
            variant={timeRange === r.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeRange(r.value)}
          >
            {r.label}
          </Button>
        ))}
      </div>
      <div ref={containerRef} />
    </div>
  );
}
