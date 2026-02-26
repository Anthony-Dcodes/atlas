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
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {segments.map((seg) => (
          <div
            key={seg.assetId}
            style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
            title={`${seg.symbol}: ${seg.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <span key={seg.assetId} className="flex items-center gap-1 text-xs text-zinc-400">
            <span style={{ color: seg.color }}>●</span>
            {seg.symbol} {seg.pct.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}
