# CLAUDE-decisions.md — Architecture Decisions & Rationale

## Stack Decisions (Final — Do Not Revisit)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop framework | Tauri 2 | Local-only, minimal footprint, Rust backend, no Electron overhead |
| DB encryption | SQLCipher via `rusqlite` `bundled-sqlcipher` | Direct PRAGMA key control, bundles SQLCipher (no system dep), compile-time checked |
| API key storage | Encrypted DB settings table (Phase 1) | Simpler than Stronghold for MVP; DB is SQLCipher-encrypted anyway |
| Chart library | `lightweight-charts` v5 | Best-in-class financial charts, MIT license, performant |
| State management | Zustand v5 | Minimal, no boilerplate, works well with React 19 |
| Async data fetching | TanStack Query v5 | Cache invalidation, background refetch, devtools |
| UI base | shadcn/ui + Tailwind CSS v4 | Unstyled primitives, full control, Tailwind-native |
| Error handling (Rust) | anyhow | Ergonomic, context-chain, converts cleanly to String at boundary |
| HTTP client | reqwest (rustls-tls) | Async, no OpenSSL runtime dep, simpler on aarch64 |
| Key derivation | Argon2id | Memory-hard, resistant to brute-force on passphrase |
| Financial precision | rust_decimal (serde-with-float) | Exact arithmetic, serializes as JSON number |
| TLS | rustls (not OpenSSL) | No system dependency, easier cross-compile |
| Routing | State-based (Zustand store) | Only 3 pages, no router library needed |
| Theme | Dark default | Financial app convention |

## Architectural Decisions

### rusqlite instead of tauri-plugin-sql
**Decision:** Use `rusqlite` with `bundled-sqlcipher` instead of `tauri-plugin-sql`.
**Rationale:** Full control over PRAGMA key timing (must be first statement). Plugin abstracts away the connection lifecycle. Bundled SQLCipher means no system `libsqlcipher-dev` dependency.

### API keys in encrypted DB (not Stronghold)
**Decision:** Store API keys in the DB `settings` table as `{provider}_api_key`.
**Rationale:** DB is already SQLCipher-encrypted. Stronghold adds complexity for Phase 1. Can migrate to Stronghold in Phase 2 for defense-in-depth.

### No backend server
**Decision:** Everything runs locally. No cloud sync, no telemetry, no accounts.
**Rationale:** Trust and privacy. Users keep financial data on their own machine.

### Adapter pattern for market data providers
**Decision:** All providers implement `MarketDataProvider` trait.
**Rationale:** Swap providers without touching core logic. Free tiers have strict limits; users may want to configure their own keys.

### DB access through typed query functions only
**Decision:** No inline SQL in commands. All queries in `db/queries/`.
**Rationale:** Testability, single source of truth for schema assumptions.

### Passphrase never stored
**Decision:** Passphrase derived via Argon2id → used as PRAGMA key → held in memory for session only.
**Rationale:** If the DB file is stolen, it cannot be decrypted without the passphrase.

### State-based routing (no router library)
**Decision:** Use Zustand `navigationStore` with conditional rendering in `AppShell`.
**Rationale:** Only 3 pages (Dashboard, Settings, and asset detail as sub-view). No URL-based navigation needed in a desktop app.

### Phase gating
**Decision:** Phase 1 must be complete and stable before Phase 2 work begins.
**Rationale:** Prevents scope creep and ensures the core (encryption, data fetch, display) is solid before adding analytics complexity.

## CSP Status
**Implemented:** CSP set in `tauri.conf.json`:
`default-src 'self'; connect-src https://api.twelvedata.com https://api.coingecko.com https://api.alphavantage.co ipc: http://ipc.localhost; style-src 'self' 'unsafe-inline'; script-src 'self'`

## Incremental Price Fetching
**Decision:** On stale cache, fetch only from the day after the last stored timestamp (`get_max_ts + 86400`) to today. Fall back to full 1-year range on first fetch (no data). `refresh_asset` clears both `historical_prices` and `price_cache_meta` to force a full re-download.
**Rationale:** Avoids re-fetching the entire year of history on every hourly cache expiry. Saves API quota (critical for Twelve Data's 8 req/min free tier) and reduces response sizes. Full re-download is still available via manual refresh.

## Dashboard Redesign — Binance-style Layout
**Decision:** Replace the original card grid + `PortfolioSummary` with a three-section layout: (A) `PortfolioHeader` + `PortfolioChart`, (B) `AllocationBar`, (C) `HoldingsTable`.
**Rationale:** Original had a critical React hooks-in-loop bug (`usePrices()` inside `for` loop in `PortfolioSummary`). Redesign fixes the bug via `useQueries`, adds data-dense Binance-inspired UI, and consolidates all derived portfolio math into a single `useMemo`. `AssetCard` grid removed in favour of the table.

## useQueries for Multi-Asset Price Fetching
**Decision:** Use `useQueries` from TanStack Query instead of calling `usePrices()` in a loop.
**Rationale:** React rules of hooks forbid hooks inside loops. `useQueries` takes an array of query configs and returns an array of results — exactly one hook call regardless of asset count.

## Portfolio-Level P&L on Dashboard
**Decision:** Make Dashboard holdings-aware by adding a second `useQueries` for `getHoldingSummary`, computing portfolio value as `Σ(net_qty × price)` for held assets, and displaying unrealized P&L alongside 24h change.
**Rationale:** Per-asset P&L infrastructure already existed (`AssetHoldingSummary` backend, `HoldingSummary.tsx`). No backend changes needed — purely frontend aggregation. Tracked-only assets (no transactions) remain visible but dimmed, avoiding confusion between "tracked" and "held" states.

## Lightweight Charts v5 Migration
**Decision:** Use v5 API (`chart.addSeries(CandlestickSeries, opts)`) instead of deprecated v4 methods.
**Rationale:** npm package `lightweight-charts` v5 removed `addCandlestickSeries()`, `addLineSeries()`, etc. Now uses generic `addSeries()` with type parameter.
