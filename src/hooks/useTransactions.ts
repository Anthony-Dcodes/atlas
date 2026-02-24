import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTransactions,
  addTransaction,
  deleteTransaction,
  getHoldingSummary,
} from "@/lib/tauri/transactions";
import type { TxType } from "@/types";

export function useTransactions(assetId: string) {
  return useQuery({
    queryKey: ["transactions", assetId],
    queryFn: () => listTransactions(assetId),
  });
}

export function useHoldingSummary(assetId: string) {
  return useQuery({
    queryKey: ["holdingSummary", assetId],
    queryFn: () => getHoldingSummary(assetId),
  });
}

export function useAddTransaction(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      txType: TxType;
      quantity: number;
      priceUsd: number;
      ts: number;
      notes?: string;
    }) =>
      addTransaction(
        assetId,
        params.txType,
        params.quantity,
        params.priceUsd,
        params.ts,
        params.notes,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", assetId] });
      queryClient.invalidateQueries({ queryKey: ["holdingSummary", assetId] });
    },
  });
}

export function useDeleteTransaction(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", assetId] });
      queryClient.invalidateQueries({ queryKey: ["holdingSummary", assetId] });
    },
  });
}
