import { Button } from "@/components/ui/button";
import { useNavigationStore } from "@/stores/navigationStore";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function Header() {
  const { activePage } = useNavigationStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const title = activePage === "dashboard" ? "Dashboard" : "Settings";

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["assets"] });
    await queryClient.invalidateQueries({ queryKey: ["prices"] });
    setRefreshing(false);
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {activePage === "dashboard" && (
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          <span className="ml-2">Refresh</span>
        </Button>
      )}
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
