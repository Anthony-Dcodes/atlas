import { create } from "zustand";

interface AssetsState {
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
}

export const useAssetsStore = create<AssetsState>((set) => ({
  selectedAssetId: null,
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
}));
