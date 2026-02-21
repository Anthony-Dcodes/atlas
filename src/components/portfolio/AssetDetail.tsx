import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetChart } from "@/components/charts/AssetChart";
import { usePrices, useRefreshAsset } from "@/hooks/usePrices";
import { useRemoveAsset } from "@/hooks/useAssets";
import { useAssetsStore } from "@/stores/assetsStore";
import { formatCurrency, formatPercent } from "@/lib/utils/formatCurrency";
import { formatDateTime, daysAgo } from "@/lib/utils/dateHelpers";
import type { Asset } from "@/types";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  asset: Asset;
}

export function AssetDetail({ asset }: Props) {
  const { data: prices, isLoading } = usePrices(asset.id);
  const refreshAsset = useRefreshAsset();
  const removeAsset = useRemoveAsset();
  const setSelectedAssetId = useAssetsStore((s) => s.setSelectedAssetId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sortedPrices = [...(prices ?? [])].sort((a, b) => a.ts - b.ts);
  const latestPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1]! : null;

  function calcChange(daysBack: number): number | null {
    if (sortedPrices.length < 2) return null;
    const cutoff = daysAgo(daysBack);
    const filtered = sortedPrices.filter((p) => p.ts >= cutoff);
    if (filtered.length < 2) return null;
    const first = filtered[0]!;
    const last = filtered[filtered.length - 1]!;
    if (first.close === 0) return null;
    return ((last.close - first.close) / first.close) * 100;
  }

  async function handleDelete() {
    await removeAsset.mutateAsync(asset.id);
    setSelectedAssetId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedAssetId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{asset.symbol}</h2>
              <Badge variant="outline">{asset.asset_type}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{asset.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshAsset.mutate(asset.id)}
            disabled={refreshAsset.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${refreshAsset.isPending ? "animate-spin" : ""}`} />
            <span className="ml-2">Refresh</span>
          </Button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              <span className="ml-2">Remove</span>
            </Button>
          )}
        </div>
      </div>

      {latestPrice && (
        <div className="flex items-baseline gap-6">
          <p className="text-3xl font-bold">{formatCurrency(latestPrice.close)}</p>
          <div className="flex gap-4 text-sm">
            {([
              ["24h", 1],
              ["7d", 7],
              ["30d", 30],
              ["1Y", 365],
            ] as const).map(([label, days]) => {
              const change = calcChange(days);
              if (change === null) return null;
              return (
                <span key={label} className={change >= 0 ? "text-green" : "text-red"}>
                  {label} {formatPercent(change)}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {latestPrice && (
        <p className="text-xs text-muted-foreground">
          Last updated: {formatDateTime(latestPrice.ts)}
        </p>
      )}

      {isLoading && <p className="text-muted-foreground">Loading price data...</p>}
      {!isLoading && sortedPrices.length > 0 && <AssetChart data={sortedPrices} />}
      {!isLoading && sortedPrices.length === 0 && (
        <p className="text-muted-foreground">
          No price data available. Try refreshing or check your API key in Settings.
        </p>
      )}
    </div>
  );
}
