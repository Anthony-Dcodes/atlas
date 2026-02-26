import { invoke } from "@tauri-apps/api/core";
import type { SymbolSearchResult } from "@/types";

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  return invoke<SymbolSearchResult[]>("search_symbols", { query });
}
