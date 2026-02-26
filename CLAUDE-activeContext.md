# CLAUDE-activeContext.md — Active Session Context

## Current Phase
**Phase 1 MVP — Implemented.** Ready for testing and refinement.

## Current State
- Full Phase 1 MVP built: auth flow, asset management, price fetching, charts, settings
- All Rust code compiles cleanly (clippy warnings only for unused provider methods)
- 29 Rust tests passing, 19 frontend tests passing
- TypeScript strict mode with zero errors

## What's Built
### Backend
- SQLCipher-encrypted DB with Argon2id key derivation
- Auth commands: check_first_run, setup_db, unlock_db
- Asset CRUD with soft deletes
- Incremental price fetching: only fetches from last stored date to today (full 1-year on first fetch)
- `refresh_asset` forces full re-download (clears price history + cache meta)
- 1-hour cache staleness gate, provider selection by asset type
- Twelve Data provider (stocks/commodities) + CoinGecko provider (crypto)
- Rate limiting per provider in AppState
- Settings storage in encrypted DB

### Frontend
- Auth flow: Loading → Setup/Unlock → AppShell
- Dashboard: Binance-style layout — PortfolioHeader (total value + 24h badge), PortfolioChart (area, time ranges), AllocationBar (stacked % bar + legend), HoldingsTable (full-width clickable rows)
- Asset detail: candlestick/line chart toggle, refresh, inline delete confirmation
- Add Asset dialog (symbol, name, type)
- Settings: API key management, refresh interval, about
- Dark theme with Tailwind CSS v4 variables
- `priceUtils.ts` — `calcChange(sortedPrices, daysBack)` pure function
- `assetColors.ts` — `buildColorMap(assets)` deterministic per-type color palettes

## Next Steps (Phase 1 Polish)
1. Run `npm run tauri dev` to verify full app works end-to-end with new dashboard
2. Test with real API keys (Twelve Data for stocks, CoinGecko for crypto)
3. Fix any runtime issues discovered during testing
4. Consider adding frontend tests for `priceUtils`, `assetColors`
5. Consider adding provider response parsing tests (fixture-based)

## Phase 2 Readiness
Phase 1 must be thoroughly tested before starting Phase 2 (Analytics):
- Transaction log, cost basis, P&L
- Advanced metrics (Sharpe, drawdown, CAGR)
- Benchmark overlays

## Recent Decisions
- Used `rusqlite` with `bundled-sqlcipher` instead of `tauri-plugin-sql` for full PRAGMA key control
- Used `lightweight-charts` v5 (npm package name, not `@tradingview/lightweight-charts`)
- API keys stored in encrypted DB settings table (not Stronghold yet — simpler for MVP)
- State-based routing (no router library) — just 3 pages with conditional rendering
- Stronghold plugin registered but not actively used (TODO for Phase 2)
