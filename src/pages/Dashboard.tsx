import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAssets } from "@/hooks/useAssets";
import { useAssetsStore } from "@/stores/assetsStore";
import { AddAssetDialog } from "@/components/portfolio/AddAssetDialog";
import { AssetDetail } from "@/components/portfolio/AssetDetail";
import { PortfolioChart } from "@/components/charts/PortfolioChart";
import { PortfolioHeader } from "@/components/portfolio/PortfolioHeader";
import { AllocationBar } from "@/components/portfolio/AllocationBar";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { fetchPrices } from "@/lib/tauri/prices";
import { buildColorMap } from "@/lib/utils/assetColors";
import { calcChange } from "@/lib/utils/priceUtils";
import { daysAgo } from "@/lib/utils/dateHelpers";
import type { OHLCVRow } from "@/types";

export function Dashboard() {
  const { data: assets, isLoading } = useAssets();
  const { selectedAssetId, setSelectedAssetId } = useAssetsStore();

  const selectedAsset = assets?.find((a) => a.id === selectedAssetId);

  const priceResults = useQueries({
    queries: (assets ?? []).map((asset) => ({
      queryKey: ["prices", asset.id] as const,
      queryFn: (): Promise<OHLCVRow[]> => fetchPrices(asset.id),
    })),
  });

  const derived = useMemo(() => {
    if (!assets || assets.length === 0) return null;

    const colorMap = buildColorMap(assets);
    const allPrices = new Map<string, OHLCVRow[]>();
    let totalValue = 0;
    let totalValue24hAgo = 0;

    const assetPrices = assets.map((asset, i) => {
      const data = priceResults[i]?.data ?? [];
      const sorted = [...data].sort((a, b) => a.ts - b.ts);
      const latestPrice = sorted.length > 0 ? sorted[sorted.length - 1]!.close : null;

      if (latestPrice !== null) {
        totalValue += latestPrice;
        allPrices.set(asset.id, sorted);

        const cutoff = daysAgo(1);
        const historicalRow = sorted.filter((p) => p.ts <= cutoff).pop();
        totalValue24hAgo += historicalRow ? historicalRow.close : latestPrice;
      }

      return { asset, sorted, latestPrice };
    });

    const change24hValue = totalValue - totalValue24hAgo;
    const change24hPct =
      totalValue24hAgo > 0 ? (change24hValue / totalValue24hAgo) * 100 : 0;

    const holdingRows = assetPrices.flatMap(({ asset, sorted, latestPrice }) => {
      if (latestPrice === null) return [];
      return [
        {
          asset,
          latestPrice,
          change24h: calcChange(sorted, 1),
          allocationPct: totalValue > 0 ? (latestPrice / totalValue) * 100 : 0,
          color: colorMap.get(asset.id) ?? "#71717a",
        },
      ];
    });

    const segments = [...holdingRows]
      .sort((a, b) => b.allocationPct - a.allocationPct)
      .map((row) => ({
        assetId: row.asset.id,
        symbol: row.asset.symbol,
        pct: row.allocationPct,
        color: row.color,
      }));

    return { totalValue, change24hValue, change24hPct, allPrices, holdingRows, segments };
  }, [assets, priceResults]);

  if (selectedAsset) {
    return <AssetDetail asset={selectedAsset} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-100">Portfolio Overview</h2>
        <AddAssetDialog />
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
            />
            <PortfolioChart allPrices={derived.allPrices} height={260} />
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
            <HoldingsTable rows={derived.holdingRows} onSelect={setSelectedAssetId} />
          )}
        </>
      )}
    </div>
  );
}
