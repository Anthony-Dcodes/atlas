import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils/formatCurrency";
import type { Asset, OHLCVRow } from "@/types";
import { daysAgo } from "@/lib/utils/dateHelpers";

interface Props {
  asset: Asset;
  prices: OHLCVRow[];
  onClick: () => void;
}

function calcChange(prices: OHLCVRow[], daysBack: number): number | null {
  if (prices.length === 0) return null;
  const cutoff = daysAgo(daysBack);
  const recent = prices.filter((p) => p.ts >= cutoff);
  if (recent.length < 2) return null;
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  if (first.close === 0) return null;
  return ((last.close - first.close) / first.close) * 100;
}

export function AssetCard({ asset, prices, onClick }: Props) {
  const sortedPrices = [...prices].sort((a, b) => a.ts - b.ts);
  const latestPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1]!.close : null;
  const change24h = calcChange(sortedPrices, 1);
  const change7d = calcChange(sortedPrices, 7);
  const change30d = calcChange(sortedPrices, 30);

  return (
    <Card
      className="cursor-pointer bg-card transition-colors hover:bg-secondary/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">{asset.symbol}</p>
            <p className="text-sm text-muted-foreground">{asset.name}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {asset.asset_type}
          </Badge>
        </div>
        {latestPrice !== null && (
          <p className="mt-2 text-xl font-bold">{formatCurrency(latestPrice)}</p>
        )}
        {latestPrice === null && (
          <p className="mt-2 text-sm text-muted-foreground">No price data</p>
        )}
        <div className="mt-2 flex gap-3 text-xs">
          {change24h !== null && (
            <span className={change24h >= 0 ? "text-green" : "text-red"}>
              24h {formatPercent(change24h)}
            </span>
          )}
          {change7d !== null && (
            <span className={change7d >= 0 ? "text-green" : "text-red"}>
              7d {formatPercent(change7d)}
            </span>
          )}
          {change30d !== null && (
            <span className={change30d >= 0 ? "text-green" : "text-red"}>
              30d {formatPercent(change30d)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
