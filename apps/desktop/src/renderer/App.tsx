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

	// Per-workspace state: boards + cards live here so switching workspaces
	// never loses the other workspace's data.
	const [workspaceStates, setWorkspaceStates] = useState<
		Record<string, WorkspaceState>
	>({});

	const activeWorkspace =
		workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
	const activeState = activeWorkspaceId
		? workspaceStates[activeWorkspaceId]
		: null;

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
		</>
	);
}
