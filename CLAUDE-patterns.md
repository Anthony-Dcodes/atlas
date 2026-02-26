# CLAUDE-patterns.md — Established Code Patterns

> Status: **Implemented and validated** in Phase 1 MVP. Patterns below are proven in code.

## Rust Command Pattern

All Tauri commands use `state.with_db()` for DB access and convert errors at the boundary:

```rust
#[tauri::command]
pub fn add_asset(
    symbol: String,
    name: String,
    asset_type: String,
    state: State<'_, AppState>,
) -> Result<Asset, String> {
    let asset_type = AssetType::from_str(&asset_type).map_err(|e| e.to_string())?;
    state
        .with_db(|conn| { /* query logic */ })
        .map_err(|e| e.to_string())
}
```

- `anyhow::Result` internally everywhere
- Convert to `String` only at the Tauri command boundary via `.map_err(|e| e.to_string())`
- All DB access through `state.with_db(|conn| ...)` — locks mutex, unwraps Option
- Register commands in `lib.rs` in `tauri::generate_handler![...]`

## AppState DB Access Pattern

```rust
// state.rs
pub fn with_db<F, T>(&self, f: F) -> anyhow::Result<T>
where
    F: FnOnce(&Connection) -> anyhow::Result<T>,
{
    let guard = self.db.lock()...;
    let conn = guard.as_ref().ok_or_else(|| anyhow!("Database not unlocked"))?;
    f(conn)
}
```

- DB starts as `Mutex<Option<Connection>>` — None until passphrase unlocks it
- `with_db` handles lock + unwrap in one call
- Callers pass a closure that receives `&Connection`

## Provider Trait Pattern

```rust
#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    fn name(&self) -> &str;
    async fn fetch_ohlcv(&self, symbol: &str, range: &DateRange) -> anyhow::Result<Vec<OHLCVRow>>;
    async fn fetch_current_price(&self, symbol: &str) -> anyhow::Result<f64>;
}
```

- `TwelveDataProvider::new(api_key)` — requires API key
- `CoinGeckoProvider::new()` — no key needed, uses coin ID mapping
- Selected at runtime based on `asset.asset_type` in `commands/prices.rs`

## Soft Delete Pattern

```rust
// All queries filter: WHERE deleted_at IS NULL
pub fn soft_delete_asset(conn: &Connection, id: &str) -> anyhow::Result<()> {
    let now = Utc::now().timestamp();
    conn.execute("UPDATE assets SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL", ...)?;
}
```

## Cache Staleness Pattern

```rust
const CACHE_STALENESS_SECS: i64 = 3600; // 1 hour
let is_stale = meta.is_none_or(|m| now - m.last_fetched > CACHE_STALENESS_SECS);
if is_stale {
    // Incremental: fetch from day after last stored price to today
    let max_ts = queries::prices::get_max_ts(conn, &asset_id)?;
    let range = DateRange {
        from: match max_ts {
            Some(ts) => ts + 86400, // day after last stored
            None => now - (365 * 86400), // first fetch: 1 year
        },
        to: now,
    };
    // fetch from provider, upsert prices, update cache meta
}
// Always return from DB (even if fetch fails, return cached data)
```

- `refresh_asset` deletes both `historical_prices` and `price_cache_meta` for the asset, forcing a full 1-year re-download

## TypeScript Invoke Pattern

Components never call `invoke()` directly. All calls go through typed wrappers in `src/lib/tauri/`:

```typescript
// src/lib/tauri/assets.ts
import { invoke } from "@tauri-apps/api/core";
import type { Asset, AssetType } from "@/types";

export async function addAsset(symbol: string, name: string, assetType: AssetType): Promise<Asset> {
  return invoke<Asset>("add_asset", { symbol, name, assetType });
}
```

- Tauri auto-converts camelCase args to snake_case on Rust side

## TanStack Query Hook Pattern

```typescript
// src/hooks/useAssets.ts
export function useAssets() {
  return useQuery({ queryKey: ["assets"], queryFn: listAssets });
}

export function useAddAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ symbol, name, assetType }) => addAsset(symbol, name, assetType),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["assets"] }); },
  });
}
```

## Lightweight Charts v5 Pattern

```typescript
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from "lightweight-charts";

// v5 API: chart.addSeries(SeriesType, options)
const series = chart.addSeries(CandlestickSeries, { upColor: "#22c55e", ... });
series.setData(toCandlestickData(data));

// Always cleanup
return () => { resizeObserver.disconnect(); chart.remove(); };
```

## Inline Delete Confirmation Pattern

```tsx
{confirmDelete ? (
  <div className="flex gap-1">
    <Button variant="destructive" size="sm" onClick={handleDelete}>Confirm</Button>
    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
  </div>
) : (
  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
    <Trash2 /> Remove
  </Button>
)}
```

## Rate Limiting Pattern

```rust
// state.rs — per-provider VecDeque<Instant>
// Twelve Data: 8 req/min, CoinGecko: 30 req/min, Alpha Vantage: 25 req/day
state.check_rate_limit("twelve_data")?; // called before every provider request
```

## Decimal ↔ f64 Boundary Conversion

- Domain types use `rust_decimal::Decimal` for precision
- DB stores `f64` (REAL columns)
- Conversion functions in `db/queries/prices.rs`: `decimal_to_f64()`, `f64_to_decimal()`
- `serde-with-float` feature: Decimal serializes as JSON `number` (no frontend changes needed)

## useQueries for Multiple Assets Pattern

Use `useQueries` (not `usePrices` in a loop) to fetch prices for all assets — one hook call regardless of asset count, satisfying React's rules of hooks:

```typescript
import { useQueries } from "@tanstack/react-query";
import { fetchPrices } from "@/lib/tauri/prices";
import type { OHLCVRow } from "@/types";

const priceResults = useQueries({
  queries: (assets ?? []).map((asset) => ({
    queryKey: ["prices", asset.id] as const,
    queryFn: (): Promise<OHLCVRow[]> => fetchPrices(asset.id),
  })),
});
// Access: priceResults[i]?.data ?? []
```

**Never** use a hook inside a loop (`for (const id of ids) { usePrices(id) }`) — React rules violation.

## Dashboard Derived Data Pattern

Aggregate all price results into portfolio-level metrics via `useMemo`:

```typescript
const derived = useMemo(() => {
  if (!assets || assets.length === 0) return null;
  const colorMap = buildColorMap(assets);
  const allPrices = new Map<string, OHLCVRow[]>();
  let totalValue = 0;
  let totalValue24hAgo = 0;

  const assetPrices = assets.map((asset, i) => {
    const data = priceResults[i]?.data ?? [];
    const sorted = [...data].sort((a, b) => a.ts - b.ts);
    const latestPrice = sorted.length > 0 ? sorted[sorted.length - 1]!.close : null;
    if (latestPrice !== null) {
      totalValue += latestPrice;
      allPrices.set(asset.id, sorted);
      const historicalRow = sorted.filter((p) => p.ts <= daysAgo(1)).pop();
      totalValue24hAgo += historicalRow ? historicalRow.close : latestPrice;
    }
    return { asset, sorted, latestPrice };
  });

  // flatMap for type-safe filter+map (null exclusion)
  const holdingRows = assetPrices.flatMap(({ asset, sorted, latestPrice }) => {
    if (latestPrice === null) return [];
    return [{ asset, latestPrice, change24h: calcChange(sorted, 1), allocationPct: ..., color: ... }];
  });

  return { totalValue, change24hValue, change24hPct, allPrices, holdingRows, segments };
}, [assets, priceResults]);
```

- `flatMap` with empty-array return is the idiomatic pattern for type-safe filter+map when narrowing `T | null → T`
- `priceResults[i]?.data ?? []` handles both `noUncheckedIndexedAccess` and loading state

## assetColors Pattern

```typescript
// src/lib/utils/assetColors.ts
export function buildColorMap(assets: Asset[]): Map<string, string>
// stock → blue family, crypto → violet, commodity → amber
// cycles if >5 assets per type (mod index)
```

## AllocationBar Dynamic Width Pattern

Tailwind cannot generate dynamic `%` width classes at runtime. Use inline styles:
```tsx
<div style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
```

## Testing Patterns

### Rust: In-memory SQLCipher test DB
```rust
#[cfg(test)]
pub fn test_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.pragma_update(None, "key", "x'0000...'").unwrap();
    schema::run_migrations(&conn).unwrap();
    conn
}
```

### Frontend: Zustand store direct testing
```typescript
beforeEach(() => { useNavigationStore.setState({ activePage: "dashboard" }); });
it("navigates", () => {
  useNavigationStore.getState().setActivePage("settings");
  expect(useNavigationStore.getState().activePage).toBe("settings");
});
```
