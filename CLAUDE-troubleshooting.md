# CLAUDE-troubleshooting.md — Common Issues & Proven Solutions

> Status: Pre-implementation. Issues below are documented from CLAUDE.md gotchas and architecture knowledge. Update with real solutions as they're encountered during development.

## Tauri

### Command not being invoked / silently doing nothing
**Symptom:** `invoke('my_command')` resolves but nothing happens on the Rust side.
**Cause:** Command not registered in `lib.rs`.
**Fix:** Add to `tauri::generate_handler![..., my_command]` in `src-tauri/src/lib.rs`. Note: `main.rs` just calls `lib::run()` — all Tauri setup lives in `lib.rs`.

### `app_data_dir()` panicking or unavailable
**Cause:** Called before app is fully initialized, or called in async context without awaiting.
**Fix:** Resolve once at startup and store the `PathBuf` in `AppState`. Do not call per-request.

### Window creation fails
**Cause:** Window label not alphanumeric or not unique.
**Fix:** Use `"main"` for the primary window. Labels must be lowercase alphanumeric only.

## SQLCipher

### DB opens but queries fail / data is garbage
**Cause:** `PRAGMA key` not sent as the very first statement, or wrong feature flag.
**Fix:**
1. Ensure `Cargo.toml` has `tauri-plugin-sql = { features = ["sqlcipher"] }` (not default sqlite — they're mutually exclusive)
2. Send `PRAGMA key = '...'` immediately after opening, before any other statement

### Schema migration fails on second run
**Cause:** Running `CREATE TABLE` without `IF NOT EXISTS`, or running migrations from frontend.
**Fix:** All migrations must run in Rust on DB init (`db/mod.rs`). Use `CREATE TABLE IF NOT EXISTS`. Never run DDL from the frontend.

## Lightweight Charts

### Chart not rendering / blank container
**Cause:** Chart created before container div is mounted, or ref is null.
**Fix:** Guard in `useEffect`: `if (!containerRef.current) return`

### `time` values cause chart errors or data doesn't display
**Cause:** Timestamps passed in milliseconds instead of seconds.
**Fix:** `time` must be Unix **seconds** as `UTCTimestamp`. If converting from JS `Date`: `Math.floor(date.getTime() / 1000)`.

### Memory leak — chart persists after component unmounts
**Cause:** Missing cleanup in `useEffect`.
**Fix:** Always return `() => chart.remove()` from the `useEffect` that creates the chart.

## Rate Limiting

### API returns 429 / rate limit errors
**Cause:** Not tracking per-provider request timestamps.
**Fix:** Check `VecDeque<Instant>` in `AppState` before every outbound request. Enforce:
- Twelve Data: max 8 per minute
- CoinGecko: max 30 per minute
- Alpha Vantage: max 25 per day

## TypeScript / Build

### `any` type errors with strict mode
**Cause:** TypeScript strict mode + `noUncheckedIndexedAccess` enabled.
**Fix:** Never use `any`. Type all `invoke()` return values via the wrappers in `src/lib/tauri/`.

### Vite dev server not connecting to Tauri
**Cause:** Running `npm run dev` instead of `npm run tauri dev`.
**Fix:** Always use `npm run tauri dev` for the full dev environment. `npm run dev` starts Vite only (no Rust backend).

## Platform (Raspberry Pi / Linux aarch64)

### `cargo build` taking a long time
**Expected:** ~40s incremental on Raspberry Pi. This is normal. Use `cargo build` only; avoid clean builds.

### `fd` command not found
**Fix:** `fd` is installed as `fdfind` on Debian and symlinked to `/usr/local/bin/fd`. Use `fd` directly.
