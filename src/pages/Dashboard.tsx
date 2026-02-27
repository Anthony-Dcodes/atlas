import { useMemo, useState, useCallback } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAssets } from "@/hooks/useAssets";
import { useAssetsStore } from "@/stores/assetsStore";
import { AddAssetDialog } from "@/components/portfolio/AddAssetDialog";
import { AddTransactionDialog } from "@/components/portfolio/AddTransactionDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AssetDetail } from "@/components/portfolio/AssetDetail";
import { PortfolioChart } from "@/components/charts/PortfolioChart";
import { PortfolioHeader } from "@/components/portfolio/PortfolioHeader";
import { AllocationBar } from "@/components/portfolio/AllocationBar";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { fetchPrices } from "@/lib/tauri/prices";
import { getHoldingSummary } from "@/lib/tauri/transactions";
import { buildColorMap } from "@/lib/utils/assetColors";
import { calcChange } from "@/lib/utils/priceUtils";
import { daysAgo } from "@/lib/utils/dateHelpers";
import type { OHLCVRow, AssetHoldingSummary } from "@/types";

export function Dashboard() {
  const { data: assets, isLoading } = useAssets();
  const { selectedAssetId, setSelectedAssetId, portfolioTimeRange, setPortfolioTimeRange } = useAssetsStore();

  const selectedAsset = assets?.find((a) => a.id === selectedAssetId);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txAssetId, setTxAssetId] = useState<string | undefined>(undefined);

  const handleAddTransaction = useCallback((assetId?: string) => {
    setTxAssetId(assetId);
    setTxDialogOpen(true);
  }, []);

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

  const derived = useMemo(() => {
    if (!assets || assets.length === 0) return null;

    const colorMap = buildColorMap(assets);
    const allPrices = new Map<string, OHLCVRow[]>();
    let totalValue = 0;
    let totalValue24hAgo = 0;
    let totalCostBasis = 0;
    let totalUnrealizedPnL = 0;

    const assetPrices = assets.map((asset, i) => {
      const data = priceResults[i]?.data ?? [];
      const sorted = [...data].sort((a, b) => a.ts - b.ts);
      const latestPrice = sorted.length > 0 ? sorted[sorted.length - 1]!.close : null;
      const holding: AssetHoldingSummary | null = holdingResults[i]?.data ?? null;
      const isHeld = holding !== null && holding.total_bought > 0;

      if (latestPrice !== null) {
        allPrices.set(asset.id, sorted);
      }

      if (isHeld && latestPrice !== null) {
        const assetValue = holding.net_quantity * latestPrice;
        totalValue += assetValue;

        const cutoff = daysAgo(1);
        const historicalRow = sorted.filter((p) => p.ts <= cutoff).pop();
        const price24hAgo = historicalRow ? historicalRow.close : latestPrice;
        totalValue24hAgo += holding.net_quantity * price24hAgo;

        const currentValue = holding.net_quantity * latestPrice;
        const pnl = currentValue - holding.total_cost_basis + (holding.total_sold * holding.avg_cost_per_unit);
        totalCostBasis += holding.total_cost_basis;
        totalUnrealizedPnL += pnl;
      }

      return { asset, sorted, latestPrice, holding, isHeld };
    });

    const change24hValue = totalValue - totalValue24hAgo;
    const change24hPct =
      totalValue24hAgo > 0 ? (change24hValue / totalValue24hAgo) * 100 : 0;
    const totalPnLPct =
      totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;

    const holdingRows = assetPrices.map(({ asset, sorted, latestPrice, holding, isHeld }, i) => {
      let netQty = 0;
      let assetValue: number | null = null;
      let unrealizedPnL: number | null = null;
      let pnlPct: number | null = null;

      if (isHeld && holding && latestPrice !== null) {
        netQty = holding.net_quantity;
        assetValue = holding.net_quantity * latestPrice;
        unrealizedPnL = assetValue - holding.total_cost_basis + (holding.total_sold * holding.avg_cost_per_unit);
        pnlPct = holding.total_cost_basis > 0
          ? (unrealizedPnL / holding.total_cost_basis) * 100
          : 0;
      } else if (isHeld && holding) {
        netQty = holding.net_quantity;
      }

      const priceQuery = priceResults[i];
      const priceLoading = priceQuery?.isLoading ?? false;
      const priceError = priceQuery?.isError ?? false;

      return {
        asset,
        latestPrice,
        change24h: sorted.length > 0 ? calcChange(sorted, 1) : null,
        allocationPct: isHeld && totalValue > 0 ? ((assetValue ?? 0) / totalValue) * 100 : 0,
        color: colorMap.get(asset.id) ?? "#71717a",
        isHeld,
        netQty,
        assetValue,
        unrealizedPnL,
        pnlPct,
        priceLoading,
        priceError,
      };
    });

    // Sort: held assets first (by value DESC), then tracked (by name)
    holdingRows.sort((a, b) => {
      if (a.isHeld && !b.isHeld) return -1;
      if (!a.isHeld && b.isHeld) return 1;
      if (a.isHeld && b.isHeld) return (b.assetValue ?? 0) - (a.assetValue ?? 0);
      return a.asset.name.localeCompare(b.asset.name);
    });

    const segments = holdingRows
      .filter((row) => row.isHeld)
      .sort((a, b) => b.allocationPct - a.allocationPct)
      .map((row) => ({
        assetId: row.asset.id,
        symbol: row.asset.symbol,
        pct: row.allocationPct,
        color: row.color,
      }));

    const holdings = new Map<string, number>();
    for (const ap of assetPrices) {
      if (ap.isHeld && ap.holding) {
        holdings.set(ap.asset.id, ap.holding.net_quantity);
      }
    }

    return {
      totalValue, change24hValue, change24hPct,
      totalUnrealizedPnL, totalPnLPct,
      allPrices, holdings, holdingRows, segments,
    };
  }, [assets, priceResults, holdingResults]);

  if (selectedAsset) {
    return <AssetDetail asset={selectedAsset} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-100">Portfolio Overview</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleAddTransaction()}>
            <Plus className="mr-1 h-4 w-4" />
            Add Transaction
          </Button>
          <AddAssetDialog />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading assets...</p>}

      {!isLoading && assets && assets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-muted-foreground">No assets yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first asset to start tracking your portfolio.
          </p>
        </div>
      )}

      {derived && (
        <>
          {/* Section A: Portfolio value + chart */}
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <PortfolioHeader
              totalValue={derived.totalValue}
              change24hValue={derived.change24hValue}
              change24hPct={derived.change24hPct}
              totalUnrealizedPnL={derived.totalUnrealizedPnL}
              totalPnLPct={derived.totalPnLPct}
            />
            <PortfolioChart allPrices={derived.allPrices} holdings={derived.holdings} height={260} timeRange={portfolioTimeRange} onTimeRangeChange={setPortfolioTimeRange} />
          </div>

          {/* Section B: Allocation bar */}
          {derived.segments.length > 0 && (
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Allocation
              </p>
              <AllocationBar segments={derived.segments} />
            </div>
          )}

          {/* Section C: Holdings table */}
          {derived.holdingRows.length > 0 && (
            <HoldingsTable rows={derived.holdingRows} onSelect={setSelectedAssetId} onAddTransaction={handleAddTransaction} />
          )}
        </>
      )}

      <AddTransactionDialog
        key={txAssetId ?? "no-asset"}
        assetId={txAssetId}
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
      />
    </div>
  );
}
