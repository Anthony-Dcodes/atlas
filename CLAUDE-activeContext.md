# CLAUDE-activeContext.md — Active Session Context

## Current Phase
**Phase 1 MVP — Implemented.** Ready for testing and refinement.

## Current State
- Full Phase 1 MVP built: auth flow, asset management, price fetching, charts, settings
- All Rust code compiles cleanly (clippy warnings only for unused provider methods)
- 33 Rust tests passing, 22 frontend tests passing
- TypeScript strict mode with zero errors
- Portfolio-level P&L implemented on Dashboard (holdings-aware values, unrealized P&L)

## What's Built
### Backend
- SQLCipher-encrypted DB with Argon2id key derivation
- Auth commands: check_first_run, setup_db, unlock_db
- Asset CRUD with soft deletes
- Incremental price fetching: only fetches from last stored date to today (full history on first fetch)
- `refresh_asset` forces full re-download (clears price history + cache meta)
- 1-hour cache staleness gate, provider selection by asset type
- Twelve Data provider (stocks/commodities) + CoinGecko provider (crypto fallback) + Binance provider (crypto primary)
- Rate limiting per provider in AppState
- Settings storage in encrypted DB
- `list_all_cache_meta` command: returns provider name per asset from `price_cache_meta`
- Transaction CRUD: add, edit (`update_transaction`), soft-delete, lock/unlock
- `TxType` is `"buy" | "sell"` only — snapshot type removed and migrated away

### Frontend
- Auth flow: Loading → Setup/Unlock → AppShell
- Dashboard: Binance-style layout — PortfolioHeader (total value + 24h badge + P&L badge), PortfolioChart (area, time ranges), AllocationBar (stacked % bar + legend), HoldingsTable (Holdings/Value/P&L/Alloc columns, tracked assets dimmed)
- HoldingsTable: LONG (green) / SHORT (red) badge in Symbol column derived from `netQty`; no 24h column; `min-w-[700px]`
- Asset detail: candlestick/line chart toggle, refresh, inline delete confirmation
- Add Asset dialog: search/autocomplete, Initial Purchase section (By Quantity/Total/Conversion input modes)
- AddTransactionDialog: Year/Month/Day Select dropdowns for date entry (replaces `<input type="date">`); edit mode pre-fills from existing transaction timestamp
- Settings: API key management, refresh interval, about
- Transactions page: BUY/SELL badges only; lock icon always shown (no snapshot exception)
- Asset Manager page: shows all assets (active + deleted); Provider column with colored badge (Binance/Twelve Data/CoinGecko); inline Purge with confirmation
- Dark theme with Tailwind CSS v4 variables
- `priceUtils.ts` — `calcChange(sortedPrices, daysBack)` pure function
- `assetColors.ts` — `buildColorMap(assets)` deterministic per-type color palettes

## Recent Decisions (This Session)
- **Snapshot tx_type removed**: DB migration converts existing `snapshot` rows to `buy`; `TxType = "buy" | "sell"` only; `AssetHoldingSummary` no longer has `snapshot_quantity`; `net_quantity = total_bought - total_sold`; P&L now computed for ALL held assets (no suppression)
- **Date dropdowns**: `<input type="date">` replaced with three Select dropdowns (Year/Month/Day) in AddTransactionDialog; `daysInMonth()` helper makes day count dynamic; day clamps when month/year changes; `YEAR_OPTIONS` spans 1990–now; `MONTH_NAMES` constant for labels
- **LONG/SHORT badges**: derived from `netQty` sign in HoldingsTable Symbol column; no schema change
- **Provider column in Asset Manager**: `list_all_cache_meta` Rust query + command + `listCacheMeta` TS wrapper + `useAllCacheMeta` hook; colored badge per provider
- **24h column removed from HoldingsTable**: cleaner table; `min-w` reduced from 800px to 700px
- **AddAssetDialog "Current Balance" tab removed**: renamed section to "Initial Purchase" only; `purchaseUnknownDate` state removed

## Next Steps (Phase 1 Polish)
1. Run `npm run tauri dev` to verify full app works end-to-end
2. Test with real API keys (Twelve Data for stocks, Binance/CoinGecko for crypto)
3. Fix any runtime issues discovered during testing
4. Consider adding frontend tests for `priceUtils`, `assetColors`
5. Consider adding provider response parsing tests (fixture-based)

## Phase 2 Readiness
Phase 1 must be thoroughly tested before starting Phase 2 (Analytics):
- Transaction log, cost basis, P&L
- Advanced metrics (Sharpe, drawdown, CAGR)
- Benchmark overlays

## Architectural Decisions (Preserved)
- Used `rusqlite` with `bundled-sqlcipher` instead of `tauri-plugin-sql` for full PRAGMA key control
- Used `lightweight-charts` v5 (npm package name, not `@tradingview/lightweight-charts`)
- API keys stored in encrypted DB settings table (not Stronghold yet — simpler for MVP)
- State-based routing (no router library) — just pages with conditional rendering
- Stronghold plugin registered but not actively used (TODO for Phase 2)
