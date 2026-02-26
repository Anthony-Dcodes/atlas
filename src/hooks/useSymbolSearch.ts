import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchSymbols } from "@/lib/tauri/search";

export function useSymbolSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ["symbolSearch", debouncedQuery],
    queryFn: () => searchSymbols(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 1,
    staleTime: 60_000,
  });
}
