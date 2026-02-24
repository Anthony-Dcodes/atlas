# CLAUDE-config-variables.md — Configuration Reference

## Project Identity

| Key | Value |
|-----|-------|
| App name | `atlas` |
| Version | `0.1.0` |
| Bundle identifier | `com.anthony.atlas` |
| Tauri window label | `"main"` |
| Default window size | 800 x 600 |

## Dev URLs & Ports

| Setting | Value |
|---------|-------|
| Vite dev server | `http://localhost:1420` |
| `devUrl` (tauri.conf.json) | `http://localhost:1420` |
| `frontendDist` | `../dist` |

## Build & Test Commands

| Command | Purpose |
|---------|---------|
| `npm run tauri dev` | Full dev (Vite + Rust hot reload) |
| `npm run tauri build` | Production build |
| `npm run build` | Frontend only (tsc + vite) |
| `npx vitest run` | Run frontend tests (19 tests) |
| `cargo build` | Rust only (from src-tauri/) |
| `cargo test` | Rust unit tests (22 tests, from src-tauri/) |
| `cargo clippy` | Rust linter |

## Rust Dependencies (Cargo.toml)

```toml
tauri = "2"
tauri-plugin-opener = "2"
tauri-plugin-stronghold = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.32", features = ["bundled-sqlcipher"] }
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1"
uuid = { version = "1", features = ["v4", "serde"] }
async-trait = "0.1"
argon2 = "0.5"
hex = "0.4"
```

> **Note:** `rust_decimal` was removed — all price fields use `f64`.
> **Note:** `bundled-sqlcipher` and default sqlite are mutually exclusive. Only use `bundled-sqlcipher`.

## Market Data Provider Limits

| Provider | Free Limit | Usage |
|----------|-----------|-------|
| Twelve Data | 8 req/min | Primary OHLCV source (stocks, commodities) |
| CoinGecko | ~30 req/min (no key) | Crypto prices + history |
| Alpha Vantage | 25 req/day | Macro endpoints only (CPI, GDP, yields) — not yet implemented |

## Cache Configuration

| Setting | Value | Location |
|---------|-------|----------|
| Price cache staleness | 3600 seconds (1 hour) | `commands/prices.rs` CACHE_STALENESS_SECS |
| TanStack Query staleTime | 60,000 ms (1 min) | `App.tsx` QueryClient config |

## Database Schema Tables

| Table | Purpose |
|-------|---------|
| `assets` | Asset registry (UUID PK, symbol, name, type, currency, added_at, deleted_at) |
| `historical_prices` | OHLCV rows (asset_id FK, ts Unix seconds, open/high/low/close/volume as REAL) |
| `price_cache_meta` | Last fetch timestamp per asset + provider name |
| `settings` | Key/value store for settings including API keys (entire DB is encrypted) |

## Asset Types (CHECK constraint)

```
'stock' | 'crypto' | 'commodity'
```

## Settings Keys

| Key | Purpose |
|-----|---------|
| `twelve_data_api_key` | Twelve Data API key (stored in encrypted DB) |
| `coingecko_api_key` | CoinGecko API key (optional, free tier has no key) |
| `alpha_vantage_api_key` | Alpha Vantage API key |

## Timestamp Convention

All timestamps stored as **Unix seconds** (INTEGER), not milliseconds.
- DB: `INTEGER NOT NULL` columns named `ts`, `added_at`, `last_fetched`
- Lightweight Charts: `time` field must be `UTCTimestamp` (seconds)
- JS conversion: `Math.floor(Date.now() / 1000)`
- Rust conversion: `chrono::Utc::now().timestamp()`

## Security Config

| Setting | Current State | Target |
|---------|--------------|--------|
| `app.security.csp` | `null` (default) | Strict CSP (must set before Phase 1 complete) |
| `withGlobalTauri` | `false` | Keep as `false` — ES module imports only |
| API key storage | Encrypted DB settings table | Tauri Stronghold (Phase 2) |
| DB passphrase | Argon2id-derived, memory only | No change needed |
