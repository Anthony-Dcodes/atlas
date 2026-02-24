import { useHoldingSummary } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface Props {
  assetId: string;
  currentPrice: number;
}

export function HoldingSummary({ assetId, currentPrice }: Props) {
  const { data: summary, isLoading } = useHoldingSummary(assetId);

  if (isLoading || !summary || summary.total_bought === 0) {
    return null;
  }

  const currentValue = summary.net_quantity * currentPrice;
  const unrealizedPnL = currentValue - summary.total_cost_basis + (summary.total_sold * summary.avg_cost_per_unit);
  const pnlPercent =
    summary.total_cost_basis > 0
      ? (unrealizedPnL / summary.total_cost_basis) * 100
      : 0;

  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card/50 p-4 sm:grid-cols-5">
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
        <p className="text-xs text-muted-foreground">Current Value</p>
        <p className="text-sm font-medium">{formatCurrency(currentValue)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Unrealized P&L</p>
        <p className={`text-sm font-medium ${unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
          {formatCurrency(unrealizedPnL)} ({unrealizedPnL >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
        </p>
      </div>
    </div>
  );
}
