# CLAUDE-config-variables.md — Configuration Reference

## Project Identity

| Key | Value |
|-----|-------|
| App name | `atlas` |
| Version | `0.1.0` |
| Bundle identifier | `com.anthony.atlas` |
| Tauri window label | `"main"` |
| Default window size | 800 × 600 |

## Dev URLs & Ports

| Setting | Value |
|---------|-------|
| Vite dev server | `http://localhost:1420` |
| `devUrl` (tauri.conf.json) | `http://localhost:1420` |
| `frontendDist` | `../dist` |

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm run tauri dev` | Full dev (Vite + Rust hot reload) |
| `npm run tauri build` | Production build |
| `npm run build` | Frontend only (tsc + vite) |
| `cargo build` | Rust only (from src-tauri/) |
| `cargo clippy` | Rust linter |

## Market Data Provider Limits

| Provider | Free Limit | Usage |
|----------|-----------|-------|
| Twelve Data | 8 req/min | Primary OHLCV source (stocks) |
| CoinGecko | ~30 req/min (no key) | Crypto prices + history |
| Alpha Vantage | 25 req/day | Macro endpoints only (CPI, GDP, yields) |

## Cache TTLs

| Data Type | TTL |
|-----------|-----|
| CoinGecko spot price | 60 seconds |
| CoinGecko daily history | 24 hours |
| Alpha Vantage macro | Monthly (updates monthly) |

## Database Schema Tables

| Table | Purpose |
|-------|---------|
| `assets` | Asset registry (UUID PK, symbol, name, type, currency, added_at) |
| `historical_prices` | OHLCV rows (asset_id FK, ts Unix seconds, open/high/low/close/volume) |
| `price_cache_meta` | Last fetch timestamp per asset + provider name |
| `settings` | Key/value store for non-sensitive settings (JSON values) |

## Asset Types (CHECK constraint)

```
'stock' | 'crypto' | 'commodity'
```

## Timestamp Convention

All timestamps stored as **Unix seconds** (INTEGER), not milliseconds.
- DB: `INTEGER NOT NULL` columns named `ts`, `added_at`, `last_fetched`
- Lightweight Charts: `time` field must be `UTCTimestamp` (seconds)
- JS conversion: `Math.floor(Date.now() / 1000)`
- Rust conversion: `chrono::Utc::now().timestamp()`

## Security Config (Target State — Not Yet Implemented)

| Setting | Target Value |
|---------|-------------|
| `app.security.csp` | Strict CSP string (currently `null` — must be set before Phase 1 complete) |
| `withGlobalTauri` | `false` (use ES module imports only) |
| API key storage | Tauri Stronghold vault (never in DB `settings` table) |
| DB passphrase | Argon2id-derived, held in memory only, never persisted |

## Tauri Plugin Feature Flags (To Be Added)

```toml
# src-tauri/Cargo.toml — not yet added
tauri-plugin-sql = { version = "2", features = ["sqlcipher"] }
tauri-plugin-stronghold = "2"
```

> ⚠️ `sqlcipher` and default `sqlite` feature flags are **mutually exclusive**. Use only `sqlcipher`.
