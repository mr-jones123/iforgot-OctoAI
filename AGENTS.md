# AGENTS.md

A guide for AI agents working on the Riza codebase. Read this first before making changes.

---

## What is Riza

**Riza is ClickUp for AI Agents.**

ClickUp gives you a kanban board for assigning tasks. Riza turns that into a desktop app where the team is Claude Code, Codex, Gemini, and Ollama. Each card spawns a real interactive CLI agent in an embedded terminal. You watch, you intervene, you approve. Nothing ships until you say so.

> Named after Azir reversed. Azir, the League of Legends emperor, commands sand soldiers. In Riza, you command AI agents.

The user is the PM. They assign tasks on a kanban board. They press play. Each card spawns a real interactive CLI agent in an embedded terminal. Nothing ships until the user manually moves a card past Review.

---

## Differentiation (Why Riza Exists)

The market is crowded with multi-agent orchestrators (Baton, Parallel Code, Emdash, claude_agent_teams_ui, agentsmesh). They all solve "running agents in parallel." None solve "managing the human watching them."

Riza's seven core differentiators:

1. **Review Column is a Hard Human Gate.** Every other tool moves cards to "done" on process exit. Riza never auto-advances past Review. The user must approve. This is the answer to AI slop: _"We don't automate trust. You shipped it, you own it."_

2. **Column-Based Priority + Hand-Raise Badge.** Columns set priority upfront. When an agent hits a blocker mid-run, it raises its hand. The human decides whether to intervene. No ML, no automated triage.

3. **Git Worktrees by Default.** Every card runs in its own isolated worktree. Agents never stomp each other's files. Approve in Review = merge + cleanup. Reject = discard + back to In Progress.

4. **Task Dependency Linking with Cross-Card Context Injection.** Cards can declare dependencies. Card B is blocked until Card A is Done. When Card B starts, it automatically receives Card A's captured context (files changed, git diff, errors encountered, decisions made) in its prompt. Agents don't need to talk to each other. Context flows through SQLite, curated by the human.

5. **Cost Tracking Per Card.** Every card tracks how much it cost: token usage, API spend, duration. Parsed from PTY output per provider. The user sees at a glance which tasks were expensive, which provider was cheapest for which work type. No competing tool does this.

6. **Design That People Want to Screenshot.** Every competing tool looks like a developer built it for themselves. Riza has a real design system: zinc-950 base, single burnt orange accent (`#e85d2f`), Geist + Geist Mono, asymmetric layouts, motion physics, spotlight cards.

7. **All Execution is PTY-Based, Interactive.** Every card spawns a real terminal the user can type into. No batch mode, no subprocess invocations, no opaque black boxes. The user watches, intervenes, and redirects in real-time. The terminal IS the interface.

When in doubt about a feature decision: optimize for **observability and human accountability**, not autonomy.

---

## Current Architecture

### Process Model

```
Electron Main (Node.js)              Electron Renderer (React + Vite)
─────────────────────────            ───────────────────────────────
spawner.ts                           App.tsx (root state)
  - node-pty per card                  - workspaces[]
  - rolling output buffer              - workspaceStates[wsId]
  - context injection at spawn           - boards[]
                                         - activeBoardId
ipc/index.ts                             - boardCards[boardId]
  - agent:spawn / kill
  - terminal:input / resize / buffer   BoardPage
  - dialog:openFolder                    Sidebar    (workspaces + boards list)
                                         Board      (kanban with dnd-kit)
db/index.ts                               Column → SortableCard → KanbanCard
  - cards, card_events, card_context                                   CardModal
  - (stub, not wired yet)                                              ··· menu (edit/delete)
                                     TerminalPanel (xterm.js + IPC bridge)
git/worktree.ts
  - (stub, not wired yet)           Preload (contextBridge)
                                       window.riza.{agent,terminal,dialog,...}
```

### State Lives in Memory

There is no SQLite yet. All state (workspaces, boards, cards) lives in `App.tsx` `useState`. It dies on app restart. Wiring SQLite is on the roadmap but **do not assume the DB exists**. When adding features, keep state-shaping logic in `App.tsx` so it stays portable to the eventual DB layer.

### Three-Level State Hierarchy

```
Workspace          ← one git repo
  Board (session)  ← e.g. "Frontend", "Bug Fixes", "Testing"
    Card           ← one task assigned to one agent
```

A workspace has many boards. The user creates boards in the sidebar to separate concerns. Switching workspaces preserves each workspace's board state via `workspaceStates: Record<workspaceId, WorkspaceState>` in `App.tsx`.

### Card Lifecycle

```
idle → running → done | failed
              ↘ waiting (hand raised, not implemented yet)
```

- `idle`: created, not started
- `running`: PTY spawned, agent active
- `waiting`: agent emitted a hand-raise signal (TODO, parsed from PTY output)
- `done`: process exited 0 (still requires manual move past Review)
- `failed`: process exited non-zero or spawn errored

---

## Tech Stack

Strict. Do not introduce new frameworks without discussion.

| Layer             | Stack                                                    | Notes                                              |
| ----------------- | -------------------------------------------------------- | -------------------------------------------------- |
| Desktop shell     | Electron 31                                              | `contextIsolation: true`, `nodeIntegration: false` |
| Renderer          | React 18 + Vite 5 + `@vitejs/plugin-react-swc@3.7.x`     | SWC version is pinned to vite 5 compat             |
| Styling           | Tailwind v3 + custom design tokens                       | Dark mode default. No Inter font.                  |
| Drag and drop     | `@dnd-kit/core` + `@dnd-kit/sortable`                    |                                                    |
| Terminal          | `xterm.js` + `xterm-addon-fit` + `xterm-addon-web-links` |                                                    |
| PTY               | `node-pty` (native)                                      | Must run `electron-rebuild` after install          |
| Git               | `simple-git`                                             | Stub today, used for worktrees                     |
| DB                | `better-sqlite3` (native)                                | Stub today                                         |
| Context capture   | PTY output parsing + git diff                            | Automatic context for cross-card injection         |
| Main bundling     | esbuild via `scripts/build-main.mjs`                     | NOT tsc. Aliases + native externals                |
| Renderer bundling | Vite                                                     |                                                    |

**Native modules** (`node-pty`, `better-sqlite3`) are listed as `external` in `scripts/build-main.mjs`. They must be rebuilt against Electron's Node ABI via `postinstall`: `electron-rebuild -f -w node-pty,better-sqlite3`.

---

## Design System (Non-Negotiable)

Before writing any UI, read `/Users/xy/.agents/skills/design-taste-frontend/SKILL.md` if available. Otherwise follow these locked-in tokens:

- **Font**: Geist (sans), Geist Mono (mono). Never Inter. Never serif.
- **Background**: zinc-950 `#09090b`. Never pure black.
- **Accent**: burnt orange `#e85d2f`. **Single accent only.** No purple, no neon glows.
- **Radius**: `rounded-card` (1rem) for cards, `rounded-panel` (1.5rem) for major surfaces.
- **Borders**: `border-surface-border` (zinc-700) for separation, never card-on-card stacking.
- **Shadows**: tinted diffusion only. Never neon outer glows.
- **Icons**: inline SVG primitives. No emojis ever. No Lucide user/egg avatars.
- **Asymmetry**: prefer left-aligned hero text, fractional grids, large negative space. `DESIGN_VARIANCE: 8`.
- **Motion**: spring physics, `cubic-bezier(0.16,1,0.3,1)` for transitions. `MOTION_INTENSITY: 6`.
- **Density**: daily-app spacing. `VISUAL_DENSITY: 4`.
- **Tactile feedback**: `active:scale-[0.97]` or `active:-translate-y-px` on every button.
- **Mobile**: even though it's a desktop app, never use `h-screen`. Use `min-h-[100dvh]`.

Custom CSS classes live in `globals.css`:

- `.spotlight-card` — radial gradient tracking mouse via `--mouse-x` / `--mouse-y` CSS vars set in `onMouseMove`
- `.glass-panel` — frosted glass with inner refraction border
- `.status-dot-{idle|running|waiting|done|failed}` — breathing pulse for status states
- `.skeleton` — shimmer loader

---

## Key Files (Where Things Live)

### Renderer

| File                                                     | What it does                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/renderer/App.tsx`                                   | Root state. Owns workspaces, per-workspace boards, per-board cards. The single source of truth until SQLite lands.                   |
| `src/renderer/pages/WorkspaceSetupPage.tsx`              | First-run + add-workspace modal. Repo path picker, provider selection.                                                               |
| `src/renderer/pages/BoardPage.tsx`                       | Layout shell. Wires Sidebar + Board. Stateless — props only.                                                                         |
| `src/renderer/components/workspace/Sidebar.tsx`          | Left rail (240px). Workspace switcher + board (session) list.                                                                        |
| `src/renderer/components/board/Board.tsx`                | Kanban with dnd-kit. Drag handlers, card CRUD, agent spawn/kill.                                                                     |
| `src/renderer/components/board/Column.tsx`               | One column. Header (run-all, +), droppable card list, opens add modal.                                                               |
| `src/renderer/components/board/SortableCard.tsx`         | dnd-kit useSortable wrapper around KanbanCard.                                                                                       |
| `src/renderer/components/board/KanbanCard.tsx`           | The card itself. Spotlight effect, status dot, play/stop, ··· hover menu.                                                            |
| `src/renderer/components/board/CardModal.tsx`            | Shared create/edit modal. Pass `existing?: Card` for edit mode.                                                                      |
| `src/renderer/components/sessions/SessionsCardModal.tsx` | New-board modal in sidebar. Smaller, single field.                                                                                   |
| `src/renderer/components/terminal/TerminalPanel.tsx`     | xterm.js panel. Slides from right. Replays buffer on mount, then live IPC stream. The primary interface for interacting with agents. |
| `src/renderer/components/board/RaisedHandBadge.tsx`      | Stub. Dynamic Island pill for when agents need attention. Not wired yet.                                                             |
| `src/renderer/globals.d.ts`                              | `window.riza` type declarations. Update when adding IPC channels.                                                                    |
| `src/renderer/globals.css`                               | Tailwind layer + custom utility classes (spotlight, glass, status-dot).                                                              |

### Main

| File                         | What it does                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/main/index.ts`          | Entry. PATH fix for macOS, BrowserWindow creation, registerIpcHandlers.                                                   |
| `src/main/preload.ts`        | contextBridge. Source of truth for `window.riza` shape. Mirror in `globals.d.ts`.                                         |
| `src/main/ipc/index.ts`      | All `ipcMain.handle` and `ipcMain.on` wiring.                                                                             |
| `src/main/agents/spawner.ts` | node-pty spawning. Per-provider command builder. Output buffering. Status events. Context injection from dependent cards. |
| `src/main/git/worktree.ts`   | Stub. Future home of worktree create/diff/merge/remove.                                                                   |
| `src/main/db/index.ts`       | Stub. Future home of SQLite schema + queries (cards, card_events, card_context).                                          |

### Shared

| File                                     | What it does                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `packages/shared/src/types/agent.ts`     | `AgentProvider` union, `AgentConfig`, `AgentStatus`, `AGENT_COMMANDS` map.    |
| `packages/shared/src/types/board.ts`     | `Board`, `Column`, `DEFAULT_COLUMNS`.                                         |
| `packages/shared/src/types/card.ts`      | `Card`, `CardStatus`, `CardCreateInput`.                                      |
| `packages/shared/src/types/channel.ts`   | `Channel`, `Message`. Removed from product. File exists but types are unused. |
| `packages/shared/src/types/workspace.ts` | `Workspace`, `WorkspaceCreateInput`.                                          |

**Important:** Vite/Rollup struggles with `export *` of value-level constants from the shared package. If you need a const like `DEFAULT_COLUMNS` in the renderer, inline it locally instead of importing from `@riza/shared`. Type-only imports work fine.

---

## Agent Spawning (Critical Knowledge)

This was hard-won. Read carefully before touching `spawner.ts`.

### Why each provider has a different invocation

| Provider      | Command                                                    | Why                                                                                                              |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `claude-code` | `claude --dangerously-skip-permissions <prompt>`           | Positional arg loads task into TUI without dropping to print mode.                                               |
| `codex`       | `codex` (bare TUI) + stdin injection                       | Codex's positional arg doesn't pre-fill, must inject.                                                            |
| `gemini`      | `gemini --prompt-interactive <prompt> --yolo --skip-trust` | The `-i` flag is exactly what we need. `--yolo` auto-accepts tools. `--skip-trust` skips workspace trust prompt. |
| `ollama`      | `ollama run <model>` + stdin injection                     | No prompt arg exists.                                                                                            |

### The Stdin Injection Pattern

For providers that don't support a prompt arg, the spawner waits a `BOOT_DELAY_MS` then writes `description + '\r'` to the PTY. Boot delays are tuned per provider (claude 3s, codex/gemini 2s, ollama 1s). If you change anything about how a TUI boots, retest these delays.

### Output Buffering (Don't Break This)

PTY output starts streaming **the moment the process spawns**. If the user opens the terminal panel later, all that output is gone unless we buffered it. The spawner keeps a rolling buffer of up to 2000 chunks per session. The terminal panel calls `window.riza.terminal.buffer(cardId)` on mount to replay everything, then attaches a live listener.

If you ever switch to a streaming-only model, you must guarantee the panel mounts before the PTY starts — currently it doesn't.

### Cross-Card Context Injection

When a card has dependencies and the user clicks Play, the spawner reads the dependent card's captured context from SQLite (files changed, git diff summary, errors, terminal output tail) and prepends it to the new agent's prompt. This gives the new agent full awareness of what prior agents did, without requiring agents to talk to each other.

Context is captured automatically:

- **Git diff** from the card's worktree after file changes
- **Terminal output** tail (last N lines of the PTY buffer)
- **Structured events** parsed from PTY output (file edits, errors, test results)
- **Manual notes** the user can add during Review

All execution is PTY-based. There is no subprocess/batch mode. Every card is interactive, every card can be intervened on by the user.

### macOS PATH

Electron strips the shell PATH on macOS. `src/main/index.ts` patches `process.env.PATH` at startup with hard-coded common locations (homebrew, `~/.local/bin`, `~/.bun/bin`, etc.). If a user's CLI lives somewhere unusual, they get a "command not found" error in the terminal. Future: detect installed CLIs at workspace setup.

---

## IPC Channel Conventions

Format: `domain:action` (lowercase, colon-separated).

- `domain:action` — request/response via `ipcMain.handle` + `ipcRenderer.invoke`
- `domain:action` (fire-and-forget) — `ipcMain.on` + `ipcRenderer.send`
- `domain:event:cardId` — main → renderer event stream (e.g. `terminal:data:abc123`)

Always:

1. Add the handler in `src/main/ipc/index.ts`
2. Expose it in `src/main/preload.ts` under `window.riza.<domain>`
3. Update the type in `src/renderer/globals.d.ts`
4. Use it from React components

Never use raw `ipcRenderer` in components. Always go through `window.riza`.

---

## Build Pipeline

### Dev

```bash
cd apps/desktop && npm run dev
```

This runs three processes in parallel via `concurrently`:

- `dev:renderer` — Vite at `localhost:5173` with HMR
- `dev:main` — esbuild watching `src/main/**`, rebuilding `dist/main/`
- `dev:electron` — `wait-on` for Vite, then `electron .`

**Hot reload caveat:** the renderer hot-reloads automatically. The main process does NOT — esbuild rebuilds the file, but Electron keeps the old code in memory. **Restart `npm run dev` whenever you change `src/main/`.**

### Production

```bash
npm run build
```

Outputs to `dist/main/` and `dist/renderer/`. Not yet packaged to a `.dmg` / `.app` — that's on the roadmap.

---

## Working on Riza

### Before Implementing

1. Read this file.
2. Read `docs/RIZA.md` for the product narrative.
3. Read `docs/architecture.md` for the deeper design rationale.
4. Search for existing patterns before inventing new ones. Match the conventions you find.
5. If unsure whether a feature aligns with the differentiation, ask. Optimize for observability and human accountability, not autonomy.

### Code Style

- TypeScript strict mode, no `any` unless commented why.
- React function components only. No class components.
- `useState` and `useReducer` for local state. No Redux, no Zustand (yet).
- Tailwind classes inline. No CSS-in-JS, no styled-components.
- File length: aim for under 300 lines. Split when components grow past that.
- Comments: explain _why_, not _what_. Especially around non-obvious decisions like the spawner boot delays.

### Common Mistakes to Avoid

- **Importing values from `@riza/shared`** that aren't types. Inline them in the renderer instead. Vite/Rollup chokes on barrel-exported consts.
- **Calling `fit.fit()` synchronously after `term.open()`**. Always wrap in a `setTimeout(..., 50)` — xterm needs the container to be laid out first.
- **Forgetting to restart Electron** after editing `src/main/`. Esbuild rebuilds, Electron doesn't reload.
- **Using `ipcRenderer.send` for something that needs a response**. Use `invoke` for request/response. `send` is fire-and-forget.
- **Adding a glow or gradient text**. Strictly forbidden by the design system.
- **Using emojis in UI text**. Replace with inline SVG.
- **Removing the `--dangerously-skip-permissions` flag from Claude**. Without it, Claude prompts for every tool call and the TUI is unusable inside Riza.

### Adding a New Feature

The recommended order:

1. Update or add types in `packages/shared/src/types/`
2. If main-process work: add IPC handler in `src/main/ipc/index.ts`, expose in `preload.ts`, update `globals.d.ts`
3. Build the React component
4. Wire it from `Board.tsx` or `Sidebar.tsx`
5. Match existing styling patterns. No new colors, no new fonts.
6. Test by restarting `npm run dev` (don't trust HMR for main-process changes)

---

## Roadmap (Known Gaps)

These are tracked in `docs/RIZA.md`. Highlights:

- SQLite persistence (currently in-memory) — cards, card_events, card_context, card_costs tables
- Automatic context capture from PTY output (file edits, errors, test results)
- Cross-card context injection when spawning dependent cards
- Cost tracking per card (token usage, API spend, duration) parsed from PTY output
- Git worktree integration (worktree per card, inline diff in Review)
- Hand-raise detection from PTY output parsing
- Approve/Reject buttons in Review column with merge/discard
- App packaging + auto-update

When picking up work, prefer the items that move us closer to the differentiated pitch (review gate, worktrees, context injection, cost tracking, hand-raise) over polish.
