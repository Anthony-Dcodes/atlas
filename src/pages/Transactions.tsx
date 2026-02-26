import { useMemo, useState } from "react";
import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAssets } from "@/hooks/useAssets";
import { AddTransactionDialog } from "@/components/portfolio/AddTransactionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listTransactions, deleteTransaction } from "@/lib/tauri/transactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/dateHelpers";
import type { Asset, Transaction } from "@/types";
import { Pencil, Trash2 } from "lucide-react";

interface TxWithAsset extends Transaction {
  asset: Asset;
}

export function TransactionsPage() {
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const queryClient = useQueryClient();
  const [editingTx, setEditingTx] = useState<TxWithAsset | null>(null);

  const txResults = useQueries({
    queries: (assets ?? []).map((asset) => ({
      queryKey: ["transactions", asset.id] as const,
      queryFn: () => listTransactions(asset.id),
    })),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; assetId: string }) => deleteTransaction(id),
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: ["transactions", assetId] });
      queryClient.invalidateQueries({ queryKey: ["holdingSummary", assetId] });
    },
  });

  const allTransactions = useMemo<TxWithAsset[]>(() => {
    if (!assets) return [];
    return assets
      .flatMap((asset, i) => {
        const txs = txResults[i]?.data ?? [];
        return txs.map((tx) => ({ ...tx, asset }));
      })
      .sort((a, b) => b.ts - a.ts);
  }, [assets, txResults]);

  const isLoading = assetsLoading || txResults.some((r) => r.isLoading);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-100">Transactions</h2>
        <AddTransactionDialog />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading transactions...</p>}

      {!isLoading && allTransactions.length === 0 && (
        <p className="text-muted-foreground">
          No transactions yet. Add an asset and record your first purchase.
        </p>
      )}

      {!isLoading && allTransactions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Asset
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Total
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {allTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-300">{formatDate(tx.ts)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-100">{tx.asset.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {tx.asset.asset_type}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={tx.tx_type === "buy" ? "default" : "destructive"}
                      className={tx.tx_type === "buy" ? "bg-green-600" : ""}
                    >
                      {tx.tx_type === "buy" ? "BUY" : "SELL"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">{tx.quantity}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {formatCurrency(tx.price_usd)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-100">
                    {formatCurrency(tx.quantity * tx.price_usd)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTx(tx)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ id: tx.id, assetId: tx.asset.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingTx && (
        <AddTransactionDialog
          key={editingTx.id}
          transaction={editingTx}
          open={!!editingTx}
          onOpenChange={(v) => { if (!v) setEditingTx(null); }}
        />
      )}
    </div>
  );
}
