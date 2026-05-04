# Riza — Architecture

## Process Model

```
Electron Main Process (Node.js)
  ├── SQLite DB (better-sqlite3) — single file, sync queries
  ├── MCP Server (@modelcontextprotocol/sdk) — HTTP+SSE on random port
  ├── Agent Spawner (node-pty) — one PTY per running card
  ├── Git Manager (simple-git) — worktree create/merge/remove
  └── IPC Handlers — bridge to renderer

Electron Renderer Process (React + Vite)
  ├── Board — kanban columns + cards (dnd-kit)
  ├── TerminalPanel — xterm.js per card (reads from main via IPC)
  ├── ChannelPanel — Slack-style messages per card
  ├── Sidebar — workspace nav + agent status
  └── WorkspaceSetupPage — onboarding flow

Preload (contextBridge)
  └── window.riza — typed API surface, no raw ipcRenderer exposure
```

## Data Flow: Card Execution

```
User clicks Play on a card
  → renderer: window.riza.agent.spawn(cardId)
  → IPC: agent:spawn → main
  → main: db.getCard(cardId)
  → main: git.createWorktree(repoPath, worktreeRoot, cardId)
  → main: mcp.generateMcpConfig(cardId, channelId) → writes /tmp/riza-{cardId}.mcp.json
  → main: spawner.spawnAgent(cardId, provider, description, worktreePath)
        → node-pty spawns CLI with injected mcp config
  → main: emits agent:status { cardId, state: 'running' }
  → renderer: updates card status dot to running

Agent running
  → PTY output → IPC terminal:data:{cardId} → renderer xterm.js
  → Agent calls MCP post_message → SQLite insert → IPC channel:message:{channelId}
  → Agent calls MCP post_message(is_hand_raise: true) → IPC agent:status { raisedHand: true }
        → renderer: RaisedHandBadge appears on card

Agent exits (process exit code 0)
  → main: emits agent:status { cardId, state: 'done' }
  → renderer: card status → done, but card stays in current column
  → Human must manually drag card to Review, then to Done (isReviewGate enforcement)
```

## MCP Tool Contract

| Tool               | Called by | Effect                                             |
| ------------------ | --------- | -------------------------------------------------- |
| `post_message`     | Agent     | Insert message to channel, push to renderer        |
| `read_messages`    | Agent     | Read channel history (user replies + other agents) |
| `mention_agent`    | Agent     | Targeted message to another agent's channel        |
| `get_task_context` | Agent     | Retrieve card title/description/worktree path      |

## Git Worktree Strategy

- Default: each card gets its own worktree at `{worktreeRoot}/card-{cardId}`
- Branch name: `riza/card-{cardId}`
- Agents operate exclusively in their worktree — no shared file access
- Review column: shows inline diff (worktree branch vs main)
- Approve: `git merge riza/card-{cardId}` + remove worktree
- Reject: remove worktree, card returns to In Progress

## Design System

- **Font**: Geist + Geist Mono
- **Accent**: #e85d2f (burnt orange — single accent, saturation < 80%)
- **Background**: zinc-950 (#09090b) — never pure black
- **DESIGN_VARIANCE**: 8 — asymmetric layout, fractional grids, large whitespace
- **MOTION_INTENSITY**: 6 — Framer Motion spring physics, no GSAP
- **VISUAL_DENSITY**: 4 — daily app spacing, cards only where elevation matters
- **Icons**: @phosphor-icons/react — no emojis anywhere
