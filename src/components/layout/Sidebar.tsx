import { cn } from "@/lib/utils";
import { useNavigationStore, type Page } from "@/stores/navigationStore";
import { LayoutDashboard, Receipt, Database, Settings } from "lucide-react";

const navItems: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "transactions", label: "Transactions", icon: Receipt },
  { page: "asset-manager", label: "Asset Manager", icon: Database },
  { page: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { activePage, setActivePage } = useNavigationStore();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h1 className="text-lg font-bold text-primary">Atlas</h1>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => setActivePage(item.page)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              activePage === item.page
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
