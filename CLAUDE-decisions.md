# CLAUDE-decisions.md — Architecture Decisions & Rationale

## Stack Decisions (Final — Do Not Revisit)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop framework | Tauri 2 | Local-only, minimal footprint, Rust backend, no Electron overhead |
| DB encryption | SQLCipher via `rusqlite` with `bundled-sqlcipher` feature | Transparent file-level encryption, PRAGMA key flow |
| API key storage | Encrypted DB settings table (Stronghold planned for Phase 2) | Keys stored in SQLCipher-encrypted DB, never exposed to renderer |
| Chart library | `lightweight-charts` v4 | Best-in-class financial charts, MIT license, performant |
| State management | Zustand v5 | Minimal, no boilerplate, works well with React 19 |
| Async data fetching | TanStack Query v5 | Cache invalidation, background refetch, devtools |
| UI base | shadcn/ui + Tailwind CSS v4 | Unstyled primitives, full control, Tailwind-native |
| Error handling (Rust) | anyhow | Ergonomic, context-chain, converts cleanly to String at boundary |
| HTTP client | reqwest (rustls-tls, no default features) | Async, well-maintained, HTTPS enforced |
| Key derivation | Argon2id (argon2 crate) | Memory-hard, resistant to brute-force on passphrase |
| Price data types | `f64` (not `rust_decimal`) | DB stores REAL, JSON serializes as number, no conversion overhead |

## Architectural Decisions

### No backend server
**Decision:** Everything runs locally. No cloud sync, no telemetry, no accounts.
**Rationale:** Trust and privacy. Users keep financial data on their own machine.

### Adapter pattern for market data providers
**Decision:** All providers implement `MarketDataProvider` trait.
**Rationale:** Swap providers without touching core logic. Free tiers have strict limits; users may want to configure their own keys.

### DB access through typed query functions only
**Decision:** No inline SQL in commands. All queries in `db/queries/`.
**Rationale:** Testability, compile-time checking, single source of truth for schema assumptions.

### Passphrase never stored
**Decision:** Passphrase derived via Argon2id → used as PRAGMA key → held in memory for session only.
**Rationale:** If the DB file is stolen, it cannot be decrypted without the passphrase.

### f64 over Decimal for price data
**Decision:** Use `f64` for all OHLCV price fields instead of `rust_decimal::Decimal`.
**Rationale:** DB stores REAL (f64 natively), serde serializes f64 as JSON numbers (Decimal serializes as strings with default serde). Eliminates unnecessary Decimal↔f64 conversions in every DB read/write. Financial precision is adequate for display-only portfolio tracking (no transaction math yet).

### API keys in encrypted DB (not Stronghold yet)
**Decision:** API keys stored in the `settings` table within the SQLCipher-encrypted DB.
**Rationale:** Stronghold integration is deferred. Keys are still encrypted at rest since the entire DB is SQLCipher-encrypted. Keys are never sent to the renderer. This is acceptable for Phase 1; Stronghold adds defense-in-depth for Phase 2.

### Migrations run on both create and unlock
**Decision:** `unlock_db()` calls `run_migrations()` (idempotent `CREATE TABLE IF NOT EXISTS`).
**Rationale:** Ensures existing users get schema updates when the app is upgraded. Without this, only `create_db()` ran migrations and existing DBs would never get new tables/columns.

### Phase gating
**Decision:** Phase 1 must be complete and stable before Phase 2 work begins.
**Rationale:** Prevents scope creep and ensures the core (encryption, data fetch, display) is solid before adding analytics complexity.

## CSP Status
**Current state:** CSP is `null` in `tauri.conf.json` (template default).
**Required:** Set a strict CSP before Phase 1 is considered complete. `eval` must be disabled.
