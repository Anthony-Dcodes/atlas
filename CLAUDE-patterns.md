# CLAUDE-patterns.md — Established Code Patterns

> Status: Pre-implementation. Patterns below are **prescribed** by CLAUDE.md architecture, not yet proven in code. Update this file as patterns are implemented and validated.

## Rust Command Pattern

All Tauri commands follow this structure — convert `anyhow::Error` to `String` only at the boundary:

```rust
#[tauri::command]
async fn fetch_prices(
    symbol: String,
    asset_type: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<OHLCVRow>, String> {
    prices::fetch_and_cache(&symbol, &asset_type, &state)
        .await
        .map_err(|e| e.to_string())
}
```

- `anyhow::Result` internally everywhere
- Convert to `String` only at the Tauri command boundary
- All DB access through typed functions in `db/queries/` — no inline SQL in commands
- Register commands in `lib.rs` in `tauri::generate_handler![...]`

## Provider Trait Pattern

```rust
#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    async fn fetch_ohlcv(&self, symbol: &str, range: DateRange) -> anyhow::Result<Vec<OHLCVRow>>;
}
```

- Concrete impls: `TwelveDataProvider`, `CoinGeckoProvider`, `AlphaVantageProvider`
- Selected at runtime based on `asset_type` and settings

## TypeScript Invoke Pattern

Components never call `invoke()` directly. All calls go through typed wrappers in `src/lib/tauri/`:

```typescript
// src/lib/tauri/assets.ts
import { invoke } from '@tauri-apps/api/core'
import type { Asset } from '@/types'

export const listAssets = (): Promise<Asset[]> =>
  invoke('list_assets')

export const addAsset = (symbol: string, name: string, assetType: string): Promise<Asset> =>
  invoke('add_asset', { symbol, name, assetType })
```

## OHLCV → Chart Conversion

```typescript
import type { CandlestickData, UTCTimestamp } from '@tradingview/lightweight-charts'

export const toChartData = (rows: OHLCVRow[]): CandlestickData[] =>
  rows
    .sort((a, b) => a.ts - b.ts)
    .map(r => ({
      time: r.ts as UTCTimestamp,  // Unix seconds, NOT milliseconds
      open: r.open, high: r.high, low: r.low, close: r.close,
    }))
```

## React Chart Lifecycle

```typescript
useEffect(() => {
  if (!containerRef.current) return
  const chart = createChart(containerRef.current, options)
  // ... setup series
  return () => chart.remove()  // always cleanup
}, [])
```

## Rate Limiting in AppState

```rust
// In state.rs
pub struct AppState {
    pub db: SqlitePool,
    pub twelve_data_requests: Mutex<VecDeque<Instant>>,
    // ...
}
```

- Twelve Data: 8 req/min
- CoinGecko: ~30 req/min (60s TTL for spot, 24h TTL for daily)
- Alpha Vantage: 25 req/day (macro only)
