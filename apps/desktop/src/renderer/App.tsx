"use client";
import type { Board, Card, Workspace } from "@riza/shared";
import { useState } from "react";
import { BoardPage } from "./pages/BoardPage";
import { WorkspaceSetupPage } from "./pages/WorkspaceSetupPage";

/**
 * App root.
 *
 * Owns all workspaces, all boards (keyed by workspaceId), all cards (keyed
 * by boardId), and which workspace + board is active.
 *
 * Lifting board/card state here is what makes workspace switching work —
 * each workspace gets its own independent board list and card map that
 * persists while you're away from it.
 */

function makeId() {
  return crypto.randomUUID();
}

// ── Per-workspace state ───────────────────────────────────────────────────────

interface WorkspaceState {
  boards: Board[];
  activeBoardId: string;
  boardCards: Record<string, Card[]>; // boardId → cards
}

function createDefaultBoard(workspaceId: string): Board {
  const boardId = makeId();
  const DEFAULT_COLUMNS = [
    { title: "Backlog", order: 0, isReviewGate: false },
    { title: "To-do", order: 1, isReviewGate: false },
    { title: "In Progress", order: 2, isReviewGate: false },
    { title: "Review", order: 3, isReviewGate: true },
    { title: "Done", order: 4, isReviewGate: false },
  ] as const;

  return {
    id: boardId,
    workspaceId,
    name: "General",
    columns: DEFAULT_COLUMNS.map((c) => ({
      id: makeId(),
      boardId,
      title: c.title,
      order: c.order,
      isReviewGate: c.isReviewGate,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createWorkspaceState(workspaceId: string): WorkspaceState {
  const board = createDefaultBoard(workspaceId);
  return {
    boards: [board],
    activeBoardId: board.id,
    boardCards: {},
  };
}

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null,
  );
  const [addingWorkspace, setAddingWorkspace] = useState(false);
  const [workspaceStates, setWorkspaceStates] = useState<
    Record<string, WorkspaceState>
  >({});

  // Single state atom for the delete confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    step: 1 | 2;
  } | null>(null);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const activeState = activeWorkspaceId
    ? workspaceStates[activeWorkspaceId]
    : null;
  const confirmWorkspace =
    workspaces.find((w) => w.id === confirmDelete?.id) ?? null;

  // ── Workspace management ───────────────────────────────────────────────────

  function handleWorkspaceCreated(workspace: Workspace) {
    setWorkspaces((prev) => [...prev, workspace]);
    setWorkspaceStates((prev) => ({
      ...prev,
      [workspace.id]: createWorkspaceState(workspace.id),
    }));
    setActiveWorkspaceId(workspace.id);
    setAddingWorkspace(false);
  }

  function handleSwitchWorkspace(workspaceId: string) {
    setActiveWorkspaceId(workspaceId);
  }

  function handleDeleteWorkspace(workspaceId: string) {
    setConfirmDelete({ id: workspaceId, step: 1 });
  }

  function handleConfirmDelete() {
    if (!confirmDelete) return;

    if (confirmDelete.step === 1) {
      setConfirmDelete({ ...confirmDelete, step: 2 });
      return;
    }

    // Step 2 — actually delete
    const { id } = confirmDelete;
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    setWorkspaceStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActiveWorkspaceId((prev) => {
      if (prev !== id) return prev;
      return workspaces.find((w) => w.id !== id)?.id ?? null;
    });
    setConfirmDelete(null);
  }

  function handleCancelDelete() {
    setConfirmDelete(null);
  }

  // ── Board management (delegates into workspaceStates) ─────────────────────

  function updateState(
    workspaceId: string,
    updater: (prev: WorkspaceState) => WorkspaceState,
  ) {
    setWorkspaceStates((prev) => ({
      ...prev,
      [workspaceId]: updater(prev[workspaceId]),
    }));
  }

  function handleCreateBoard(workspaceId: string, name: string) {
    const board = (() => {
      const boardId = makeId();
      const DEFAULT_COLUMNS = [
        { title: "Backlog", order: 0, isReviewGate: false },
        { title: "To-do", order: 1, isReviewGate: false },
        { title: "In Progress", order: 2, isReviewGate: false },
        { title: "Review", order: 3, isReviewGate: true },
        { title: "Done", order: 4, isReviewGate: false },
      ] as const;
      return {
        id: boardId,
        workspaceId,
        name,
        columns: DEFAULT_COLUMNS.map((c) => ({
          id: makeId(),
          boardId,
          title: c.title,
          order: c.order,
          isReviewGate: c.isReviewGate,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies Board;
    })();

    updateState(workspaceId, (prev) => ({
      ...prev,
      boards: [...prev.boards, board],
      activeBoardId: board.id,
    }));
  }

  function handleDeleteBoard(workspaceId: string, boardId: string) {
    updateState(workspaceId, (prev) => {
      if (prev.boards.length === 1) return prev; // never delete last board
      const remaining = prev.boards.filter((b) => b.id !== boardId);
      const newCards = { ...prev.boardCards };
      delete newCards[boardId];
      return {
        ...prev,
        boards: remaining,
        activeBoardId:
          prev.activeBoardId === boardId ? remaining[0].id : prev.activeBoardId,
        boardCards: newCards,
      };
    });
  }

  function handleSelectBoard(workspaceId: string, boardId: string) {
    updateState(workspaceId, (prev) => ({ ...prev, activeBoardId: boardId }));
  }

  function handleCardsChange(
    workspaceId: string,
    boardId: string,
    updater: (prev: Card[]) => Card[],
  ) {
    updateState(workspaceId, (prev) => ({
      ...prev,
      boardCards: {
        ...prev.boardCards,
        [boardId]: updater(prev.boardCards[boardId] ?? []),
      },
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (workspaces.length === 0) {
    return <WorkspaceSetupPage onWorkspaceCreated={handleWorkspaceCreated} />;
  }

  return (
    <>
      {activeWorkspace && activeState && (
        <BoardPage
          workspace={activeWorkspace}
          workspaces={workspaces}
          boards={activeState.boards}
          activeBoardId={activeState.activeBoardId}
          boardCards={activeState.boardCards}
          onSwitchWorkspace={handleSwitchWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onAddWorkspace={() => setAddingWorkspace(true)}
          onCreateBoard={(name: string) =>
            handleCreateBoard(activeWorkspace.id, name)
          }
          onDeleteBoard={(boardId: string) =>
            handleDeleteBoard(activeWorkspace.id, boardId)
          }
          onSelectBoard={(boardId: string) =>
            handleSelectBoard(activeWorkspace.id, boardId)
          }
          onCardsChange={(boardId: string, updater: (prev: Card[]) => Card[]) =>
            handleCardsChange(activeWorkspace.id, boardId, updater)
          }
        />
      )}

      {addingWorkspace && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setAddingWorkspace(false)}
        >
          <div
            className="w-full max-w-[820px] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <WorkspaceSetupPage
              onWorkspaceCreated={handleWorkspaceCreated}
              isModal
              onCancel={() => setAddingWorkspace(false)}
            />
          </div>
        </div>
      )}

      {/* ── Delete workspace confirmation dialog ───────────────────────────── */}
      {confirmDelete && confirmWorkspace && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-surface-base border border-surface-border rounded-lg p-6 w-full max-w-sm mx-4 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDelete.step === 1 ? (
              <>
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-semibold text-text-primary">
                    Delete workspace?
                  </h2>
                  <p className="text-xs text-text-tertiary font-mono">
                    <span className="text-text-primary font-semibold">
                      {confirmWorkspace.name}
                    </span>{" "}
                    and all its boards and cards will be permanently removed.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary font-mono transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-md font-mono transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-semibold text-text-primary">
                    Are you absolutely sure?
                  </h2>
                  <p className="text-xs text-text-tertiary font-mono">
                    This cannot be undone. All sessions and cards inside{" "}
                    <span className="text-text-primary font-semibold">
                      {confirmWorkspace.name}
                    </span>{" "}
                    will be lost forever.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary font-mono transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 rounded-md font-mono transition-colors"
                  >
                    Yes, delete forever
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
