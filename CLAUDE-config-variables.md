# CLAUDE-config-variables.md — Configuration Reference

## Project Identity

| Key | Value |
|-----|-------|
| App name | `Atlas` |
| Version | `0.1.0` |
| Bundle identifier | `com.anthony.atlas` |
| Tauri window label | `"main"` |
| Default window size | 1200 × 800 |
| Min window size | 900 × 600 |

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
| `npm test` | Frontend tests (vitest, 19 tests) |
| `cargo build` | Rust only (from src-tauri/) |
| `cargo clippy` | Rust linter |
| `cargo test` | Rust tests (22 tests) |

## Market Data Provider Limits

| Provider | Free Limit | Usage |
|----------|-----------|-------|
| Twelve Data | 8 req/min | Primary OHLCV source (stocks, commodities) |
| CoinGecko | ~30 req/min (no key) | Crypto prices + history |
| Alpha Vantage | 25 req/day | Macro endpoints only (CPI, GDP, yields) — future |

## Cache Config

| Setting | Value |
|---------|-------|
| Price cache staleness | 3600 seconds (1 hour) |
| Default refresh interval | 3600 seconds (1 hour) |
| Price fetch range | 1 year of daily data |

## Database Schema Tables

| Table | Purpose |
|-------|---------|
| `assets` | Asset registry (UUID PK, symbol, name, type, currency, added_at, deleted_at) |
| `historical_prices` | OHLCV rows (asset_id FK, ts Unix seconds, open/high/low/close/volume) |
| `price_cache_meta` | Last fetch timestamp per asset + provider name |
| `settings` | Key/value store for settings and API keys (encrypted via SQLCipher) |

## Asset Types (CHECK constraint)

```
'stock' | 'crypto' | 'commodity'
```

## Settings Keys

| Key | Purpose |
|-----|---------|
| `twelve_data_api_key` | Twelve Data API key |
| `alpha_vantage_api_key` | Alpha Vantage API key |
| `refresh_interval` | Auto-refresh interval in seconds (0 = manual only) |

## Timestamp Convention

All timestamps stored as **Unix seconds** (INTEGER), not milliseconds.
- DB: `INTEGER NOT NULL` columns named `ts`, `added_at`, `last_fetched`, `deleted_at`
- Lightweight Charts: `time` field must be `UTCTimestamp` (seconds)
- JS conversion: `Math.floor(Date.now() / 1000)`
- Rust conversion: `chrono::Utc::now().timestamp()`

## Security Config (Implemented)

| Setting | Value |
|---------|-------|
| `app.security.csp` | `default-src 'self'; connect-src https://api.twelvedata.com https://api.coingecko.com https://api.alphavantage.co ipc: http://ipc.localhost; style-src 'self' 'unsafe-inline'; script-src 'self'` |
| DB encryption | SQLCipher via `rusqlite` `bundled-sqlcipher` |
| Key derivation | Argon2id (static salt: `atlas-sqlcipher-v1`) |
| API key storage | Encrypted DB settings table (`{provider}_api_key`) |
| DB passphrase | Argon2id-derived, held in memory only, never persisted |

## Rust Dependencies (Cargo.toml)

```toml
tauri = "2"
tauri-plugin-opener = "2"
tauri-plugin-stronghold = "2"  # registered, not actively used yet
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.32", features = ["bundled-sqlcipher"] }
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1"
rust_decimal = { version = "1.36", features = ["serde-with-float"] }
uuid = { version = "1", features = ["v4", "serde"] }
async-trait = "0.1"
argon2 = "0.5"
hex = "0.4"
```

## Frontend Dependencies (package.json)

Key deps: `react ^19`, `zustand ^5`, `@tanstack/react-query ^5`, `lightweight-charts ^5`, `tailwindcss ^4`, `@tailwindcss/vite ^4`, `radix-ui ^1`, `class-variance-authority`, `lucide-react`, `clsx`, `tailwind-merge`

Dev deps: `vitest ^4`, `jsdom ^28`, `@testing-library/react ^16`, `@testing-library/jest-dom ^6`

## Tauri Commands Registered

```rust
// lib.rs generate_handler!
commands::auth::check_first_run
commands::auth::setup_db
commands::auth::unlock_db
commands::assets::add_asset
commands::assets::remove_asset
commands::assets::list_assets
commands::prices::fetch_prices
commands::prices::refresh_asset
commands::settings::save_api_key
commands::settings::has_api_key
commands::settings::remove_api_key
commands::settings::get_setting
commands::settings::save_setting
```

## CoinGecko Coin ID Mapping

Hardcoded in `providers/coingecko.rs`:
| Ticker | Coin ID |
|--------|---------|
| BTC | bitcoin |
| ETH | ethereum |
| SOL | solana |
| ADA | cardano |
| DOT | polkadot |
| DOGE | dogecoin |
| XRP | ripple |
| AVAX | avalanche-2 |
| MATIC/POL | matic-network |
| LINK | chainlink |
| UNI | uniswap |
| ATOM | cosmos |
| LTC | litecoin |
| BNB | binancecoin |
| (other) | lowercase ticker as fallback |
