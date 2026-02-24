# CLAUDE-patterns.md — Established Code Patterns

> Status: **Implemented and validated.** Patterns below are proven in code with passing tests.

## Rust Command Pattern

All Tauri commands follow this structure — convert `anyhow::Error` to `String` only at the boundary:

```rust
#[tauri::command]
pub async fn fetch_prices(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<OHLCVRow>, String> {
    // ... internal logic uses anyhow::Result
    state.with_db(|conn| { ... }).map_err(|e| e.to_string())?;
    Ok(rows)
}
```

- `anyhow::Result` internally everywhere
- Convert to `String` only at the Tauri command boundary
- All DB access through typed functions in `db/queries/` — no inline SQL in commands
- Register commands in `lib.rs` in `tauri::generate_handler![...]`
- Sync commands (`pub fn`) for simple DB operations, `pub async fn` for provider calls

## AppState DB Access Pattern

```rust
// state.rs — single shared connection behind Mutex
pub struct AppState {
    pub db: Mutex<Option<Connection>>,
    pub db_path: PathBuf,
    pub rate_limits: Mutex<HashMap<String, VecDeque<Instant>>>,
}

// Usage — closure-based access
state.with_db(|conn| {
    queries::assets::get_asset(conn, &asset_id)
})?;
```

- `Option<Connection>` — `None` until passphrase unlocks DB
- `std::sync::Mutex` (not tokio) since locks are never held across `.await`
- `with_db()` returns `Err("Database not unlocked")` if DB not initialized

## Provider Trait Pattern

```rust
#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    fn name(&self) -> &str;
    async fn fetch_ohlcv(&self, symbol: &str, range: &DateRange) -> anyhow::Result<Vec<OHLCVRow>>;
    async fn fetch_current_price(&self, symbol: &str) -> anyhow::Result<f64>;
}
```

- Concrete impls: `TwelveDataProvider`, `CoinGeckoProvider`
- Selected at runtime: crypto → CoinGecko, everything else → Twelve Data
- Always set `User-Agent: atlas/0.1` on reqwest Client
- Provider returns `OHLCVRow` with empty `asset_id` — caller fills it in

## OHLCVRow — f64 Fields (NOT Decimal)

```rust
pub struct OHLCVRow {
    pub id: Option<i64>,
    pub asset_id: String,
    pub ts: i64,
    pub open: Option<f64>,
    pub high: Option<f64>,
    pub low: Option<f64>,
    pub close: f64,
    pub volume: Option<f64>,
}
```

**Important:** Uses `f64` not `rust_decimal::Decimal`. DB stores REAL (f64). No conversion needed. Serializes as JSON numbers (not strings).

## TypeScript Invoke Pattern

Components never call `invoke()` directly. All calls go through typed wrappers in `src/lib/tauri/`:

```typescript
// src/lib/tauri/assets.ts
export async function addAsset(symbol: string, name: string, assetType: AssetType): Promise<Asset> {
  return invoke<Asset>("add_asset", { symbol, name, assetType });
}
```

## React Hooks — NEVER Call in Loops

**Anti-pattern (causes React crashes when array length changes):**
```typescript
// BAD — violates Rules of Hooks
for (const id of assetIds) {
  const { data } = usePrices(id);  // CRASH
}
```

**Correct pattern — one hook per component instance:**
```typescript
// Each asset gets its own component with stable hook calls
function AssetCardWithPrices({ asset, onPricesLoaded }) {
  const { data: prices } = usePrices(asset.id);  // OK — fixed position
  useEffect(() => {
    if (prices?.length) onPricesLoaded(asset.id, prices);
  }, [asset.id, prices, onPricesLoaded]);
  return <AssetCard asset={asset} prices={prices ?? []} />;
}
```

Parent aggregates via `useCallback` + `useState` to collect prices from children.

## React Chart Lifecycle

```typescript
useEffect(() => {
  if (!containerRef.current) return;
  const chart = createChart(containerRef.current, options);
  // ... setup series, ResizeObserver
  return () => {
    resizeObserver.disconnect();
    chart.remove();  // always cleanup
    chartRef.current = null;
  };
}, [dependencies]);
```

## Rate Limiting

```rust
state.check_rate_limit(&provider_name).map_err(|e| e.to_string())?;
```

- Twelve Data: 8 req/min
- CoinGecko: ~30 req/min (no key required)
- Alpha Vantage: 25 req/day (macro only)
- Tracked via `HashMap<String, VecDeque<Instant>>` in AppState

## API Key Guard Pattern

```rust
let api_key = state
    .with_db(|conn| queries::settings::get_setting(conn, "twelve_data_api_key"))
    .map_err(|e| e.to_string())?
    .filter(|k| !k.is_empty())  // empty string = "removed"
    .ok_or_else(|| "API key not configured. Add it in Settings.".to_string())?;
```

Always `.filter(|k| !k.is_empty())` — `remove_api_key` stores `""` not NULL.
