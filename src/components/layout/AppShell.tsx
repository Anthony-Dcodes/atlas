import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNavigationStore } from "@/stores/navigationStore";
import { Dashboard } from "@/pages/Dashboard";
import { SettingsPage } from "@/pages/Settings";

export function AppShell() {
  const { activePage } = useNavigationStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {activePage === "dashboard" && <Dashboard />}
          {activePage === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
