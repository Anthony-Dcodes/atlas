# CLAUDE-decisions.md — Architecture Decisions & Rationale

## Stack Decisions (Final — Do Not Revisit)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop framework | Tauri 2 | Local-only, minimal footprint, Rust backend, no Electron overhead |
| DB encryption | SQLCipher (tauri-plugin-sql sqlcipher feature) | Transparent file-level encryption, PRAGMA key flow |
| API key storage | Tauri Stronghold | OS-native secure storage, keys never touch renderer |
| Chart library | @tradingview/lightweight-charts v4 | Best-in-class financial charts, MIT license, performant |
| State management | Zustand v5 | Minimal, no boilerplate, works well with React 19 |
| Async data fetching | TanStack Query v5 | Cache invalidation, background refetch, devtools |
| UI base | shadcn/ui + Tailwind CSS v4 | Unstyled primitives, full control, Tailwind-native |
| Error handling (Rust) | anyhow | ergonomic, context-chain, converts cleanly to String at boundary |
| HTTP client | reqwest (TLS enabled) | Async, well-maintained, HTTPS enforced |
| Key derivation | Argon2id | Memory-hard, resistant to brute-force on passphrase |

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

### Frontend never receives raw API keys
**Decision:** API keys written to Stronghold from Settings UI, retrieved only in Rust commands.
**Rationale:** Renderer process is a higher attack surface. Keys must not be serialisable to JS.

### Phase gating
**Decision:** Phase 1 must be complete and stable before Phase 2 work begins.
**Rationale:** Prevents scope creep and ensures the core (encryption, data fetch, display) is solid before adding analytics complexity.

## CSP Status
**Current state:** CSP is `null` in `tauri.conf.json` (template default).
**Required:** Set a strict CSP before Phase 1 is considered complete. `eval` must be disabled.
