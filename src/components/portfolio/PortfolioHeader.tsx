import { formatCurrency, formatPercent } from "@/lib/utils/formatCurrency";

interface Props {
  totalValue: number;
  change24hValue: number;
  change24hPct: number;
  totalUnrealizedPnL: number;
  totalPnLPct: number;
}

export function PortfolioHeader({
  totalValue,
  change24hValue,
  change24hPct,
  totalUnrealizedPnL,
  totalPnLPct,
}: Props) {
  const isPositive = change24hValue >= 0;
  const isPnLPositive = totalUnrealizedPnL >= 0;

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-1">Total Portfolio Value</p>
      <div className="flex items-end gap-3">
        <p className="text-4xl font-bold tracking-tight text-white">
          {formatCurrency(totalValue)}
        </p>
        <div
          className={`mb-1 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium ${
            isPositive
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          <span>
            {isPositive ? "+" : ""}
            {formatCurrency(change24hValue)}
          </span>
          <span>{formatPercent(change24hPct)}</span>
          <span className="text-xs font-normal opacity-70">24h</span>
        </div>
        {totalValue > 0 && (
          <div
            className={`mb-1 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium ${
              isPnLPositive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            <span>
              {isPnLPositive ? "+" : ""}
              {formatCurrency(totalUnrealizedPnL)}
            </span>
            <span>{formatPercent(totalPnLPct)}</span>
            <span className="text-xs font-normal opacity-70">P&L</span>
          </div>
        )}
      </div>
    </div>
  );
}
