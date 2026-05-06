# OctoAI

A desktop app for orchestrating AI coding agents. You're the PM — Claude Code, Codex, Gemini, and Ollama are your team.

## Concept

- Kanban board per workspace (project/repo)
- Each card = one task assigned to one agent
- Press Play on a card or a whole column to spawn agent instances
- Each running card has an embedded terminal you can click into
- Review column is a mandatory human checkpoint — no auto-advancing
- Git worktrees by default so agents work in parallel without stomping files

## Stack

- **Electron** — desktop shell
- **React + Tailwind** — frontend
- **xterm.js + node-pty** — embedded terminals (one per card)
- **simple-git** — worktree create/merge/delete
- **SQLite (better-sqlite3)** — workspaces, boards, cards, messages
- **@dnd-kit** — drag and drop

## Structure

```
apps/desktop/src/
  main/         Electron main process
    agents/     Agent spawning (Claude Code, Codex, Gemini, Ollama)
    db/         SQLite schema + queries
    git/        Worktree management
    ipc/        IPC handlers bridging main <-> renderer
  renderer/     React app
    components/
      board/    Kanban board, columns, cards
      terminal/ xterm.js terminal panel
      workspace/Workspace switcher and setup flow
    hooks/      Shared React hooks
    pages/      Top-level page components

packages/shared/  TypeScript types shared between main + renderer
docs/             Architecture decisions and notes
```

## Download & Install

Download the latest release from [GitHub Releases](https://github.com/mr-jones123/OctoAI/releases/latest).

### macOS Users — Gatekeeper Warning

The app is not signed with an Apple Developer certificate, so macOS will show a warning: **"cannot be opened because it may be malware."** This is expected. The app is safe.

To open it:

1. Right-click the `.dmg` → **Open**
2. Drag Riza to **Applications**
3. Right-click Riza in Applications → **Open**
4. Click **Open** on the Gatekeeper dialog

Or from the terminal:

```bash
xattr -cr /Applications/Riza.app
```

## MVP Build Order

1. Workspace creation + git worktree init
2. Kanban board — drag and drop, column run, single card play
3. Embedded terminal per card (xterm.js + node-pty)
4. Agent spawning — Claude Code first, others follow
5. Task dependency linking between cards
6. Review column — inline diff (worktree vs main), approve/reject
