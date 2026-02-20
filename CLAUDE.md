# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full dev environment (Tauri + Vite hot reload)
npm run tauri dev

# Production build
npm run tauri build

# Frontend only (TypeScript check + Vite bundle)
npm run build

# Rust backend (run from src-tauri/)
cargo build
cargo clippy         # lint
cargo test           # unit tests (once test modules are added)
```

> **Note:** Vitest and Rust test modules are not yet configured. Add vitest to devDependencies for frontend tests, and `#[cfg(test)]` modules in each Rust file as the implementation grows.

## AI Guidance

* Ignore GEMINI.md and GEMINI-*.md files
* To save main context space, for code searches, inspections, troubleshooting or analysis, use code-searcher subagent where appropriate - giving the subagent full context background for the task(s) you assign it.
* ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.
* After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding. Use your thinking to plan and iterate based on this new information, and then take the best next action.
* After completing a task that involves tool use, provide a quick summary of what you've done.
* For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.
* Before you finish, please verify your solution
* Do what has been asked; nothing more, nothing less.
* NEVER create files unless they're absolutely necessary for achieving your goal.
* ALWAYS prefer editing an existing file to creating a new one.
* NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
* If you create any temporary new files, scripts, or helper files for iteration, clean up these files by removing them at the end of the task.
* When you update or modify core context files, also update markdown documentation and memory bank
* When asked to commit changes, exclude CLAUDE.md and CLAUDE-*.md referenced memory bank system files from any commits. Never delete these files.

<investigate_before_answering>
Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.
</investigate_before_answering>

<do_not_act_before_instructions>
Do not jump into implementatation or changes files unless clearly instructed to make changes. When the user's intent is ambiguous, default to providing information, doing research, and providing recommendations rather than taking action. Only proceed with edits, modifications, or implementations when the user explicitly requests them.
</do_not_act_before_instructions>

<use_parallel_tool_calls>
If you intend to call multiple tools and there are no dependencies between the tool calls, make all of the independent tool calls in parallel. Prioritize calling tools simultaneously whenever the actions can be done in parallel rather than sequentially. For example, when reading 3 files, run 3 tool calls in parallel to read all 3 files into context at the same time. Maximize use of parallel tool calls where possible to increase speed and efficiency. However, if some tool calls depend on previous calls to inform dependent values like the parameters, do NOT call these tools in parallel and instead call them sequentially. Never use placeholders or guess missing parameters in tool calls.
</use_parallel_tool_calls>

## Memory Bank System

This project uses a structured memory bank system with specialized context files. Always check these files for relevant information before starting work:

### Core Context Files

* **CLAUDE-activeContext.md** - Current session state, goals, and progress (if exists)
* **CLAUDE-patterns.md** - Established code patterns and conventions (if exists)
* **CLAUDE-decisions.md** - Architecture decisions and rationale (if exists)
* **CLAUDE-troubleshooting.md** - Common issues and proven solutions (if exists)
* **CLAUDE-config-variables.md** - Configuration variables reference (if exists)
* **CLAUDE-temp.md** - Temporary scratch pad (only read when referenced)

**Important:** Always reference the active context file first to understand what's currently being worked on and maintain session continuity.

### Memory Bank System Backups

When asked to backup Memory Bank System files, you will copy the core context files above and @.claude settings directory to directory @/path/to/backup-directory. If files already exist in the backup directory, you will overwrite them.

## Claude Code Official Documentation

When working on Claude Code features (hooks, skills, subagents, MCP servers, etc.), use the `claude-docs-consultant` skill to selectively fetch official documentation from docs.claude.com.

## Project Overview

# Atlas Project — Claude Coding Guide

## Project Overview

Atlas is a lightweight, local-first, open-source portfolio dashboard desktop application built with Tauri 2.0. Users add and track stocks, crypto, and commodities in a single encrypted local database — no accounts, no telemetry, no cloud dependency. The app fetches price data on demand from configured providers (Twelve Data primary, CoinGecko for crypto, Alpha Vantage for macro/commodities), caches everything locally in a SQLCipher-encrypted SQLite database, and renders interactive financial charts using TradingView Lightweight Charts. The goal is a fast, private, extensible tool that works fully offline after initial data fetches. Non-goals: web deployment, mobile support, social features, brokerage integration, real-time streaming.

---

## Core Principles & Constraints

- **Security-first**: All data encrypted at rest via SQLCipher. API keys stored in OS credential store via Tauri Stronghold. Strict CSP. Sandboxed WebView. HTTPS only. No plain-text secrets anywhere — not in logs, not in state, not in the renderer.
- **Local-only**: No backend server, no cloud sync, no telemetry. Single `.db` file in app data dir — portable and user-backupable.
- **Lightweight**: Minimize dependencies. Prefer native Rust for backend logic. Keep bundle small. No heavy runtimes or unnecessary abstraction layers.
- **One phase at a time**: Build Phase 1 fully before touching Phase 2. Do not scaffold Phase 3 code prematurely.
- **Open-source friendly**: Permissive licenses only. Code must be readable and self-documenting without excessive comments.
- **Adapter pattern for providers**: All data provider logic behind a Rust trait — swappable without touching core logic.
- **TypeScript strict everywhere**: `strict: true`. No `any`. No `@ts-ignore` without an explicit justification comment.
- **Do not deviate from the stack**: The stack is final. Do not suggest or introduce alternative frameworks, databases, or UI libraries.

---

## Tech Stack & Versions

**Frontend**
- React `^19` + Vite `^7` + TypeScript `^5` (strict)
- Tailwind CSS `^4`
- shadcn/ui (latest — install components individually via CLI)
- `@tradingview/lightweight-charts` `^4`
- Zustand `^5` (global client state)
- TanStack Query `^5` (async fetching, cache invalidation)
- `@tauri-apps/api` `^2`

**Backend (Rust / Tauri)**
- `tauri ^2`
- `tauri-plugin-sql` (with `sqlcipher` feature flag — not default sqlite)
- `tauri-plugin-stronghold ^2`
- `tokio` (async runtime)
- `serde` + `serde_json`
- `anyhow` (error handling)
- `reqwest` (HTTP, TLS enabled)
- `chrono` (date/time)

**Folder Structure**
```
atlas/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs                 # Tauri builder, plugin registration, invoke_handler
│       ├── state.rs                # AppState struct (DB pool, rate limit counters)
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── assets.rs           # add_asset, remove_asset, list_assets
│       │   ├── prices.rs           # fetch_prices, refresh_asset
│       │   └── settings.rs         # save_api_key, get_setting
│       ├── db/
│       │   ├── mod.rs              # DB init, passphrase unlock, migration runner
│       │   ├── schema.rs           # CREATE TABLE statements
│       │   └── queries/            # typed query functions per domain
│       ├── providers/
│       │   ├── mod.rs              # MarketDataProvider trait definition
│       │   ├── twelve_data.rs
│       │   ├── coingecko.rs
│       │   └── alpha_vantage.rs
│       └── models.rs               # shared Rust structs (OHLCVRow, Asset, etc.)
└── src/
    ├── components/
    │   ├── ui/                     # shadcn auto-generated
    │   ├── charts/                 # LightweightCharts wrappers
    │   ├── portfolio/              # AssetCard, PortfolioSummary, etc.
    │   └── layout/                 # AppShell, Sidebar, Header
    ├── hooks/                      # useAssets, usePrices, useChart, etc.
    ├── lib/
    │   ├── tauri/                  # typed invoke() wrappers (never call invoke directly in components)
    │   └── utils/                  # formatCurrency, toChartData, dateHelpers
    ├── stores/                     # Zustand stores
    ├── types/                      # shared TS types mirroring Rust models
    └── pages/                      # Dashboard, AssetDetail, Settings
```

---

## Current Implementation State

This is a **pre-Phase 1 scaffold** — only the Tauri 2 + React 19 template boilerplate exists. No domain code has been implemented yet.

**What actually exists on disk:**
- `src/App.tsx` — Tauri template greeting demo (to be replaced entirely)
- `src-tauri/src/lib.rs` — single `greet` command (to be replaced)

**The folder structure and architecture in this document is the target design**, not current reality. None of the following exist yet:
- `src-tauri/src/commands/`, `db/`, `providers/`, `state.rs`, `models.rs`
- `src/components/`, `stores/`, `hooks/`, `lib/`, `types/`, `pages/`
- Missing frontend deps: Tailwind, shadcn/ui, Lightweight Charts, Zustand, TanStack Query
- Missing Rust deps: tauri-plugin-sql (sqlcipher), tauri-plugin-stronghold, tokio, reqwest, chrono, anyhow

---

## Key Features Roadmap (Phased)

**Phase 1 — MVP (current focus)**
- First-run passphrase setup → DB initialisation + encryption
- Add/remove assets by ticker (stocks, crypto, commodities)
- Fetch and cache historical OHLCV from Twelve Data (primary) or CoinGecko (crypto fallback)
- Portfolio overview: combined area chart + per-asset candlestick/line toggle
- Asset info card: current price, 24h/7d/30d/1Y change
- Settings: encrypted API key management, provider selection, refresh interval

**Phase 2 — Analytics (after Phase 1 is complete and stable)**
- Transaction log: buy/sell with date, quantity, price
- Cost basis + unrealised P&L per asset and portfolio total
- Advanced metrics: Sharpe ratio, max drawdown, CAGR, correlation matrix
- Benchmark overlays: S&P 500, Gold, CPI/inflation (Alpha Vantage macro endpoints)
- Simulated portfolio comparison

**Phase 3 — Research Layer (future, do not build now)**
- News feed per asset
- AI-powered price movement explanations via Claude API
- Macro event overlays on charts

---

## Data Flow & Architecture

```
User action (add asset / manual refresh / scheduled interval)
  → frontend calls typed invoke wrapper in src/lib/tauri/
  → Rust command checks price_cache_meta (last_fetched + staleness threshold)
  → If stale: select active provider → call external API with retry/backoff
  → Parse + validate response → upsert into historical_prices
  → Return Vec<OHLCVRow> to frontend
  → toChartData() transforms to Lightweight Charts format
  → chart.setData() or chart.update() renders result
```

**DB Schema (SQLCipher)**
```sql
CREATE TABLE assets (
  id          TEXT PRIMARY KEY,        -- UUID v4
  symbol      TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  asset_type  TEXT NOT NULL CHECK(asset_type IN ('stock','crypto','commodity')),
  currency    TEXT NOT NULL DEFAULT 'USD',
  added_at    INTEGER NOT NULL         -- Unix timestamp (seconds)
);

CREATE TABLE historical_prices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id    TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  ts          INTEGER NOT NULL,        -- Unix timestamp, daily close (seconds)
  open        REAL, high REAL, low REAL, close REAL NOT NULL, volume REAL,
  UNIQUE(asset_id, ts)
);

CREATE TABLE price_cache_meta (
  asset_id      TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  last_fetched  INTEGER NOT NULL       -- Unix timestamp
);

CREATE TABLE settings (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL          -- JSON string; sensitive values never stored here
);
```

**OHLCV → Lightweight Charts**
```typescript
import type { CandlestickData, UTCTimestamp } from '@tradingview/lightweight-charts'

export const toChartData = (rows: OHLCVRow[]): CandlestickData[] =>
  rows
    .sort((a, b) => a.ts - b.ts)
    .map(r => ({
      time: r.ts as UTCTimestamp,      // seconds, NOT milliseconds
      open: r.open, high: r.high, low: r.low, close: r.close,
    }))
```

---

## Security & Encryption Details

**Passphrase & SQLCipher Flow**
1. First run: user sets passphrase → Rust derives key with Argon2id → passed as `PRAGMA key` immediately after DB open → never stored to disk
2. Subsequent runs: user enters passphrase → same derivation → DB unlocked → key held in memory for session only, wiped on app close
3. DB file location: `tauri::api::path::app_data_dir()` — never exposed to the renderer process

**API Key Storage**
- User enters keys in Settings UI → `invoke("save_api_key", { provider, key })` → Rust writes to Stronghold vault
- Keys retrieved in Rust commands only — never serialised back to frontend, never logged
- If Stronghold unavailable: fallback to OS keychain via platform-appropriate crate

**Threat Model**
- Protects against: physical device access, accidental key exposure in git/logs, renderer-level injection
- Does not protect against: malware with admin/root privileges, user-disclosed passphrase
- WebView: `eval` disabled, `dangerouslySetInnerHTML` banned, CSP set in `tauri.conf.json`

---

## Coding Style & Best Practices

**TypeScript**
- `strict: true`, `noUncheckedIndexedAccess: true`. No `any`. No implicit returns.
- All `invoke()` calls live in `src/lib/tauri/` as typed functions — components never call `invoke` directly
- Rust errors serialised as `{ error: string }` — frontend always checks before consuming

**React Components**
- Functional components only. Data fetching logic in custom hooks, not components.
- shadcn/ui is the base — extend via `className` props, never override generated files directly.
- One `useEffect` per chart instance; always call `chart.remove()` in cleanup; use `ResizeObserver` for responsiveness

**Rust Commands**
```rust
#[tauri::command]
async fn fetch_prices(
    symbol: String,
    asset_type: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<OHLCVRow>, String> {
    prices::fetch_and_cache(&symbol, &asset_type, &state)
        .await
        .map_err(|e| e.to_string())   // anyhow::Error → String at boundary
}
```
- Use `anyhow::Result` internally; convert to `String` only at the Tauri command boundary
- All DB access through typed functions in `db/queries/` — no inline SQL in commands
- Provider trait: `async fn fetch_ohlcv(&self, symbol: &str, range: DateRange) -> anyhow::Result<Vec<OHLCVRow>>`

**Testing**
- Rust: `#[cfg(test)]` unit tests in each module for query functions and provider parsers
- Frontend: Vitest for hooks, utility functions, and data transformers
- E2E: Tauri WebDriver for critical flows (first-run passphrase, add asset, chart render)

---

## Prompting Guidelines for Future Sessions

**Every follow-up prompt must include:**
1. Reference: *"Following Atlas CLAUDE.md guidelines exactly..."*
2. Current phase: *"Phase 1 — MVP"*
3. Files to read before implementing (be specific)
4. Testable success criteria
5. Explicit out-of-scope items: *"Do not modify the DB schema"*, *"No new dependencies"*

**Template:**
```
Following Atlas CLAUDE.md guidelines exactly, implement [feature name].

Phase: 1 (MVP)
Read first: [list of file paths]
Success criteria:
  - Rust command returns [X] given [Y]
  - Component renders [Z] when data loads
  - Error state handled by showing [...]
Do not: modify schema, add dependencies, touch Phase 2 files
```

---

## Common Gotchas & Solutions

**Tauri**
- Register every new Rust command in `lib.rs` inside `tauri::generate_handler![...]` or it silently does nothing (`main.rs` just calls `lib::run()` — all setup lives in `lib.rs`)
- `app_data_dir()` is async — resolve once at startup and store in `AppState`
- Window labels must be unique, lowercase, alphanumeric — use `"main"` for primary
- Set `"withGlobalTauri": false` in config — use ES module imports from `@tauri-apps/api` only

**Lightweight Charts**
- Create chart instance only after the container `div` is mounted (check ref is not null in `useEffect`)
- `time` values must be Unix seconds (`UTCTimestamp`) — not milliseconds. Divide by 1000 if converting from JS `Date`
- Dark mode: subscribe to Tauri's theme change event and call `chart.applyOptions({ layout: { background: { color: '#0f0f0f' } } })`
- Memory leak: always call `chart.remove()` in the `useEffect` return cleanup function

**SQLCipher in Rust**
- Enable `sqlcipher` feature flag in `Cargo.toml`, not the default `sqlite` — they are mutually exclusive builds
- Send `PRAGMA key = 'passphrase'` as the very first statement after opening the connection
- Run schema migrations inside Rust on DB init — never from the frontend

**Rate Limiting**
- Track per-provider request timestamps in `AppState` with `tokio::sync::Mutex<VecDeque<Instant>>`
- Twelve Data free: 8 req/min — enforce in Rust before every outbound call
- CoinGecko free: ~30 req/min, no key — use 60s TTL for spot prices, 24h TTL for daily history
- Alpha Vantage free: 25 req/day — reserve exclusively for macro endpoints (CPI, GDP, yields) that update monthly

---

*Atlas should be the tool users trust with their most sensitive financial data and open every morning without hesitation. Every line of code should reflect that responsibility. Let's build something excellent.*


## ALWAYS START WITH THESE COMMANDS FOR COMMON TASKS

**Task: "List/summarize all files and directories"**

```bash
fd . -t f           # Lists ALL files recursively (FASTEST)
# OR
rg --files          # Lists files (respects .gitignore)
```

**Task: "Search for content in files"**

```bash
rg "search_term"    # Search everywhere (FASTEST)
```

**Task: "Find files by name"**

```bash
fd "filename"       # Find by name pattern (FASTEST)
```

### Directory/File Exploration

```bash
# FIRST CHOICE - List all files/dirs recursively:
fd . -t f           # All files (fastest)
fd . -t d           # All directories
rg --files          # All files (respects .gitignore)

# For current directory only:
ls -la              # OK for single directory view
```

### BANNED - Never Use These Slow Tools

* ❌ `tree` - NOT INSTALLED, use `fd` instead
* ❌ `find` - use `fd` or `rg --files`
* ❌ `grep` or `grep -r` - use `rg` instead
* ❌ `ls -R` - use `rg --files` or `fd`
* ❌ `cat file | grep` - use `rg pattern file`

### Use These Faster Tools Instead

```bash
# ripgrep (rg) - content search
rg "search_term"                # Search in all files
rg -i "case_insensitive"        # Case-insensitive
rg "pattern" -t py              # Only Python files
rg "pattern" -g "*.md"          # Only Markdown
rg -1 "pattern"                 # Filenames with matches
rg -c "pattern"                 # Count matches per file
rg -n "pattern"                 # Show line numbers
rg -A 3 -B 3 "error"            # Context lines
rg " (TODO| FIXME | HACK)"      # Multiple patterns

# ripgrep (rg) - file listing
rg --files                      # List files (respects •gitignore)
rg --files | rg "pattern"       # Find files by name
rg --files -t md                # Only Markdown files

# fd - file finding
fd -e js                        # All •js files (fast find)
fd -x command {}                # Exec per-file
fd -e md -x ls -la {}           # Example with ls

# jq - JSON processing
jq. data.json                   # Pretty-print
jq -r .name file.json           # Extract field
jq '.id = 0' x.json             # Modify field
```

### Search Strategy

1. Start broad, then narrow: `rg "partial" | rg "specific"`
2. Filter by type early: `rg -t python "def function_name"`
3. Batch patterns: `rg "(pattern1|pattern2|pattern3)"`
4. Limit scope: `rg "pattern" src/`

### INSTANT DECISION TREE

```
User asks to "list/show/summarize/explore files"?
  → USE: fd . -t f  (fastest, shows all files)
  → OR: rg --files  (respects .gitignore)

User asks to "search/grep/find text content"?
  → USE: rg "pattern"  (NOT grep!)

User asks to "find file/directory by name"?
  → USE: fd "name"  (NOT find!)

User asks for "directory structure/tree"?
  → USE: fd . -t d  (directories) + fd . -t f  (files)
  → NEVER: tree (not installed!)

Need just current directory?
  → USE: ls -la  (OK for single dir)
```
