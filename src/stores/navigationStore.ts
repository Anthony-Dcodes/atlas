import { create } from "zustand";

export type Page = "dashboard" | "transactions" | "asset-manager" | "settings";

interface NavigationState {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activePage: "dashboard",
  setActivePage: (page) => set({ activePage: page }),
}));
