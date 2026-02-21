import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, ColorType, CandlestickSeries, LineSeries } from "lightweight-charts";
import { toCandlestickData, toLineData } from "@/lib/utils/toChartData";
import type { OHLCVRow } from "@/types";
import { Button } from "@/components/ui/button";

interface Props {
  data: OHLCVRow[];
  height?: number;
}

type ChartType = "candlestick" | "line";

export function AssetChart({ data, height = 400 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartType, setChartType] = useState<ChartType>("candlestick");

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

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
      crosshair: {
        vertLine: { color: "#3b82f6", width: 1, labelBackgroundColor: "#3b82f6" },
        horzLine: { color: "#3b82f6", width: 1, labelBackgroundColor: "#3b82f6" },
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

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      series.setData(toCandlestickData(data));
    } else {
      const series = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
      });
      series.setData(toLineData(data));
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
  }, [data, height, chartType]);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        <Button
          variant={chartType === "candlestick" ? "default" : "ghost"}
          size="sm"
          onClick={() => setChartType("candlestick")}
        >
          Candlestick
        </Button>
        <Button
          variant={chartType === "line" ? "default" : "ghost"}
          size="sm"
          onClick={() => setChartType("line")}
        >
          Line
        </Button>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
