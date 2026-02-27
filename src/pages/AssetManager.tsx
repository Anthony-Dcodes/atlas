import { useState } from "react";
import { useAllAssets, usePurgeAsset } from "@/hooks/useAssets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/dateHelpers";
import { Trash2 } from "lucide-react";

export function AssetManagerPage() {
  const { data: assets, isLoading } = useAllAssets();
  const purge = usePurgeAsset();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-100">Asset Manager</h2>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading assets...</p>}

      {!isLoading && assets && assets.length === 0 && (
        <p className="text-muted-foreground py-10 text-center">No assets found.</p>
      )}

      {assets && assets.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3">Deleted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const isDeleted = asset.deleted_at !== null && asset.deleted_at !== undefined;
                return (
                  <tr
                    key={asset.id}
                    className={`border-b border-zinc-800/50 ${isDeleted ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-zinc-100">{asset.symbol}</td>
                    <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">{asset.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {asset.asset_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {isDeleted ? (
                        <Badge variant="destructive" className="text-xs">Deleted</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-green-400 text-xs">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(asset.added_at)}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {isDeleted && asset.deleted_at ? formatDate(asset.deleted_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isDeleted && (
                        <>
                          {confirmId === asset.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={purge.isPending}
                                onClick={() => {
                                  purge.mutate(asset.id, {
                                    onSuccess: () => setConfirmId(null),
                                  });
                                }}
                              >
                                {purge.isPending ? "Purging..." : "Confirm"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => setConfirmId(asset.id)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Purge
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
