import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAssets } from "@/hooks/useAssets";
import { getHoldingSummary } from "@/lib/tauri/transactions";
import { formatCurrency, formatPercent } from "@/lib/utils/formatCurrency";
import type { AssetHoldingSummary, Asset } from "@/types";

interface RealizedRow {
  asset: Asset;
  soldQty: number;
  avgSellPrice: number;
  costOfSold: number;
  proceeds: number;
  realizedPnL: number;
  realizedPct: number;
}

export function RealizedPnLPage() {
  const { data: assets, isLoading: assetsLoading } = useAssets();

  const summaryResults = useQueries({
    queries: (assets ?? []).map((asset) => ({
      queryKey: ["holdingSummary", asset.id] as const,
      queryFn: (): Promise<AssetHoldingSummary> => getHoldingSummary(asset.id),
    })),
  });

  const { rows, totalRealizedPnL } = useMemo(() => {
    if (!assets) return { rows: [], totalRealizedPnL: 0 };

    const computed: RealizedRow[] = [];

    assets.forEach((asset, i) => {
      const summary = summaryResults[i]?.data;
      if (!summary) return;
      // Only show assets where sells and buys both exist
      if (summary.total_sold <= 0 || summary.total_bought <= 0) return;

      const costOfSold = summary.total_sold * summary.avg_cost_per_unit;
      const realizedPnL = summary.total_sold_value - costOfSold;
      const realizedPct = costOfSold > 0 ? (realizedPnL / costOfSold) * 100 : 0;
      const avgSellPrice = summary.total_sold_value / summary.total_sold;

      computed.push({
        asset,
        soldQty: summary.total_sold,
        avgSellPrice,
        costOfSold,
        proceeds: summary.total_sold_value,
        realizedPnL,
        realizedPct,
      });
    });

    computed.sort((a, b) => b.realizedPnL - a.realizedPnL);
    const totalRealizedPnL = computed.reduce((sum, r) => sum + r.realizedPnL, 0);

    return { rows: computed, totalRealizedPnL };
  }, [assets, summaryResults]);

  const isLoading = assetsLoading || summaryResults.some((r) => r.isLoading);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-100">Realized P&L</h2>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-muted-foreground">No realized gains yet</p>
          <p className="text-sm text-muted-foreground">
            Sell some assets to track your locked-in profits here.
          </p>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Total Realized P&L
            </p>
            <p className={`mt-1 text-3xl font-bold tracking-tight ${totalRealizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalRealizedPnL >= 0 ? "+" : ""}{formatCurrency(totalRealizedPnL)}
            </p>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Sold Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Avg Sell Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Cost of Sold
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Proceeds
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Realized P&L
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.asset.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">{row.asset.symbol}</div>
                      <div className="text-xs text-zinc-500">{row.asset.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {row.soldQty.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {formatCurrency(row.avgSellPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                      {formatCurrency(row.costOfSold)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {formatCurrency(row.proceeds)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className={`font-medium ${row.realizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {row.realizedPnL >= 0 ? "+" : ""}{formatCurrency(row.realizedPnL)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {row.realizedPct >= 0 ? "+" : ""}{formatPercent(row.realizedPct)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-zinc-600">
            Realized P&L uses average cost basis — all buy transactions averaged together.
          </p>
        </>
      )}
    </div>
  );
}
