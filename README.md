# Riza

A desktop app for orchestrating AI coding agents. You're the PM — Claude Code, Codex, Gemini, and Ollama are your team.

> Named after Azir (reversed), the League of Legends emperor who commands sand soldiers. In Riza, you command AI agents.

## Concept

- Kanban board per workspace (project/repo)
- Each card = one task assigned to one agent
- Press Play on a card or a whole column to spawn agent instances
- Each running card has an embedded terminal you can click into
- Agents communicate via a Slack-style channel per task (MCP-backed)
- Review column is a mandatory human checkpoint — no auto-advancing
- Git worktrees by default so agents work in parallel without stomping files

## Stack

- **Electron** — desktop shell
- **React + Tailwind** — frontend
- **xterm.js + node-pty** — embedded terminals (one per card)
- **simple-git** — worktree create/merge/delete
- **SQLite (better-sqlite3)** — workspaces, boards, cards, messages
- **@modelcontextprotocol/sdk** — embedded MCP server for agent communication
- **@dnd-kit** — drag and drop

## Structure

```
apps/desktop/src/
  main/         Electron main process
    agents/     Agent spawning (Claude Code, Codex, Gemini, Ollama)
    db/         SQLite schema + queries
    git/        Worktree management
    ipc/        IPC handlers bridging main <-> renderer
    mcp/        Embedded MCP server (message bus for agents)
  renderer/     React app
    components/
      board/    Kanban board, columns, cards
      channel/  Slack-style agent communication channel
      terminal/ xterm.js terminal panel
      workspace/Workspace switcher and setup flow
    hooks/      Shared React hooks
    pages/      Top-level page components
    stores/     State management

packages/shared/  TypeScript types shared between main + renderer
docs/             Architecture decisions and notes
```

## MVP Build Order

1. Workspace creation + git worktree init
2. Kanban board — drag and drop, column run, single card play
3. Embedded terminal per card (xterm.js + node-pty)
4. Agent spawning — Claude Code first, others follow
5. MCP server + Slack channel UI per card
6. Task dependency linking between cards
7. Review column — inline diff (worktree vs main), approve/reject
