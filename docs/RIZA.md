# Riza

> _Azir reversed. The League of Legends emperor commands sand soldiers. You command AI agents._

Riza is a desktop app for orchestrating AI coding agents. You are the PM. Claude Code, Codex, Gemini CLI, and Ollama are your team. You assign tasks on a kanban board, agents run in parallel in their own terminals, and nothing ships until you personally approve it.

---

## The Problem

Running multiple AI coding agents today is completely manual and fragmented. You get:

- Terminal tabs everywhere with no visibility into which agent needs you
- Agents stomping on each other's files when working in the same repo
- No record of what the agent decided or why — just raw terminal output
- No coordination between agents — if Agent A changes an interface Agent B depends on, B doesn't know
- Every tool moves a card to "done" when the process exits — even if the output is broken

The community said it clearly (Reddit, HN, GitHub):

> _"Lots of frameworks are solving agent-to-agent coordination, but the human-to-agents interface feels completely unsolved."_

> _"Biggest pain wasn't context handoff, it was remembering which agent knew what when I came back after lunch."_

> _"An agent says 'Done!' but the test suite is failing."_

---

## The Competition

| Tool                      | What it does                                                | What it lacks                                                 |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| **Baton**                 | Desktop app, embedded terminals, multi-agent, git worktrees | No kanban, no agent communication, no quality gate            |
| **claude_agent_teams_ui** | Kanban board, CTO/team metaphor                             | No embedded terminals, no worktrees, no inter-agent messaging |
| **Parallel Code**         | One agent per git worktree, Electron                        | No kanban, no task management, no agent comms                 |
| **Emdash**                | Ticket intake from Linear/Jira, inline diffs                | No real-time terminals, no agent-to-agent coordination        |
| **agentsmesh**            | PTY sandboxes, built-in kanban                              | Complex setup, developer-only UX                              |

**The shared weakness across all of them:** they solve running agents in parallel. None of them solve managing the human who is watching those agents.

---

## What Riza Does Differently

### 1. The Review Column is a Hard Gate

Every other tool moves a card to "done" on process exit. Riza doesn't. Cards cannot leave the **Review** column without a human manually advancing them. You read the output, you look at the diff, you decide. No automated trust.

> _"We don't automate trust. You shipped it, you own it."_

This is a philosophical stance, not a missing feature. It's the answer to AI slop.

### 2. Slack-Style Agent Channels (MCP-backed)

Each card spawns its own communication channel — like a Slack thread, one per task. Agents post messages through an embedded MCP server. Agents can talk to each other, hand off subtasks, and ask the human for help. The human reads the thread to understand what the agent decided and why — not just what it outputted.

This also solves the "what happened while I was away" problem. The channel is the session recap. No scrolling raw terminal output.

No existing tool does this.

### 3. Column-Based Priority + Runtime Hand-Raise

Columns define priority upfront — Emergency, Critical, Normal, Backlog. The human decides the order before agents start. No automated triage, no ML, no complexity.

When an agent hits a blocker mid-run, it raises its hand — a badge appears on the card. The human decides whether to intervene based on which column the card is in.

### 4. Git Worktrees by Default

Every card gets its own git worktree on Play. Agents never touch the same files. When a card reaches Review, you see an inline diff (worktree branch vs main). Approve = merge + cleanup. Reject = discard + back to In Progress.

### 5. Task Dependency Linking

Cards can declare dependencies on other cards. A blocked card won't run until its dependencies are Done. Simple arrow-linking between cards.

### 6. Full Interactive Terminal, Not Just Output Capture

Riza spawns the real CLI TUI — Claude Code's full interactive interface, not a one-shot `-p` command. You see the same interface as your terminal. You can respond to prompts, approve tool calls, type follow-up messages. The terminal stays open as long as the agent runs.

### 7. Design That Non-Developers Actually Want to Use

Every competing tool looks like a developer built it for themselves on a weekend. Riza is designed with a real design system — asymmetric layouts, motion physics, spotlight cards, a dark zinc palette with a single burnt orange accent. The kind of app vibe coders on X will screenshot and share.

---

## Target Audience

**Primary:** Vibe coders on X — technically capable developers (and increasingly non-developers) who run multiple AI agents and are drowning in terminal tabs.

**Secondary:** Technical PMs and indie hackers who want to run a solo "studio" with AI agents as their team.

The pitch: _You're the PM. They're your junior devs. You always know who's stuck, what's done, and what broke._

---

## Architecture

### Process Model

Electron runs two isolated processes that cannot directly access each other's memory or APIs. This is a security boundary — the renderer loads web content (React, HTML), and if it had direct access to Node.js, a malicious script could read your filesystem or spawn processes.

```
┌─────────────────────────────────────────────────────┐
│  Main Process (Node.js)                             │
│  ├── SQLite DB (better-sqlite3)     ← TODO         │
│  ├── MCP Server                     ← TODO         │
│  ├── Agent Spawner (node-pty)       ← implemented  │
│  ├── Git Worktree Manager           ← TODO         │
│  └── IPC Handlers                   ← partial      │
├─────────────────────────────────────────────────────┤
│  Preload (contextBridge)                            │
│  └── window.riza.{workspace,board,agent,            │
│                    terminal,channel}                │
├─────────────────────────────────────────────────────┤
│  Renderer Process (React + Vite + Tailwind)         │
│  ├── WorkspaceSetupPage                             │
│  ├── BoardPage                                      │
│  │   ├── Sidebar (240px left rail)                  │
│  │   ├── Board (kanban columns, dnd-kit)            │
│  │   └── TerminalPanel (xterm.js slide-in drawer)   │
│  └── ChannelPanel (Slack-style thread) ← UI only   │
└─────────────────────────────────────────────────────┘
```

Electron enforces isolation with:

- `contextIsolation: true` — renderer has no access to Node.js globals
- `nodeIntegration: false` — no `require()`, no `process`, no `__dirname`

The renderer communicates with the main process exclusively through IPC.

### IPC (Inter-Process Communication)

Since the renderer cannot access Node.js, all native operations go through a message-passing channel between the two processes. Two patterns are used:

**`ipcMain.handle` / `ipcRenderer.invoke` — request/response**

Like a function call across processes. The renderer sends a message, waits, and gets a return value.

```ts
// main process registers the handler
ipcMain.handle("agent:spawn", (_event, payload) => {
    spawnAgent(payload.cardId, payload.provider, ...);
});

// renderer calls it (via preload)
const result = await ipcRenderer.invoke("agent:spawn", { cardId: "abc", ... });
```

**`ipcMain.on` / `ipcRenderer.send` — fire and forget**

One-way message, no return value. Used for high-frequency streaming where waiting for acknowledgment would be too slow.

```ts
// main process
ipcMain.on("terminal:input", (_event, payload) => {
  writeToAgent(payload.cardId, payload.data);
});

// renderer
ipcRenderer.send("terminal:input", { cardId: "abc", data: "ls\n" });
```

**Main → Renderer (push events)**

The main process can also push events to the renderer for real-time streaming:

```ts
// main pushes data
mainWindow.webContents.send("terminal:data:abc123", output);

// renderer subscribes
ipcRenderer.on("terminal:data:abc123", (_event, data) => { ... });
```

The preload script (`preload.ts`) sits between the two processes. It uses `contextBridge` to expose a typed `window.riza` API to the renderer. The renderer never touches `ipcRenderer` directly — it only calls `window.riza.agent.spawn()`, `window.riza.terminal.input()`, etc.

Riza's IPC channels:

| Channel                  | Pattern       | Direction                  | Purpose                                |
| ------------------------ | ------------- | -------------------------- | -------------------------------------- |
| `dialog:openFolder`      | handle/invoke | Renderer → Main → Renderer | Opens native folder picker             |
| `agent:spawn`            | handle/invoke | Renderer → Main            | Spawns a PTY agent process             |
| `agent:kill`             | handle/invoke | Renderer → Main            | Kills a running PTY process            |
| `terminal:buffer`        | handle/invoke | Renderer → Main → Renderer | Returns buffered PTY output for replay |
| `terminal:input`         | on/send       | Renderer → Main            | Streams keystrokes to PTY              |
| `terminal:resize`        | on/send       | Renderer → Main            | Resizes PTY dimensions                 |
| `terminal:data:{cardId}` | push event    | Main → Renderer            | Streams PTY output to xterm.js         |
| `agent:status`           | push event    | Main → Renderer            | Pushes agent state changes             |

### node-pty: Why Not child_process.spawn()?

`child_process.spawn()` gives you pipes. The child process can detect it's not connected to a real terminal (`isatty()` returns false), and many programs change behavior:

- **No TUI rendering.** Programs like Claude Code use ANSI cursor movement, alternate screen buffers, and mouse tracking. These require a real TTY.
- **No color output.** Most CLI tools check `isatty()` before emitting ANSI color codes. Over pipes, you get plain text.
- **No line editing.** Programs that use readline (input history, tab completion, cursor editing) need a TTY.
- **Different buffering.** Programs may switch from line-buffered to block-buffered when stdout is a pipe.

`node-pty` wraps the OS pseudo-terminal interface (macOS: `fork()` + `openpty()` + `execvp()`, Windows: ConPTY). It creates a master/slave device pair:

```
┌─────────────┐          ┌──────────────┐
│   Master     │◄────────►│    Slave      │
│  (Node.js)   │  read/   │  (child proc) │
│              │  write   │               │
└─────────────┘          └──────────────┘
```

The child process sees a real terminal and behaves identically to running in Terminal.app. This is why Claude Code's full interactive TUI renders inside Riza's embedded terminal.

Riza spawns PTYs with `xterm-256color` as the `$TERM` value, 220x50 dimensions (resized dynamically), and the workspace repo as the working directory.

### The Agent Spawn Flow

The full chain of events when you click Play on a card:

```
1. User clicks Play on KanbanCard
2. Board.tsx → playCard(cardId)
   → sets card.status = "running" in React state (dot turns orange)
   → calls window.riza.agent.spawn({ cardId, provider, description, worktreePath })
3. Preload forwards to ipcRenderer.invoke("agent:spawn", ...)
4. Main process ipc/index.ts receives it, calls spawnAgent()
5. spawnAgent() calls pty.spawn("claude", ["--dangerously-skip-permissions"], { cwd: worktreePath })
6. PTY starts producing output (boot messages, TUI rendering)
7. ptyProcess.onData() fires → bufferAndSend()
   → stores output in session.buffer (up to 2000 chunks)
   → mainWindow.webContents.send("terminal:data:{cardId}", data)
8. Preload routes to window.riza.terminal.onData() listener
9. TerminalPanel receives data → term.write(data) → xterm.js renders to canvas
```

**Stdin injection pattern:** For providers like Claude Code and Codex that run as interactive TUIs, Riza does not use a `-p` prompt flag. It launches the bare TUI and waits for it to boot, then writes the task description to stdin via `ptyProcess.write(description + "\r")`. This gives the user the full interactive agent experience. Boot delays vary by provider: Claude Code 3s, Codex 2s, Gemini 2s, Ollama 1s.

**Output buffering:** If the TerminalPanel is opened after the agent has already been running, it fetches the backlog via `window.riza.terminal.buffer(cardId)` and writes it all to xterm.js in one shot before subscribing to live events. This means you can close and reopen a terminal panel without losing any output.

### Data Model

Six core types defined in `packages/shared/` and used by both processes:

| Type          | Purpose                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| **Workspace** | A project/repo. Holds `repoPath`, `worktreeRoot`, configured agent providers.                              |
| **Board**     | Belongs to a workspace. Has 5 default columns.                                                             |
| **Column**    | Backlog, To-do, In Progress, Review (hard gate), Done. `isReviewGate` prevents auto-advance.               |
| **Card**      | A task. Title, description (agent prompt), agent config, worktree path, channel, status, dependency links. |
| **Channel**   | Slack-style message thread, one per card.                                                                  |
| **Message**   | Individual message with sender, content, `isHandRaise` flag.                                               |

### MCP Tool Contract

The embedded MCP server will expose these tools to agents:

| Tool               | Called by | Effect                                             |
| ------------------ | --------- | -------------------------------------------------- |
| `post_message`     | Agent     | Insert message to channel, push to renderer        |
| `read_messages`    | Agent     | Read channel history (user replies + other agents) |
| `mention_agent`    | Agent     | Targeted message to another agent's channel        |
| `get_task_context` | Agent     | Retrieve card title/description/worktree path      |

### Git Worktree Strategy

- Each card gets its own worktree at `{worktreeRoot}/card-{cardId}`
- Branch name: `riza/card-{cardId}`
- Agents operate exclusively in their worktree — no shared file access
- Review column: shows inline diff (worktree branch vs main)
- Approve: `git merge riza/card-{cardId}` + remove worktree
- Reject: remove worktree, card returns to In Progress

### Build System

| What           | How                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Renderer       | Vite with `@vitejs/plugin-react-swc`, dev server on port 5173                                                          |
| Main process   | esbuild bundling to CJS, targets Node 20, externals for `electron`, `node-pty`, `better-sqlite3`                       |
| Dev mode       | `concurrently` runs renderer, main watcher, and Electron simultaneously; `wait-on` blocks Electron until Vite is ready |
| Shared types   | Direct TypeScript source import via Vite/esbuild alias (no build step for the shared package)                          |
| Native modules | `electron-rebuild` in postinstall for `node-pty` and `better-sqlite3`                                                  |

The main process restores macOS shell PATH on startup (Homebrew, nvm, Bun, etc.) so agent CLIs installed via those package managers are discoverable.

### Design System

- **Font**: Geist + Geist Mono (Google Fonts CDN)
- **Colors**: Zinc palette (950 base `#09090b`, never pure black) with single burnt orange accent `#e85d2f`
- **Spotlight cards**: Mouse-follow radial gradient via CSS custom properties set in JS `onMouseMove`
- **Glass panels**: `bg-surface-raised/60 backdrop-blur-xl` with inset white highlight
- **Status dots**: Pulse animation for running/waiting, static for done/failed/idle
- **Dark-first**: `color-scheme: dark` enforced at `:root`
- **DESIGN_VARIANCE**: 8 — asymmetric layout, fractional grids, large whitespace
- **VISUAL_DENSITY**: 4 — daily app spacing, cards only where elevation matters

---

## Current Stack

| Layer               | Technology                                      |
| ------------------- | ----------------------------------------------- |
| Desktop shell       | Electron                                        |
| Frontend            | React + Tailwind v3                             |
| Drag and drop       | @dnd-kit                                        |
| Embedded terminals  | xterm.js + node-pty                             |
| Git                 | simple-git (worktree create/merge/delete)       |
| Database            | SQLite via better-sqlite3                       |
| Agent communication | @modelcontextprotocol/sdk (embedded MCP server) |
| Build               | Vite (renderer) + esbuild (main process)        |
| Font                | Geist + Geist Mono                              |

---

## Build Plan

### Done

- [x] Project scaffold — monorepo, shared types, Electron + Vite wired
- [x] Workspace setup page
- [x] Kanban board with 5 default columns (Backlog, To-do, In Progress, Review, Done)
- [x] Drag and drop cards across columns (dnd-kit)
- [x] Add card modal (title, task prompt, agent provider)
- [x] Column-level Run All + individual card Play/Stop
- [x] Embedded xterm.js terminal panel per card
- [x] node-pty agent spawning (Claude Code working, interactive TUI mode)
- [x] Output buffering — terminal panel replays missed output on open
- [x] Review column hard gate (amber left border, "gate" label)
- [x] Task dependency blocking (blocked badge on card)

### Next

- [ ] Fix Gemini CLI spawning
- [ ] Add Codex + Ollama provider support
- [ ] Sidebar agent status summary (live running/waiting/done counts)
- [ ] MCP server — embedded message bus
- [ ] Channel panel — Slack-style thread per card
- [ ] Inline diff view in Review column (worktree vs main)
- [ ] Approve/Reject actions on Review cards (git merge / discard worktree)
- [ ] Workspace persistence (SQLite — currently in-memory React state)
- [ ] Workspace switcher

### Later

- [ ] Task dependency UI (arrow linking between cards)
- [ ] Agent status updates pushed back to card (running → done → review)
- [ ] Hand-raise detection from agent output
- [ ] Dynamic Island raised-hand badge with spring animation
- [ ] Ollama model picker
- [ ] App packaging + auto-update
