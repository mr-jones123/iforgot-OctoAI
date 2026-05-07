# OctoAI

A desktop app for orchestrating AI coding agents. You're the PM — Claude Code, Codex, Gemini, and Amp are your team.

<img width="573" height="369" alt="image" src="https://github.com/user-attachments/assets/e26e948e-1315-47ca-bf2c-d8d03bfe948e" />

<img width="562" height="367" alt="image" src="https://github.com/user-attachments/assets/b7401f8b-f83f-42d0-86f8-0b8026d65273" />



## Concept

- Kanban board per workspace (project/repo)
- Each card = one task assigned to one agent
- Press Play on a card or a whole column to spawn agent instances
- Each running card has an embedded terminal you can click into
- Review column is a mandatory human checkpoint — no auto-advancing
- Schedule cards to run at a specific time using cron-style scheduling
- Agent Intel dashboard tracks task completion, duration, failure rate, and token cost per provider
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
    agents/     Agent spawning (Claude Code, Codex, Gemini, Amp) + cost reader
    db/         SQLite schema + queries
    git/        Worktree management
    ipc/        IPC handlers bridging main <-> renderer
    scheduler/  Cron-based card scheduling
  renderer/     React app
    components/
      board/    Kanban board, columns, cards
      intel/    Agent Intel analytics dashboard
      terminal/ xterm.js terminal panel
      workspace/Workspace switcher and setup flow
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
2. Drag OctoAI to **Applications**
3. Right-click OctoAI in Applications → **Open**
4. Click **Open** on the Gatekeeper dialog

Or from the terminal:

```bash
xattr -cr /Applications/OctoAI.app
```

## Agent Intel

OctoAI tracks performance and cost for every agent run. Click **Agent Intel** in the sidebar to see:

- **Leaderboard** — tasks done, avg duration, failure rate, and estimated cost per provider
- **Activity** — last 30 runs with provider, duration, and time elapsed
- **Cost** — total token spend broken down by provider, with input/output/cached token counts and cost per completed task

Cost data is read from local session files (no extra API calls):

| Provider | Source |
|---|---|
| Claude Code | `~/.claude/projects/` JSONL session files |
| Codex | `~/.codex/sessions/` JSONL session files |
| Gemini | PTY scrape of `/stats` output on exit |
| Amp | PTY scrape of cost summary on exit |

## MVP Build Order

1. Workspace creation + git worktree init
2. Kanban board — drag and drop, column run, single card play
3. Embedded terminal per card (xterm.js + node-pty)
4. Agent spawning — Claude Code first, others follow
5. Task dependency linking between cards
6. Scheduled card execution (cron / datetime)
7. Agent Intel dashboard — cost, duration, leaderboard
8. Review column — inline diff (worktree vs main), approve/reject
