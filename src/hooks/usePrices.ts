import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPrices, refreshAsset } from "@/lib/tauri/prices";

export function usePrices(assetId: string | null) {
  return useQuery({
    queryKey: ["prices", assetId],
    queryFn: () => fetchPrices(assetId!),
    enabled: !!assetId,
  });
}

export function useRefreshAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => refreshAsset(assetId),
    onSuccess: (_data, assetId) => {
      queryClient.invalidateQueries({ queryKey: ["prices", assetId] });
    },
  });
}
