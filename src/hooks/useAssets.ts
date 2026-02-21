import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAssets, addAsset, removeAsset } from "@/lib/tauri/assets";
import type { AssetType } from "@/types";

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: listAssets,
  });
}

export function useAddAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      symbol,
      name,
      assetType,
    }: {
      symbol: string;
      name: string;
      assetType: AssetType;
    }) => addAsset(symbol, name, assetType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useRemoveAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["prices"] });
    },
  });
}
