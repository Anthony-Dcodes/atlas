# CLAUDE-activeContext.md — Active Session Context

## Current Phase
**Pre-Phase 1** — Project scaffolded, no implementation begun.

## Current State
- Fresh Tauri 2 + React 19 + TypeScript template
- Only the default `greet` command exists in `src-tauri/src/lib.rs`
- Only `src/App.tsx` template UI exists
- No dependencies beyond the bare Tauri/React scaffold installed

## Next Steps for Phase 1 MVP
1. Install frontend deps: Tailwind CSS v4, shadcn/ui, Zustand v5, TanStack Query v5, @tradingview/lightweight-charts v4
2. Install Rust deps: tauri-plugin-sql (sqlcipher), tauri-plugin-stronghold, tokio, reqwest, anyhow, chrono
3. Create DB schema and init logic in `src-tauri/src/db/`
4. Implement first-run passphrase setup flow
5. Build `add_asset` / `list_assets` / `remove_asset` commands
6. Build `fetch_prices` command with provider trait
7. Build portfolio overview UI (chart + asset cards)
8. Build Settings page (API key management)

## Active Goals
- None in progress — awaiting first implementation task

## Recent Decisions
- Memory bank files created to track progress as implementation begins
- CLAUDE.md updated with: Commands section, Current Implementation State section, Vite version fix (^7), lib.rs vs main.rs clarification
