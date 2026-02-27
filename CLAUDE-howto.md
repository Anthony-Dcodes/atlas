# Claude Code — How Your Setup Works

A quick reference for the commands, skills, agents, hooks, and MCP tools configured in this project.

---

## The Four Things You Can Invoke

| Type | How to trigger | Lives in |
|------|----------------|----------|
| **Commands** | `/name` in chat | `.claude/commands/` |
| **Skills** | `/name` in chat (expanded before execution) | `.claude/skills/` |
| **Agents** | Claude picks them automatically, or you mention the task | `.claude/agents/` |
| **MCP tools** | Claude picks them automatically | `.claude/mcp/` |

---

## 1. Slash Commands `/`

Type `/` followed by the command name. Claude executes the prompt template defined in the file.

### Commands you have configured

```
/anthropic:update-memory-bank       → Update CLAUDE.md and memory bank files
/anthropic:apply-thinking-to        → Apply extended thinking to a specific problem
/anthropic:convert-to-todowrite...  → Reformat a complex prompt as a TodoWrite task list

/architecture:explain-architecture-pattern  → Explain an architectural pattern in your code

/ccusage:ccusage-daily              → Show today's Claude Code token/cost usage

/cleanup:cleanup-context            → Trim and reorganize memory bank context

/documentation:create-readme-section  → Write a README section
/documentation:create-release-note    → Generate a release note from recent changes

/promptengineering:batch-operations-prompt       → Template for batch operations
/promptengineering:convert-to-test-driven-prompt → Reframe a task as TDD

/refactor:refactor-code             → Analyze code and propose refactor plan

/security:security-audit            → Full OWASP-aligned security audit
/security:check-best-practices      → Quick best-practices check
/security:secure-prompts            → Analyze prompts for injection risks
```

> **Tip:** Namespaced commands use the folder name as prefix. `/security:security-audit` lives at `.claude/commands/security/security-audit.md`.

---

## 2. Skills `/`

Skills look identical to commands from your side — you type `/name`. The difference internally is that a skill is **expanded into a full prompt** before Claude runs it, and they're designed to be reusable tools rather than one-shot templates.

### Skills you have configured

| Skill | What it does |
|-------|--------------|
| `/claude-docs-consultant` | Fetches the right page from `docs.claude.com` for whatever Claude Code feature you're asking about (hooks, MCP, skills, subagents, etc.) |
| `/consult-zai` | Sends your question to the Z.ai GLM 4.7 model and brings back its answer alongside Claude's |
| `/consult-codex` | Same but uses OpenAI Codex (GPT-5.2) for a second opinion |

**When to use them:**
- `/claude-docs-consultant` → "How do hooks work exactly?" or "What's the skill file format?"
- `/consult-zai` or `/consult-codex` → When you want a second AI perspective on a hard code question

---

## 3. Agents (Subagents)

You don't invoke these directly — Claude launches them automatically when your request matches their description. Each runs in its own context with a specific tool subset.

### Agents you have configured

| Agent | Triggered when... |
|-------|------------------|
| **memory-bank-synchronizer** | You ask to sync/update memory bank docs with actual code, or Claude proactively notices docs are stale |
| **code-searcher** | You need comprehensive codebase analysis, forensic code mapping, or Chain of Draft (CoD) methodology for security/pattern analysis |
| **ux-design-expert** | You ask about UX, UI design, Tailwind layouts, Highcharts, or design systems |
| **codex-cli** | You explicitly want GPT-5.2's perspective on code (used by `/consult-codex`) |
| **zai-cli** | You explicitly want GLM 4.7's perspective on code (used by `/consult-zai`) |
| **get-current-datetime** | Claude needs the current date/time |

**You can also ask for them explicitly:**
> "Use the code-searcher agent to map all authentication flows"
> "Run the memory-bank-synchronizer"

---

## 4. Hooks

Hooks are shell commands that fire automatically on Claude Code events. You have one configured:

**Event:** `Stop` (fires when a Claude session ends)
**Action:** macOS desktop notification showing which project just finished

```
terminal-notifier -title 'Claude Code' -subtitle 'Session Complete'
  -message "Finished working in <project-folder>" -sound default
```

You don't do anything — it fires on its own. Hooks are configured in `.claude/settings.json`.

---

## 5. MCP Servers

MCP (Model Context Protocol) gives Claude access to external tools at runtime.

| Server | What it unlocks |
|--------|----------------|
| **chrome-devtools** | Claude can open a browser, inspect the DOM, read console errors, take screenshots of your running app |

**When it's useful:** "Check what the portfolio chart actually looks like in the browser" or debugging a visual bug without you screenshotting manually.

---

## Key Settings at a Glance

| Setting | Value | Where |
|---------|-------|-------|
| Default model | Sonnet (this project) | `.claude/settings.json` |
| Global model | Opus 4.6 | `~/.claude/settings.json` |
| Default mode | Plan (asks before acting) | `.claude/settings.local.json` |
| Bash timeout | 5 min (max 10 min) | `.claude/settings.local.json` |
| Session end notification | macOS terminal-notifier | `.claude/settings.json` (hooks) |
| LSP plugin | rust-analyzer | `~/.claude/settings.json` |

---

## Quick Usage Examples

```
# Run a security audit on the codebase
/security:security-audit

# Update memory bank after big changes
/anthropic:update-memory-bank

# Get official docs on how hooks work
/claude-docs-consultant
→ then ask: "show me the hooks documentation"

# Get a second AI opinion on a complex Rust question
/consult-codex
→ then ask your question

# Ask Claude to use the code searcher explicitly
"Use the code-searcher agent to find all places we call invoke() directly in components"

# Sync memory bank with current code reality
"Run the memory-bank-synchronizer agent"
```

---

## File Locations

```
~/.claude/
  settings.json          ← global settings (model, plugins)

.claude/                 ← project-specific (Atlas)
  settings.json          ← project model, hooks, cleanup period
  settings.local.json    ← permissions, env vars (gitignored)
  commands/              ← your slash commands
  skills/                ← your skills (invoked same as commands)
  agents/                ← subagent definitions
  mcp/                   ← MCP server configs
```
