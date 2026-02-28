import { create } from "zustand";
import type { TimeRange } from "@/components/charts/PortfolioChart";

interface AssetsState {
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  portfolioTimeRange: TimeRange;
  setPortfolioTimeRange: (range: TimeRange) => void;
}

export const useAssetsStore = create<AssetsState>((set) => ({
  selectedAssetId: null,
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  portfolioTimeRange: "1y",
  setPortfolioTimeRange: (range) => set({ portfolioTimeRange: range }),
}));
