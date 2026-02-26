import { invoke } from "@tauri-apps/api/core";
import type { Transaction, TxType, AssetHoldingSummary } from "@/types";

export async function addTransaction(
  assetId: string,
  txType: TxType,
  quantity: number,
  priceUsd: number,
  ts: number,
  notes?: string,
): Promise<Transaction> {
  return invoke<Transaction>("add_transaction", {
    assetId,
    txType,
    quantity,
    priceUsd,
    ts,
    notes: notes ?? null,
  });
}

export async function listTransactions(
  assetId: string,
): Promise<Transaction[]> {
  return invoke<Transaction[]>("list_transactions", { assetId });
}

export async function updateTransaction(
  id: string,
  txType: TxType,
  quantity: number,
  priceUsd: number,
  ts: number,
  notes?: string,
): Promise<void> {
  return invoke<void>("update_transaction", {
    id,
    txType,
    quantity,
    priceUsd,
    ts,
    notes: notes ?? null,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return invoke<void>("delete_transaction", { id });
}

export async function getHoldingSummary(
  assetId: string,
): Promise<AssetHoldingSummary> {
  return invoke<AssetHoldingSummary>("get_holding_summary", { assetId });
}
