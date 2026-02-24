# CLAUDE-activeContext.md — Active Session Context

## Current Phase
**Phase 1 — MVP** — Core implemented. Crypto chart fix + transaction logging feature completed.

## Current State
- Full Tauri 2 + React 19 + TypeScript app with working architecture
- Backend: auth, assets, prices, settings, **transactions** commands all implemented
- Frontend: Dashboard with portfolio chart, asset cards, add/remove assets, settings page, **transaction logging**
- Providers: Twelve Data (stocks) and CoinGecko (crypto) implemented with rate limiting
- DB: SQLCipher-encrypted, Argon2id key derivation, schema migrations on both create and unlock
- Tests: **28 Rust + 22 frontend tests** passing
- Crypto charts auto-default to line mode when OHLC data is missing

## Completed This Session
1. **Crypto chart fix** — Added `hasRealOHLC()` helper, auto-defaults to line chart for crypto (CoinGecko only returns close), hides candlestick toggle when no OHLC data
2. **Transaction logging** — Full-stack feature:
   - DB: `transactions` table with buy/sell, quantity, price_usd, soft delete
   - Rust: `TxType` enum, `Transaction` + `AssetHoldingSummary` models, query module with 6 unit tests
   - Tauri: 4 commands (`add_transaction`, `list_transactions`, `delete_transaction`, `get_holding_summary`)
   - TS: Types, invoke wrappers, TanStack Query hooks
   - UI: `AddTransactionDialog`, `TransactionList`, `HoldingSummary` components integrated into `AssetDetail`

## Remaining Phase 1 Work
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
