import { Button } from "@/components/ui/button";
import { useNavigationStore } from "@/stores/navigationStore";
import { useAssetsStore } from "@/stores/assetsStore";
import { useAssets } from "@/hooks/useAssets";
import { useRefreshAsset } from "@/hooks/usePrices";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { activePage } = useNavigationStore();
  const { selectedAssetId } = useAssetsStore();
  const { data: assets } = useAssets();
  const refreshMutation = useRefreshAsset();
  const [refreshing, setRefreshing] = useState(false);

  const title = activePage === "dashboard" ? "Dashboard" : "Settings";

  async function handleRefreshAll() {
    setRefreshing(true);
    for (const asset of assets ?? []) {
      await refreshMutation.mutateAsync(asset.id);
    }
    setRefreshing(false);
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {activePage === "dashboard" && !selectedAssetId && (
        <Button variant="ghost" size="sm" onClick={handleRefreshAll} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          <span className="ml-2">Refresh All</span>
        </Button>
      )}
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
