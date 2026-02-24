# CLAUDE-troubleshooting.md — Common Issues & Proven Solutions

## Tauri

### Command not being invoked / silently doing nothing
**Symptom:** `invoke('my_command')` resolves but nothing happens on the Rust side.
**Cause:** Command not registered in `lib.rs`.
**Fix:** Add to `tauri::generate_handler![..., my_command]` in `src-tauri/src/lib.rs`. Note: `main.rs` just calls `lib::run()` — all Tauri setup lives in `lib.rs`.

### `app_data_dir()` panicking or unavailable
**Cause:** Called before app is fully initialized, or called in async context without awaiting.
**Fix:** Resolve once at startup in `.setup()` and store the `PathBuf` in `AppState`. Do not call per-request.

## SQLCipher

### DB opens but queries fail / data is garbage
**Cause:** `PRAGMA key` not sent as the very first statement, or wrong feature flag.
**Fix:**
1. Ensure `Cargo.toml` has `rusqlite = { features = ["bundled-sqlcipher"] }` (not default sqlite — they're mutually exclusive)
2. `open_db()` in `db/mod.rs` handles this via `conn.pragma_update(None, "key", ...)`

### Schema migration fails on second run
**Cause:** Running `CREATE TABLE` without `IF NOT EXISTS`, or running migrations from frontend.
**Fix:** All migrations run in Rust via `schema::run_migrations()` on both `create_db` and `unlock_db`. Use `CREATE TABLE IF NOT EXISTS`. Never run DDL from the frontend.

## Price Fetching

### Chart shows no data / prices appear blank (FIXED)
**Root cause found:** `rust_decimal::Decimal` serialized as JSON strings (`"153.00"`) instead of numbers. Lightweight Charts silently rejected string values.
**Fix:** Switched all `OHLCVRow` fields from `Decimal` to `f64`. Removed `rust_decimal` dependency entirely.

### Empty API key passes "not configured" check (FIXED)
**Root cause:** `remove_api_key` stores `""` (empty string). `fetch_prices` only checked for `None`, not empty.
**Fix:** Added `.filter(|k| !k.is_empty())` before `.ok_or_else(...)` in `commands/prices.rs`.

### CoinGecko returns only close prices
**Status:** Known limitation. CoinGecko `/market_chart/range` endpoint returns `[timestamp, price]` pairs only — no open/high/low. Candlestick charts for crypto will show only close. To get full OHLCV would require the `/coins/{id}/ohlc` endpoint (limited to 1/7/14/30 day ranges).

### CoinGecko throttles requests / 429 errors
**Cause:** No `User-Agent` header on requests.
**Fix:** Both providers now use `reqwest::Client::builder().user_agent("atlas/0.1").build()`.

### Memory leak in CoinGecko provider (FIXED)
**Root cause:** `ticker_to_coin_id()` used `Box::leak()` for unknown tickers, permanently leaking memory.
**Fix:** Function now returns owned `String` instead of `&str`.

## React / Frontend

### Dashboard crashes after adding asset / removing asset (FIXED)
**Root cause:** `PortfolioSummary` called `usePrices()` inside a `for` loop — Rules of Hooks violation. When asset count changed, React threw "Rendered more/fewer hooks than during the previous render" and crashed the Dashboard subtree.
**Fix:** Refactored to render one `AssetCardWithPrices` component per asset (each with its own stable `usePrices` call). Prices aggregated via `useCallback` + `useState` in parent.

### Chart not rendering / blank container
**Cause:** Chart created before container div is mounted, or ref is null.
**Fix:** Guard in `useEffect`: `if (!containerRef.current) return`

### Memory leak — chart persists after component unmounts
**Cause:** Missing cleanup in `useEffect`.
**Fix:** Always return cleanup function: `resizeObserver.disconnect(); chart.remove(); chartRef.current = null;`

### `time` values cause chart errors or data doesn't display
**Cause:** Timestamps passed in milliseconds instead of seconds.
**Fix:** `time` must be Unix **seconds** as `UTCTimestamp`. If converting from JS `Date`: `Math.floor(date.getTime() / 1000)`.

## Rate Limiting

### API returns 429 / rate limit errors
**Cause:** Not tracking per-provider request timestamps.
**Fix:** `state.check_rate_limit()` enforces via `HashMap<String, VecDeque<Instant>>`:
- Twelve Data: max 8 per minute
- CoinGecko: max 30 per minute
- Alpha Vantage: max 25 per day

## TypeScript / Build

### Vite dev server not connecting to Tauri
**Cause:** Running `npm run dev` instead of `npm run tauri dev`.
**Fix:** Always use `npm run tauri dev` for the full dev environment.
