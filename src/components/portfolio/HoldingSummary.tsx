import { useHoldingSummary } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface Props {
  assetId: string;
  currentPrice: number;
}

export function HoldingSummary({ assetId, currentPrice }: Props) {
  const { data: summary, isLoading } = useHoldingSummary(assetId);

  if (isLoading || !summary || (summary.total_bought === 0 && summary.total_sold === 0)) {
    return null;
  }

  const isShort = summary.total_bought === 0;
  const currentValue = summary.net_quantity * currentPrice;
  const pnl = currentValue + summary.total_sold_value - summary.total_cost_basis;
  const pnlBasis = summary.total_cost_basis > 0 ? summary.total_cost_basis : summary.total_sold_value;
  const pnlPercent = pnlBasis > 0 ? (pnl / pnlBasis) * 100 : 0;
  const currentlyInvested = summary.net_quantity * summary.avg_cost_per_unit;

  if (isShort) {
    // Pure short: Net Qty | Avg Entry | Short Proceeds | Current Value | P&L
    const avgEntry = summary.total_sold > 0 ? summary.total_sold_value / summary.total_sold : 0;
    return (
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card/50 p-4 sm:grid-cols-5">
        <div>
          <p className="text-xs text-muted-foreground">Net Quantity</p>
          <p className="text-sm font-medium">{summary.net_quantity.toFixed(6)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Entry</p>
          <p className="text-sm font-medium">{formatCurrency(avgEntry)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Short Proceeds</p>
          <p className="text-sm font-medium">{formatCurrency(summary.total_sold_value)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current Value</p>
          <p className="text-sm font-medium">{formatCurrency(currentValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">P&L</p>
          <p className={`text-sm font-medium ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatCurrency(pnl)} ({pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
          </p>
        </div>
      </div>
    );
  }

  // Long / mixed: Net Qty | Avg Cost | Total Invested | Currently Invested | Current Value | P&L
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card/50 p-4 sm:grid-cols-3 lg:grid-cols-6">
      <div>
        <p className="text-xs text-muted-foreground">Net Quantity</p>
        <p className="text-sm font-medium">{summary.net_quantity.toFixed(6)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Avg Cost</p>
        <p className="text-sm font-medium">{formatCurrency(summary.avg_cost_per_unit)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Total Invested</p>
        <p className="text-sm font-medium">{formatCurrency(summary.total_cost_basis)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Currently Invested</p>
        <p className="text-sm font-medium">{formatCurrency(currentlyInvested)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Current Value</p>
        <p className="text-sm font-medium">{formatCurrency(currentValue)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">P&L</p>
        <p className={`text-sm font-medium ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
          {formatCurrency(pnl)} ({pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
        </p>
      </div>
    </div>
  );
}
