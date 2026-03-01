export interface AllocationSegment {
  assetId: string;
  symbol: string;
  pct: number;
  color: string;
}

interface Props {
  segments: AllocationSegment[];
}

export function AllocationBar({ segments }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-zinc-950">
        {segments.map((seg) => (
          <div
            key={seg.assetId}
            style={{ flexGrow: seg.pct, minWidth: "6px", backgroundColor: seg.color }}
            title={`${seg.symbol}: ${seg.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <span key={seg.assetId} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span
              style={{ backgroundColor: seg.color }}
              className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
            />
            {seg.symbol} {seg.pct.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}
