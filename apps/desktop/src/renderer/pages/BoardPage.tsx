/**
 * BoardPage — thin layout shell.
 *
 * All board/card state lives in App.tsx (keyed per workspace) and is passed
 * down as props. BoardPage just wires Sidebar + KanbanBoard together.
 */
import type { Board, Card, Workspace } from "@riza/shared";
import { useState } from "react";
import { AgentIntelPanel } from "../components/intel/AgentIntelPanel";
import { Board as KanbanBoard } from "../components/board/Board";
import { Sidebar } from "../components/workspace/Sidebar";

export interface BoardPageProps {
	workspace: Workspace;
	workspaces: Workspace[];
	boards: Board[];
	activeBoardId: string;
	boardCards: Record<string, Card[]>;
	onSwitchWorkspace: (id: string) => void;
	onAddWorkspace: () => void;
	onDeleteWorkspace: (workspaceId: string) => void;
	onCreateBoard: (name: string) => void;
	onDeleteBoard: (boardId: string) => void;
	onSelectBoard: (boardId: string) => void;
	onCardsChange: (boardId: string, updater: (prev: Card[]) => Card[]) => void;
}

export function BoardPage({
	workspace,
	workspaces,
	boards,
	activeBoardId,
	boardCards,
	onSwitchWorkspace,
	onAddWorkspace,
	onDeleteWorkspace,
	onCreateBoard,
	onDeleteBoard,
	onSelectBoard,
	onCardsChange,
}: BoardPageProps) {
	const [showIntel, setShowIntel] = useState(false);

	const activeBoard = boards.find((b) => b.id === activeBoardId) ?? boards[0];
	const activeCards = boardCards[activeBoard.id] ?? [];
	// All cards across all boards — intel spans the whole workspace
	const allCards = Object.values(boardCards).flat();

	return (
		<div className="flex min-h-[100dvh] bg-[#09090b]">
			<Sidebar
				workspace={workspace}
				workspaces={workspaces}
				boards={boards}
				activeBoardId={activeBoard.id}
				showIntel={showIntel}
				onSelectBoard={(id) => {
					setShowIntel(false);
					onSelectBoard(id);
				}}
				onCreateBoard={onCreateBoard}
				onDeleteBoard={onDeleteBoard}
				onSwitchWorkspace={onSwitchWorkspace}
				onAddWorkspace={onAddWorkspace}
				onDeleteWorkspace={onDeleteWorkspace}
				onToggleIntel={() => setShowIntel((v) => !v)}
			/>

			<main className="flex-1 overflow-hidden">
				{showIntel ? (
					<AgentIntelPanel
						cards={allCards}
						onClose={() => setShowIntel(false)}
					/>
				) : (
					<KanbanBoard
						key={activeBoard.id}
						workspace={workspace}
						board={activeBoard}
						cards={activeCards}
						onCardsChange={(updater) => onCardsChange(activeBoard.id, updater)}
					/>
				)}
			</main>
		</div>
	);
}
