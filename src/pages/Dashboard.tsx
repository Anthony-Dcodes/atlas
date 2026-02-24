import { useAssets } from "@/hooks/useAssets";
import { usePrices } from "@/hooks/usePrices";
import { useAssetsStore } from "@/stores/assetsStore";
import { AssetCard } from "@/components/portfolio/AssetCard";
import { AddAssetDialog } from "@/components/portfolio/AddAssetDialog";
import { AssetDetail } from "@/components/portfolio/AssetDetail";
import { PortfolioChart } from "@/components/charts/PortfolioChart";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { Asset, OHLCVRow } from "@/types";
import { useState, useEffect, useCallback } from "react";

export function Dashboard() {
  const { data: assets, isLoading } = useAssets();
  const { selectedAssetId, setSelectedAssetId } = useAssetsStore();

  const selectedAsset = assets?.find((a) => a.id === selectedAssetId);

  if (selectedAsset) {
    return <AssetDetail asset={selectedAsset} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Portfolio Overview</h3>
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

      {assets && assets.length > 0 && (
        <AssetListWithPrices
          assets={assets}
          onSelectAsset={setSelectedAssetId}
        />
      )}
    </div>
  );
}

/**
 * Renders the portfolio summary chart and asset cards.
 * Each asset gets its own component so hooks are called at a fixed position.
 * Price data is aggregated via state callbacks rather than hooks-in-loops.
 */
function AssetListWithPrices({
  assets,
  onSelectAsset,
}: {
  assets: Asset[];
  onSelectAsset: (id: string) => void;
}) {
  const [priceMap, setPriceMap] = useState<Map<string, OHLCVRow[]>>(new Map());

  const handlePricesLoaded = useCallback((assetId: string, prices: OHLCVRow[]) => {
    setPriceMap((prev) => {
      const next = new Map(prev);
      next.set(assetId, prices);
      return next;
    });
  }, []);

  // Clean up removed assets from the price map
  useEffect(() => {
    const assetIds = new Set(assets.map((a) => a.id));
    setPriceMap((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const key of next.keys()) {
        if (!assetIds.has(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [assets]);

  let totalValue = 0;
  for (const rows of priceMap.values()) {
    if (rows.length > 0) {
      const sorted = [...rows].sort((a, b) => a.ts - b.ts);
      totalValue += sorted[sorted.length - 1]!.close;
    }
  }

  return (
    <>
      {priceMap.size > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
            <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
          </div>
          <PortfolioChart allPrices={priceMap} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <AssetCardWithPrices
            key={asset.id}
            asset={asset}
            onClick={() => onSelectAsset(asset.id)}
            onPricesLoaded={handlePricesLoaded}
          />
        ))}
      </div>
    </>
  );
}

function AssetCardWithPrices({
  asset,
  onClick,
  onPricesLoaded,
}: {
  asset: Asset;
  onClick: () => void;
  onPricesLoaded: (assetId: string, prices: OHLCVRow[]) => void;
}) {
  const { data: prices } = usePrices(asset.id);

  useEffect(() => {
    if (prices && prices.length > 0) {
      onPricesLoaded(asset.id, prices);
    }
  }, [asset.id, prices, onPricesLoaded]);

  return <AssetCard asset={asset} prices={prices ?? []} onClick={onClick} />;
}
