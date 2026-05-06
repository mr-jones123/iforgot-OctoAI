# Plan: Dependency System + Context Injection

## Context

Cards already have `dependsOn: string[]` in the shared types. The Board already computes `blockedCardIds` and disables Play for blocked cards. What's missing: (1) a UI to pick dependencies, (2) passing dependencies through IPC to the spawner, (3) capturing context from completed cards, and (4) injecting that context into new cards' prompts at spawn time.

## Files to Modify

| File                                                       | Change                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/desktop/src/renderer/components/board/CardModal.tsx` | Add dependency multi-select                                      |
| `apps/desktop/src/renderer/components/board/Column.tsx`    | Pass `allCards` to CardModal for dependency picker               |
| `apps/desktop/src/renderer/components/board/Board.tsx`     | Pass `allCards` down to Column, pass `dependsOn` in spawn call   |
| `apps/desktop/src/main/ipc/index.ts`                       | Add `dependsOn` to spawn payload                                 |
| `apps/desktop/src/main/agents/spawner.ts`                  | Accept `dependsOn`, build context preamble from terminal buffers |
| `apps/desktop/src/main/preload.ts`                         | Add `dependsOn` to spawn payload type                            |
| `apps/desktop/src/renderer/globals.d.ts`                   | Add `dependsOn` to spawn payload type                            |
| `packages/shared/src/types/card.ts`                        | Remove `channelId` (dead field from removed channels)            |

## Steps

### Step 1: Remove dead `channelId` from Card type

`channel.ts` types are unused (channels were removed). The `channelId` field on Card is dead. Remove it so it doesn't confuse future work.

### Step 2: Add dependency picker to CardModal

The modal already receives props but doesn't know about other cards. We need to:

- Accept an `allCards` prop (the full card list for the board)
- Add a "Depends on" section with checkboxes for other cards
- For edit mode, pre-check existing `dependsOn`
- On submit, return `dependsOn` array alongside title/description/provider

The dependency picker only shows cards that are NOT the current card (prevent self-dependency) and shows each card's title + status for context.

### Step 3: Wire allCards through Board → Column → CardModal

Board already has `cards`. Pass it to Column. Column passes to CardModal (both add and edit modals).

### Step 4: Update addCard/editCard in Board.tsx to accept dependsOn

The `addCard` and `editCard` functions need to accept and store `dependsOn`. The `editCard` function also needs to preserve or update `dependsOn`.

### Step 5: Pass dependsOn through IPC spawn payload

When `playCard` is called in Board.tsx, include the card's `dependsOn` in the spawn call. This flows through preload → IPC → spawner.

### Step 6: Update spawner to accept dependsOn and build context preamble

The spawner currently takes `(cardId, provider, description, worktreePath, model)`. Change to also accept `dependsOn: string[]`.

When `dependsOn` is non-empty, the spawner reads each dependency card's terminal buffer from the in-memory sessions map and builds a context preamble. Since we don't have SQLite yet, context comes from the terminal buffer (which is already in memory in spawner.ts).

The preamble is prepended to the description before building the provider command.

### Step 7: Update preload.ts and globals.d.ts

Add `dependsOn?: string[]` to the spawn payload in both files.

## Code Changes

---

### packages/shared/src/types/card.ts

```ts
import type { AgentConfig } from "./agent";

export type CardStatus = "idle" | "running" | "waiting" | "done" | "failed";

export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string; // the task prompt sent to the agent
  agent: AgentConfig;
  worktreePath?: string; // set when agent is spawned
  status: CardStatus;
  raisedHand: boolean; // agent is blocked and needs human attention
  order: number;
  dependsOn: string[]; // card IDs that must be in 'done' before this card can run
  createdAt: string;
  updatedAt: string;
}

export interface CardCreateInput {
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  agent: AgentConfig;
  dependsOn?: string[];
}
```

(Remove `channelId` field)

---

### apps/desktop/src/renderer/components/board/CardModal.tsx

Add `allCards` and `currentCardId` props. Add dependency picker section. Update `onConfirm` signature to include `dependsOn`.

The dependency section shows after the provider picker. Each card is a checkbox row showing the card title and a status badge. Cards that are the current card are excluded.

---

### apps/desktop/src/renderer/components/board/Column.tsx

Add `allCards` prop. Pass it to both the add and edit CardModal instances.

---

### apps/desktop/src/renderer/components/board/Board.tsx

- Pass `cards` to each `Column` as `allCards`.
- Update `addCard` to accept `dependsOn: string[]`.
- Update `editCard` to accept `dependsOn: string[]`.
- Update `playCard` to pass `dependsOn` to `window.riza.agent.spawn`.
- Remove `channelId: makeId()` from new card creation.

---

### apps/desktop/src/main/agents/spawner.ts

Export a new function `getContextForCard(cardId: string): string | null` that reads the terminal buffer for a completed session and returns a cleaned summary.

Update `spawnAgent` signature to accept `dependsOn?: string[]`. Before building the command, if `dependsOn` has entries, iterate over them, call `getContextForCard` for each, and prepend the combined context to the description.

The buffer is already in the `sessions` Map. For completed sessions, the buffer is preserved (spawner keeps sessions in map after exit for replay). We read the last 50 lines, strip ANSI codes, and format as context.

---

### apps/desktop/src/main/ipc/index.ts

Update the `agent:spawn` handler to accept `dependsOn` in the payload and pass it to `spawnAgent`.

---

### apps/desktop/src/main/preload.ts

Update `agent.spawn` to include `dependsOn?: string[]` in the payload.

---

### apps/desktop/src/renderer/globals.d.ts

Update `agent.spawn` payload type to include `dependsOn?: string[]`.

---

## Verification

1. Create 3 cards: Card A, Card B (depends on A), Card C (depends on A and B)
2. Card B and C show "blocked" badge, Play button disabled
3. Run Card A → wait for it to complete → status becomes "done"
4. Card B unblocks → click Play → terminal shows context from Card A prepended
5. Card C still blocked (B not done yet)
6. Run Card B → complete → Card C unblocks → Play → terminal shows context from both A and B
7. Edit Card B → dependency picker shows Card A checked → uncheck → save → Card B no longer blocked
8. `runAll` on a column skips blocked cards
