import { useEffect, useRef, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { createChart, ColorType, AreaSeries } from "lightweight-charts";
import type { UTCTimestamp, AreaData } from "lightweight-charts";
import { useAssets } from "@/hooks/useAssets";
import { useAssetsStore } from "@/stores/assetsStore";
import { fetchPrices } from "@/lib/tauri/prices";
import { getHoldingSummary, listTransactions } from "@/lib/tauri/transactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate, daysAgo } from "@/lib/utils/dateHelpers";
import { buildColorMap } from "@/lib/utils/assetColors";
import { Button } from "@/components/ui/button";
import type { OHLCVRow, AssetHoldingSummary, Transaction } from "@/types";
import type { TimeRange } from "@/components/charts/PortfolioChart";

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

function getQtyAtTime(txs: Transaction[], ts: number): number {
  return txs.reduce((qty, tx) => {
    if (tx.ts <= ts) {
      return tx.tx_type === "buy" ? qty + tx.quantity : qty - tx.quantity;
    }
    return qty;
  }, 0);
}

function getCapitalAtTime(txs: Transaction[], ts: number): number {
  return txs.reduce((capital, tx) => {
    if (tx.ts <= ts) {
      const flow = tx.quantity * tx.price_usd;
      return tx.tx_type === "buy" ? capital + flow : capital - flow;
    }
    return capital;
  }, 0);
}

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

interface ReturnChartProps {
  chartData: AreaData<UTCTimestamp>[];
  isPositive: boolean;
  timeRange: TimeRange;
  onTimeRangeChange: (r: TimeRange) => void;
}

function ReturnChart({ chartData, isPositive, timeRange, onTimeRangeChange }: ReturnChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const lineColor = isPositive ? "#10b981" : "#f43f5e";
    const topColor = isPositive ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)";
    const bottomColor = isPositive ? "rgba(16,185,129,0.02)" : "rgba(244,63,94,0.02)";

    const chart = createChart(containerRef.current, {
      height: 240,
      layout: {
        background: { type: ColorType.Solid, color: "#111113" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "#1e1e22" },
        horzLines: { color: "#1e1e22" },
      },
      timeScale: { borderColor: "#27272a", timeVisible: false },
      rightPriceScale: { borderColor: "#27272a" },
    });

    const rangeStart = getRangeStart(timeRange);
    const displayData = rangeStart > 0
      ? chartData.filter((d) => (d.time as number) >= rangeStart)
      : chartData;

    if (displayData.length > 0) {
      const series = chart.addSeries(AreaSeries, {
        lineColor,
        topColor,
        bottomColor,
        lineWidth: 2,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
      series.setData(displayData);
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
    };
  }, [chartData, isPositive, timeRange]);

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

export function PerformancePage() {
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { performanceTimeRange, setPerformanceTimeRange } = useAssetsStore();

  const priceResults = useQueries({
    queries: (assets ?? []).map((asset) => ({
      queryKey: ["prices", asset.id] as const,
      queryFn: (): Promise<OHLCVRow[]> => fetchPrices(asset.id),
    })),
  });

  const holdingResults = useQueries({
    queries: (assets ?? []).map((asset) => ({
      queryKey: ["holdingSummary", asset.id] as const,
      queryFn: (): Promise<AssetHoldingSummary> => getHoldingSummary(asset.id),
    })),
  });

  const transactionResults = useQueries({
    queries: (assets ?? []).map((asset) => ({
      queryKey: ["transactions", asset.id] as const,
      queryFn: (): Promise<Transaction[]> => listTransactions(asset.id),
    })),
  });

  const derived = useMemo(() => {
    if (!assets || assets.length === 0) return null;

    const colorMap = buildColorMap(assets);

    const allTxsByAsset = new Map<string, Transaction[]>();
    const allPricesByAsset = new Map<string, OHLCVRow[]>();
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let firstTxTs: number | null = null;

    assets.forEach((asset, i) => {
      const txs = transactionResults[i]?.data ?? [];
      const prices = (priceResults[i]?.data ?? []).sort((a, b) => a.ts - b.ts);

      if (txs.length > 0) {
        allTxsByAsset.set(asset.id, txs);
        for (const tx of txs) {
          const flow = tx.quantity * tx.price_usd;
          if (tx.tx_type === "buy") totalDeposited += flow;
          else totalWithdrawn += flow;
          if (firstTxTs === null || tx.ts < firstTxTs) firstTxTs = tx.ts;
        }
      }

      if (prices.length > 0) {
        allPricesByAsset.set(asset.id, prices);
      }
    });

    const netCapital = totalDeposited - totalWithdrawn;

    // Current portfolio value
    let currentValue = 0;
    assets.forEach((asset, i) => {
      const holding = holdingResults[i]?.data;
      const prices = allPricesByAsset.get(asset.id);
      if (!holding || !prices || prices.length === 0) return;
      currentValue += holding.net_quantity * prices[prices.length - 1]!.close;
    });

    const totalGain = currentValue - netCapital;
    const totalReturnPct = netCapital > 0 ? (totalGain / netCapital) * 100 : 0;
    const isPositive = totalReturnPct >= 0;

    // Per-asset return rows (long/mixed positions only — shorts excluded)
    const assetRows = assets.flatMap((asset, i) => {
      const holding = holdingResults[i]?.data;
      const prices = allPricesByAsset.get(asset.id);
      if (!holding || holding.total_bought === 0) return [];
      if (!prices || prices.length === 0) return [];
      if (holding.avg_cost_per_unit <= 0) return [];

      const latestPrice = prices[prices.length - 1]!.close;
      const returnPct = (latestPrice - holding.avg_cost_per_unit) / holding.avg_cost_per_unit * 100;
      const gainLoss = (latestPrice - holding.avg_cost_per_unit) * holding.net_quantity;

      return [{ asset, returnPct, gainLoss, color: colorMap.get(asset.id) ?? "#71717a" }];
    }).sort((a, b) => b.returnPct - a.returnPct);

    // Return% time series — full history, filtered in chart by time range
    const allTimestamps = new Set<number>();
    for (const prices of allPricesByAsset.values()) {
      for (const row of prices) allTimestamps.add(row.ts);
    }

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const returnChartData: AreaData<UTCTimestamp>[] = sortedTimestamps.flatMap((ts) => {
      let capitalAtTs = 0;
      for (const txs of allTxsByAsset.values()) {
        capitalAtTs += getCapitalAtTime(txs, ts);
      }
      if (capitalAtTs <= 0) return [];

      let valueAtTs = 0;
      let hasPriceData = false;
      for (const [assetId, txs] of allTxsByAsset.entries()) {
        const prices = allPricesByAsset.get(assetId);
        if (!prices) continue;
        const qty = getQtyAtTime(txs, ts);
        const close = getLastKnownClose(prices, ts);
        if (close !== null) {
          valueAtTs += qty * close;
          hasPriceData = true;
        }
      }
      if (!hasPriceData) return [];

      return [{ time: ts as UTCTimestamp, value: (valueAtTs / capitalAtTs - 1) * 100 }];
    });

    return {
      netCapital,
      currentValue,
      totalGain,
      totalReturnPct,
      isPositive,
      firstTxTs,
      assetRows,
      returnChartData,
    };
  }, [assets, priceResults, holdingResults, transactionResults]);

  const isLoading =
    assetsLoading ||
    priceResults.some((r) => r.isLoading) ||
    holdingResults.some((r) => r.isLoading) ||
    transactionResults.some((r) => r.isLoading);

  const hasData = derived !== null && derived.returnChartData.length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-100">Performance</h2>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {!isLoading && !hasData && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-muted-foreground">No performance data yet</p>
          <p className="text-sm text-muted-foreground">
            Add transactions and fetch price data to see your return history.
          </p>
        </div>
      )}

      {!isLoading && hasData && derived && (
        <>
          {/* Section A: Hero return + chart */}
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Your Return
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <span
                  className={`text-4xl font-bold tracking-tight ${
                    derived.isPositive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {derived.totalReturnPct >= 0 ? "+" : ""}
                  {derived.totalReturnPct.toFixed(2)}%
                </span>
                <span
                  className={`text-lg font-semibold ${
                    derived.isPositive ? "text-emerald-400/70" : "text-red-400/70"
                  }`}
                >
                  {derived.totalGain >= 0 ? "+" : ""}
                  {formatCurrency(derived.totalGain)}
                </span>
              </div>
              {derived.firstTxTs !== null && (
                <p className="mt-1 text-sm text-zinc-500">
                  Since {formatDate(derived.firstTxTs)}
                </p>
              )}
            </div>
            <ReturnChart
              chartData={derived.returnChartData}
              isPositive={derived.isPositive}
              timeRange={performanceTimeRange}
              onTimeRangeChange={setPerformanceTimeRange}
            />
          </div>

          {/* Section B: Per-asset returns */}
          {derived.assetRows.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
              <div className="border-b border-zinc-800 px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  By Asset
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Asset
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Return
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Gain / Loss
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {derived.assetRows.map((row) => (
                    <tr
                      key={row.asset.id}
                      className="border-b border-zinc-800/50 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            style={{ backgroundColor: row.color }}
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                          />
                          <div>
                            <div className="font-semibold text-zinc-100">{row.asset.symbol}</div>
                            <div className="text-xs text-zinc-500">{row.asset.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={`font-semibold ${
                            row.returnPct >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {row.returnPct >= 0 ? "+" : ""}
                          {row.returnPct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={row.gainLoss >= 0 ? "text-emerald-400" : "text-red-400"}
                        >
                          {row.gainLoss >= 0 ? "+" : ""}
                          {formatCurrency(row.gainLoss)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section C: Contribution breakdown */}
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Where growth came from
            </p>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="text-zinc-400">Capital deposited</span>
                  <span className="tabular-nums text-zinc-300">
                    {formatCurrency(derived.netCapital)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{
                      width: `${
                        derived.currentValue > 0
                          ? Math.min(100, Math.max(0, (derived.netCapital / derived.currentValue) * 100))
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="text-zinc-400">Market gains</span>
                  <span
                    className={`tabular-nums ${
                      derived.totalGain >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {derived.totalGain >= 0 ? "+" : ""}
                    {formatCurrency(derived.totalGain)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  {derived.totalGain !== 0 && (
                    <div
                      className={`h-2 rounded-full ${
                        derived.totalGain >= 0 ? "bg-emerald-500" : "bg-red-500"
                      }`}
                      style={{
                        width: `${
                          derived.currentValue > 0
                            ? Math.min(100, Math.abs(derived.totalGain / derived.currentValue) * 100)
                            : Math.min(100, Math.abs(derived.totalGain / derived.netCapital) * 100)
                        }%`,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
