import { useAssets } from "@/hooks/useAssets";
import { usePrices } from "@/hooks/usePrices";
import { useAssetsStore } from "@/stores/assetsStore";
import { AssetCard } from "@/components/portfolio/AssetCard";
import { AddAssetDialog } from "@/components/portfolio/AddAssetDialog";
import { AssetDetail } from "@/components/portfolio/AssetDetail";
import { PortfolioChart } from "@/components/charts/PortfolioChart";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { OHLCVRow } from "@/types";

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

      {assets && assets.length > 0 && <PortfolioSummary assetIds={assets.map((a) => a.id)} />}

      {assets && assets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <AssetCardWithPrices
              key={asset.id}
              asset={asset}
              onClick={() => setSelectedAssetId(asset.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioSummary({ assetIds }: { assetIds: string[] }) {
  const allPrices = new Map<string, OHLCVRow[]>();
  let totalValue = 0;

  for (const id of assetIds) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = usePrices(id);
    if (data && data.length > 0) {
      allPrices.set(id, data);
      const sorted = [...data].sort((a, b) => a.ts - b.ts);
      totalValue += sorted[sorted.length - 1]!.close;
    }
  }

  if (allPrices.size === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
        <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
      </div>
      <PortfolioChart allPrices={allPrices} />
    </div>
  );
}

function AssetCardWithPrices({
  asset,
  onClick,
}: {
  asset: { id: string; symbol: string; name: string; asset_type: string; currency: string; added_at: number; deleted_at: number | null };
  onClick: () => void;
}) {
  const { data: prices } = usePrices(asset.id);
  return <AssetCard asset={asset as import("@/types").Asset} prices={prices ?? []} onClick={onClick} />;
}
