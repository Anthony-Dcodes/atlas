import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/dateHelpers";
import { Trash2 } from "lucide-react";

interface Props {
  assetId: string;
}

export function TransactionList({ assetId }: Props) {
  const { data: transactions, isLoading } = useTransactions(assetId);
  const deleteTx = useDeleteTransaction(assetId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading transactions...</p>;
  }

  if (!transactions || transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2"
        >
          <div className="flex items-center gap-3">
            <Badge
              variant={tx.tx_type === "buy" ? "default" : "destructive"}
              className={tx.tx_type === "buy" ? "bg-green-600" : ""}
            >
              {tx.tx_type === "buy" ? "Buy" : "Sell"}
            </Badge>
            <div>
              <p className="text-sm font-medium">
                {tx.quantity} @ {formatCurrency(tx.price_usd)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(tx.ts)}
                {tx.notes ? ` — ${tx.notes}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">
              {formatCurrency(tx.quantity * tx.price_usd)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTx.mutate(tx.id)}
              disabled={deleteTx.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
