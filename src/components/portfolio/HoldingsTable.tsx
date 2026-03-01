import { formatCurrency, formatPercent } from "@/lib/utils/formatCurrency";
import type { Asset } from "@/types";

export interface HoldingRow {
  asset: Asset;
  latestPrice: number | null;
  change24h: number | null;
  allocationPct: number;
  color: string;
  isHeld: boolean;
  netQty: number;
  assetValue: number | null;
  unrealizedPnL: number | null;
  pnlPct: number | null;
  priceLoading: boolean;
  priceError: boolean;
}

interface Props {
  rows: HoldingRow[];
  onSelect: (id: string) => void;
}

function formatQty(qty: number, assetType: string): string {
  const decimals = assetType === "crypto" ? 6 : 2;
  return qty.toFixed(decimals);
}

export function HoldingsTable({ rows, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="border-b border-zinc-800 px-6 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Assets</p>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[580px]">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-500">
            <th className="px-4 py-3 text-left font-medium">Asset</th>
            <th className="px-3 py-3 text-right font-medium">Price</th>
            <th className="px-3 py-3 text-right font-medium">Holdings</th>
            <th className="px-3 py-3 text-right font-medium">Value</th>
            <th className="px-3 py-3 text-right font-medium">P&L</th>
            <th className="px-3 py-3 text-right font-medium">Alloc</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.asset.id}
              className={`cursor-pointer border-b border-zinc-800/50 transition-colors last:border-0 hover:bg-zinc-800/40${
                !row.isHeld ? " opacity-50" : ""
              }`}
              onClick={() => onSelect(row.asset.id)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span style={{ backgroundColor: row.color }} className="inline-block h-2 w-2 shrink-0 rounded-full" />
                  <div className="min-w-0">
                    <div className="font-semibold leading-tight text-zinc-100">{row.asset.symbol}</div>
                    <div className="truncate text-xs leading-tight text-zinc-500">{row.asset.name}</div>
                  </div>
                </div>
                {row.isHeld && row.netQty < 0 && (
                  <span className="ml-[18px] text-[10px] font-medium tracking-wide text-zinc-500">SHORT</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-zinc-100">
                {row.latestPrice !== null ? (
                  formatCurrency(row.latestPrice)
                ) : row.priceLoading ? (
                  <span className="animate-pulse text-zinc-500">Loading…</span>
                ) : row.priceError ? (
                  <span className="text-amber-400" title="Price fetch failed">Error</span>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-zinc-300">
                {row.isHeld ? (
                  formatQty(row.netQty, row.asset.asset_type)
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-zinc-100">
                {row.isHeld && row.assetValue !== null ? (
                  formatCurrency(row.assetValue)
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {row.isHeld && row.unrealizedPnL !== null && row.pnlPct !== null ? (
                  <div>
                    <div className={`tabular-nums ${row.unrealizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatPercent(row.pnlPct)}
                    </div>
                    <div className="text-xs tabular-nums text-zinc-500">
                      {formatCurrency(row.unrealizedPnL)}
                    </div>
                  </div>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-zinc-400">
                {row.isHeld ? (
                  `${row.allocationPct.toFixed(1)}%`
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
