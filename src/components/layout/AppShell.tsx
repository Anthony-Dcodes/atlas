import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNavigationStore } from "@/stores/navigationStore";
import { Dashboard } from "@/pages/Dashboard";
import { TransactionsPage } from "@/pages/Transactions";
import { AssetManagerPage } from "@/pages/AssetManager";
import { SettingsPage } from "@/pages/Settings";
import { RealizedPnLPage } from "@/pages/RealizedPnL";

export function AppShell() {
  const { activePage } = useNavigationStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-scroll p-6">
          {activePage === "dashboard" && <Dashboard />}
          {activePage === "transactions" && <TransactionsPage />}
          {activePage === "realized-pnl" && <RealizedPnLPage />}
          {activePage === "asset-manager" && <AssetManagerPage />}
          {activePage === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
