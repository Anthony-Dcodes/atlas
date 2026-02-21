import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { checkFirstRun } from "@/lib/tauri/auth";
import { PassphraseSetup } from "@/pages/PassphraseSetup";
import { PassphraseUnlock } from "@/pages/PassphraseUnlock";
import { AppShell } from "@/components/layout/AppShell";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

type AppScreen = "loading" | "setup" | "unlock" | "app";

function App() {
  const [screen, setScreen] = useState<AppScreen>("loading");

  useEffect(() => {
    checkFirstRun()
      .then((isFirst) => setScreen(isFirst ? "setup" : "unlock"))
      .catch(() => setScreen("unlock"));
  }, []);

  if (screen === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (screen === "setup") {
    return <PassphraseSetup onSuccess={() => setScreen("app")} />;
  }

  if (screen === "unlock") {
    return <PassphraseUnlock onSuccess={() => setScreen("app")} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

export default App;
