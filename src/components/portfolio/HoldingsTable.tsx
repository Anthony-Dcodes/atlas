import { formatCurrency, formatPercent } from "@/lib/utils/formatCurrency";
import type { Asset } from "@/types";

export interface HoldingRow {
  asset: Asset;
  latestPrice: number | null;
  change24h: number | null;
  allocationPct: number;
  color: string;
}

interface Props {
  rows: HoldingRow[];
  onSelect: (id: string) => void;
}

const typeBadgeClass: Record<string, string> = {
  stock: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  crypto: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  commodity: "border-amber-500/40 bg-amber-500/10 text-amber-400",
};

export function HoldingsTable({ rows, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="border-b border-zinc-800 px-6 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Assets</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-500">
            <th className="px-6 py-3 text-left font-medium">Symbol</th>
            <th className="px-6 py-3 text-left font-medium">Name</th>
            <th className="px-6 py-3 text-right font-medium">Price</th>
            <th className="px-6 py-3 text-right font-medium">24h</th>
            <th className="px-6 py-3 text-right font-medium">Alloc</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.asset.id}
              className="cursor-pointer border-b border-zinc-800/50 transition-colors last:border-0 hover:bg-zinc-800/40"
              onClick={() => onSelect(row.asset.id)}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span style={{ color: row.color }}>●</span>
                  <span className="font-semibold text-zinc-100">{row.asset.symbol}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-300">{row.asset.name}</span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-xs ${typeBadgeClass[row.asset.asset_type] ?? ""}`}
                  >
                    {row.asset.asset_type}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-right tabular-nums text-zinc-100">
                {row.latestPrice !== null ? (
                  formatCurrency(row.latestPrice)
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
              <td className="px-6 py-4 text-right tabular-nums">
                {row.change24h !== null ? (
                  <span className={row.change24h >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {formatPercent(row.change24h)}
                  </span>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
              <td className="px-6 py-4 text-right tabular-nums text-zinc-400">
                {row.allocationPct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
