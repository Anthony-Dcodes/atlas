# Atlas

A lightweight, local-first portfolio dashboard for tracking stocks, crypto, and commodities. All data is encrypted at rest — no accounts, no telemetry, no cloud dependency.

Built with [Tauri 2](https://tauri.app/) + [React 19](https://react.dev/) + [SQLCipher](https://www.zetetic.net/sqlcipher/).

## Features

- **Encrypted local database** — SQLCipher with Argon2id key derivation. Your passphrase unlocks everything; nothing is stored in plain text.
- **Multi-asset tracking** — Stocks, crypto, and commodities in one place.
- **Interactive charts** — Candlestick/line toggle, portfolio area chart with time range selector (7D / 30D / 90D / 1Y / All). Powered by [TradingView Lightweight Charts](https://github.com/niceBSure/lightweight-charts).
- **Market data providers** — Twelve Data (stocks/commodities) and CoinGecko (crypto, no key needed). Cached locally with 1-hour staleness.
- **Rate limiting** — Built-in per-provider rate limiting so you never hit API limits.
- **Fully offline after first fetch** — All price data cached in your local DB.
- **Dark theme** — Designed for financial workflows.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.70
- Tauri 2 system dependencies — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

> No system `libsqlcipher-dev` needed — SQLCipher is bundled via the `rusqlite` `bundled-sqlcipher` feature.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Anthony-Dcodes/atlas.git
cd atlas

# Install frontend dependencies
npm install

# Run the full dev environment (Tauri + Vite hot reload)
npm run tauri dev
```

The first Rust build downloads and compiles all dependencies (including SQLCipher). This can take **10–15 minutes** on lower-powered machines (e.g., Raspberry Pi). Subsequent incremental builds are much faster (~40s).

## Usage

1. **First run** — Set a passphrase (minimum 8 characters). This creates and encrypts your local database.
2. **Add assets** — Click "Add Asset", enter a symbol (e.g., `AAPL`, `BTC`, `GOLD`), name, and type.
3. **Configure API keys** — Go to Settings and add your [Twelve Data](https://twelvedata.com/) API key for stocks/commodities. CoinGecko works without a key.
4. **View charts** — Click any asset card to see detailed candlestick/line charts with price change indicators.

## Commands

```bash
# Development
npm run tauri dev          # Full dev environment (Tauri + Vite hot reload)
npm run build              # Frontend only (TypeScript check + Vite bundle)

# Production
npm run tauri build        # Production build

# Testing
npm test                   # Frontend tests (19 tests — utilities, stores)
cargo test                 # Rust tests (22 tests — queries, schema, rate limiting)

# Linting
cargo clippy               # Rust linter
```

## Architecture

```
atlas/
├── src-tauri/src/
│   ├── lib.rs              # Tauri builder, plugin registration, command handler
│   ├── models.rs           # Asset, OHLCVRow, PriceCacheMeta, AssetType
│   ├── state.rs            # AppState (DB mutex, rate limiting)
│   ├── commands/           # Tauri commands (auth, assets, prices, settings)
│   ├── db/
│   │   ├── mod.rs          # SQLCipher init, Argon2id key derivation
│   │   ├── schema.rs       # CREATE TABLE migrations
│   │   └── queries/        # Typed query functions (assets, prices, settings)
│   └── providers/          # MarketDataProvider trait + implementations
│       ├── twelve_data.rs  # Stocks & commodities
│       └── coingecko.rs    # Crypto (no API key needed)
└── src/
    ├── pages/              # PassphraseSetup, PassphraseUnlock, Dashboard, Settings
    ├── components/
    │   ├── layout/         # AppShell, Sidebar, Header
    │   ├── charts/         # AssetChart, PortfolioChart (Lightweight Charts v5)
    │   ├── portfolio/      # AssetCard, AssetDetail, AddAssetDialog
    │   └── ui/             # shadcn/ui components
    ├── hooks/              # useAssets, usePrices (TanStack Query wrappers)
    ├── stores/             # Zustand stores (navigation, asset selection)
    ├── lib/tauri/          # Typed invoke() wrappers — components never call invoke directly
    └── lib/utils/          # formatCurrency, toChartData, dateHelpers
```

### Data Flow

```
User action (add asset / refresh)
  → typed invoke wrapper (src/lib/tauri/)
  → Rust command checks cache staleness (1-hour TTL)
  → If stale: select provider by asset_type → fetch from API
  → Upsert into encrypted SQLite → return data
  → toChartData() → Lightweight Charts renders
```

## Security

- **Encryption at rest** — All data stored in a SQLCipher-encrypted SQLite database. Passphrase derived via Argon2id, used as `PRAGMA key`, held in memory only for the session.
- **API keys encrypted** — Stored in the same encrypted database, never exposed to the renderer process.
- **Strict CSP** — Content Security Policy restricts network access to configured API domains only.
- **No telemetry** — Zero network calls except to the market data APIs you configure.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri 2 |
| Frontend | React 19, TypeScript 5 (strict) |
| Styling | Tailwind CSS 4, shadcn/ui |
| Charts | Lightweight Charts 5 |
| State | Zustand 5, TanStack Query 5 |
| Backend | Rust, Tokio |
| Database | SQLite + SQLCipher (via rusqlite) |
| HTTP | reqwest (rustls-tls) |
| Key derivation | Argon2id |

## Roadmap

- [x] **Phase 1 — MVP**: Passphrase auth, asset tracking, price fetching, charts, settings
- [ ] **Phase 2 — Analytics**: Transaction log, cost basis, P&L, Sharpe ratio, benchmark overlays
- [ ] **Phase 3 — Research**: News feed, AI-powered price explanations, macro event overlays

## License

[MIT](LICENSE) — Copyright (c) 2026 AnthonyDcodes
