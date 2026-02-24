# CLAUDE-activeContext.md — Active Session Context

## Current Phase
**Phase 1 — MVP** — Core implemented, bug fixes committed & pushed. Next: crypto chart fix + transaction logging.

## Current State
- Full Tauri 2 + React 19 + TypeScript app with working architecture
- Backend: auth, assets, prices, settings commands all implemented
- Frontend: Dashboard with portfolio chart, asset cards, add/remove assets, settings page
- Providers: Twelve Data (stocks) and CoinGecko (crypto) implemented with rate limiting
- DB: SQLCipher-encrypted, Argon2id key derivation, schema migrations on both create and unlock
- Tests: 22 Rust + 19 frontend tests passing
- Bug fix commit pushed: `471da7b` on main

## Next Task: Crypto Chart Fix + Transaction Logging

**Plan file:** `.claude/plans/quiet-dreaming-star.md` — fully detailed, ready for approval and implementation.

### Part A: Fix crypto chart display (small)
- CoinGecko only returns close prices → candlestick charts show flat doji candles
- Fix: Add `hasRealOHLC()` helper in `toChartData.ts`, auto-default to line chart when OHLCV data is missing
- Files: `src/lib/utils/toChartData.ts`, `src/components/charts/AssetChart.tsx`, tests

### Part B: Transaction/order logging (full-stack feature)
- User wants to log buy/sell orders with asset, time, price USD, quantity
- Full stack: DB schema → Rust models/queries/commands → TS types/wrappers/hooks → UI components
- New table: `transactions` (id, asset_id, tx_type buy/sell, quantity, price_usd, ts, notes, created_at, deleted_at)
- New components: AddTransactionDialog, TransactionList, HoldingSummary
- Integration point: `AssetDetail.tsx` — transactions section below the price chart
- Key files to create:
  - `src-tauri/src/db/queries/transactions.rs`
  - `src-tauri/src/commands/transactions.rs`
  - `src/lib/tauri/transactions.ts`
  - `src/hooks/useTransactions.ts`
  - `src/components/portfolio/AddTransactionDialog.tsx`
  - `src/components/portfolio/TransactionList.tsx`
  - `src/components/portfolio/HoldingSummary.tsx`

## Remaining Phase 1 Work (after above)
- [ ] Stronghold integration for API key storage
- [ ] Set strict CSP in `tauri.conf.json`
- [ ] Alpha Vantage provider for commodities/macro data
- [ ] Visual polish and error state handling

## Recent Bug Fixes (Feb 2026) — Committed
1. OHLCVRow Decimal→f64 (fixed JSON serialization breaking charts)
2. Dashboard hooks-in-loop violation (React crash on asset count change)
3. Empty API key guard in fetch_prices
4. CoinGecko Box::leak memory leak
5. Missing migrations on unlock_db
6. Dead SQL branch in get_prices
7. User-Agent headers on both providers
8. Removed rust_decimal dependency
