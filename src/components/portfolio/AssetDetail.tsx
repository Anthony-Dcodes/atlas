import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetChart } from "@/components/charts/AssetChart";
import { AddTransactionDialog } from "@/components/portfolio/AddTransactionDialog";
import { TransactionList } from "@/components/portfolio/TransactionList";
import { HoldingSummary } from "@/components/portfolio/HoldingSummary";
import { usePrices, useRefreshAsset } from "@/hooks/usePrices";
import { useRemoveAsset, useAllCacheMeta } from "@/hooks/useAssets";
import { useTransactions } from "@/hooks/useTransactions";
import { useAssetsStore } from "@/stores/assetsStore";
import { formatCurrency, formatPercent } from "@/lib/utils/formatCurrency";
import { formatDateTime, formatRelativeTime, formatDate, daysAgo } from "@/lib/utils/dateHelpers";
import type { Asset } from "@/types";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

const providerBadgeClass: Record<string, string> = {
  TwelveData: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  CoinGecko: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  Binance: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
};

interface Props {
  asset: Asset;
}

export function AssetDetail({ asset }: Props) {
  const { data: prices, isLoading } = usePrices(asset.id);
  const refreshAsset = useRefreshAsset();
  const removeAsset = useRemoveAsset();
  const setSelectedAssetId = useAssetsStore((s) => s.setSelectedAssetId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: allMeta } = useAllCacheMeta();
  const { data: txs } = useTransactions(asset.id);

  const sortedPrices = [...(prices ?? [])].sort((a, b) => a.ts - b.ts);
  const latestPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1]! : null;

  const cacheMeta = allMeta?.find((m) => m.asset_id === asset.id) ?? null;

  const buyCount = txs?.filter((t) => t.tx_type === "buy").length ?? 0;
  const sellCount = txs?.filter((t) => t.tx_type === "sell").length ?? 0;

  const firstPrice = sortedPrices[0];
  const lastPrice = sortedPrices[sortedPrices.length - 1];
  const historyDays =
    firstPrice && lastPrice && firstPrice !== lastPrice
      ? Math.round((lastPrice.ts - firstPrice.ts) / 86400)
      : null;

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
      {cacheMeta && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          Provider:
          <span className={`rounded border px-1.5 py-0.5 text-xs ${providerBadgeClass[cacheMeta.provider] ?? ""}`}>
            {cacheMeta.provider}
          </span>
          · Fetched {formatRelativeTime(cacheMeta.last_fetched)}
        </p>
      )}
      {historyDays !== null && firstPrice && lastPrice && (
        <p className="text-xs text-muted-foreground">
          Price history: {formatDate(firstPrice.ts)} – {formatDate(lastPrice.ts)}{" "}
          <span className="text-zinc-600">({historyDays.toLocaleString()} days)</span>
        </p>
      )}

      {isLoading && <p className="text-muted-foreground">Loading price data...</p>}
      {!isLoading && sortedPrices.length > 0 && <AssetChart data={sortedPrices} />}
      {!isLoading && sortedPrices.length === 0 && (
        <p className="text-muted-foreground">
          No price data available. Try refreshing or check your API key in Settings.
        </p>
      )}

      {latestPrice && (
        <HoldingSummary assetId={asset.id} currentPrice={latestPrice.close} />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Transactions</h3>
            {(buyCount > 0 || sellCount > 0) && (
              <p className="text-xs text-muted-foreground">
                {buyCount > 0 && `${buyCount} buy${buyCount !== 1 ? "s" : ""}`}
                {buyCount > 0 && sellCount > 0 && " · "}
                {sellCount > 0 && `${sellCount} sell${sellCount !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>
          <AddTransactionDialog assetId={asset.id} />
        </div>
        <TransactionList assetId={asset.id} />
      </div>
    </div>
  );
}
