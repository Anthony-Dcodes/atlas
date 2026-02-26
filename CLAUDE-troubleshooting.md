# CLAUDE-troubleshooting.md — Common Issues & Proven Solutions

> Status: **Updated with real solutions** encountered during Phase 1 MVP implementation.

## Tauri

### Command not being invoked / silently doing nothing
**Symptom:** `invoke('my_command')` resolves but nothing happens on the Rust side.
**Cause:** Command not registered in `lib.rs`.
**Fix:** Add to `tauri::generate_handler![..., my_command]` in `src-tauri/src/lib.rs`. Note: `main.rs` just calls `lib::run()` — all Tauri setup lives in `lib.rs`.

### `app.manage()` — "no method named manage found"
**Cause:** Missing `use tauri::Manager;` import.
**Fix:** Add `use tauri::Manager;` at the top of `lib.rs`. The `Manager` trait provides `manage()`, `app_handle()`, etc.

### `app_data_dir()` not available
**Fix:** Resolve via `app.path().app_data_dir()` in `.setup()` callback. Store the PathBuf in `AppState`. Access anywhere via `state.db_path`.

## SQLCipher

### DB opens but queries fail / "not a database" error
**Cause:** `PRAGMA key` not sent as the very first statement, or wrong key format.
**Fix:**
1. Use `rusqlite = { features = ["bundled-sqlcipher"] }` — bundles SQLCipher, no system dep needed
2. Send key via `conn.pragma_update(None, "key", format!("x'{}'", hex_key))` immediately after open
3. Verify with `conn.execute_batch("SELECT count(*) FROM sqlite_master;")` — fails with "not a database" if wrong key
4. Argon2id derivation in `db/mod.rs`: passphrase → 32-byte key → hex-encoded → PRAGMA key

### Wrong passphrase detection
**How it works:** After opening DB and sending PRAGMA key, execute `SELECT count(*) FROM sqlite_master`. If key is wrong, rusqlite returns a "file is not a database" error. Catch this in `commands/auth.rs` and return "Incorrect passphrase".

### In-memory DB for tests
**Pattern:** Use `Connection::open_in_memory()` + set a dummy PRAGMA key + run migrations. See `db::test_db()`.

## Lightweight Charts v5

### `addCandlestickSeries` / `addLineSeries` / `addAreaSeries` not found
**Cause:** v5 removed individual series methods.
**Fix:** Import series type and use generic `addSeries()`:
```typescript
import { CandlestickSeries, LineSeries, AreaSeries } from "lightweight-charts";
const series = chart.addSeries(CandlestickSeries, { upColor: "#22c55e" });
```

### npm package name
**Cause:** `@tradingview/lightweight-charts` returns 404 on npm.
**Fix:** Use `lightweight-charts` (without `@tradingview/` scope). Same library, different package name for v5.

### Chart not rendering / blank container
**Cause:** Chart created before container div is mounted, or ref is null.
**Fix:** Guard in `useEffect`: `if (!containerRef.current || data.length === 0) return`

### Memory leak — chart persists after component unmounts
**Fix:** Always cleanup in useEffect return:
```typescript
return () => { resizeObserver.disconnect(); chart.remove(); chartRef.current = null; };
```

## shadcn/ui

### Missing `cn` utility after init
**Cause:** shadcn/ui init may not create `src/lib/utils.ts` automatically.
**Fix:** Create manually with `clsx` + `tailwind-merge`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```
Also install: `npm install clsx tailwind-merge`

### Missing dependencies after component install
**Cause:** shadcn components may reference `class-variance-authority`, `lucide-react` without installing them.
**Fix:** `npm install class-variance-authority lucide-react`

## Rate Limiting

### API returns 429 / rate limit errors
**Fix:** `state.check_rate_limit(provider)` called before every outbound request in `commands/prices.rs`. Uses `VecDeque<Instant>` per provider in AppState:
- Twelve Data: max 8 per minute
- CoinGecko: max 30 per minute
- Alpha Vantage: max 25 per day

## React Hooks

### "Rendered more hooks than during the previous render" / hooks in a loop
**Cause:** Calling a hook (`usePrices`, `useQuery`, etc.) inside a `for` loop or `.map()` — React rules violation.
**Fix:** Use `useQueries` from TanStack Query v5 to fetch variable-length lists in a single hook call:
```typescript
import { useQueries } from "@tanstack/react-query";
const priceResults = useQueries({
  queries: assets.map((asset) => ({
    queryKey: ["prices", asset.id] as const,
    queryFn: (): Promise<OHLCVRow[]> => fetchPrices(asset.id),
  })),
});
// Access results: priceResults[i]?.data ?? []
```

## TypeScript / Build

### `noUncheckedIndexedAccess` causing errors
**Fix:** Use non-null assertion (`!`) when array index is guaranteed (e.g., after length check):
```typescript
const last = sorted[sorted.length - 1]!;
```

### Path alias `@/` not resolving
**Fix:** Configure in both `tsconfig.json` (paths) and `vite.config.ts` (resolve.alias):
```json
// tsconfig.json
"baseUrl": ".", "paths": { "@/*": ["./src/*"] }
```
```typescript
// vite.config.ts
resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
```

## Platform (Raspberry Pi / Linux aarch64)

### `cargo build` taking a long time
**Expected:** First full build with SQLCipher can take 10-15 minutes on Pi. Incremental builds ~40s. SQLCipher C compilation is the bottleneck.

### `fd` command not found
**Fix:** `fd` is installed as `fdfind` on Debian and symlinked to `/usr/local/bin/fd`.
