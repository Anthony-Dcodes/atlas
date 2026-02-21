import { describe, it, expect, beforeEach } from "vitest";
import { useAssetsStore } from "../assetsStore";

describe("assetsStore", () => {
  beforeEach(() => {
    useAssetsStore.setState({ selectedAssetId: null });
  });

  it("starts with no selected asset", () => {
    expect(useAssetsStore.getState().selectedAssetId).toBeNull();
  });

  it("selects an asset", () => {
    useAssetsStore.getState().setSelectedAssetId("asset-1");
    expect(useAssetsStore.getState().selectedAssetId).toBe("asset-1");
  });

  it("clears selection", () => {
    useAssetsStore.getState().setSelectedAssetId("asset-1");
    useAssetsStore.getState().setSelectedAssetId(null);
    expect(useAssetsStore.getState().selectedAssetId).toBeNull();
  });
});
