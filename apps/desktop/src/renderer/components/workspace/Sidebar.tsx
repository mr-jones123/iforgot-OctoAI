/**
 * Sidebar — left rail navigation (240px fixed).
 *
 * Two sections:
 *   1. Workspaces — list of all workspaces, click to switch, + to add new
 *   2. Boards (sessions) — boards for the active workspace, one per focus area
 */
import type { Board, Workspace } from "@riza/shared";
import { useState } from "react";
import { SessionsCardModal } from "../sessions/SessionsCardModal";

interface SidebarProps {
	workspace: Workspace;
	workspaces: Workspace[];
	boards: Board[];
	activeBoardId: string;
	onSelectBoard: (boardId: string) => void;
	onCreateBoard: (name: string) => void;
	onDeleteBoard: (boardId: string) => void;
	onSwitchWorkspace: (workspaceId: string) => void;
	onAddWorkspace: () => void;
}

export function Sidebar({
	workspace,
	workspaces,
	boards,
	activeBoardId,
	onSelectBoard,
	onCreateBoard,
	onDeleteBoard,
	onSwitchWorkspace,
	onAddWorkspace,
}: SidebarProps) {
	const [boardModalOpen, setBoardModalOpen] = useState(false);
	const [newBoardName, setNewBoardName] = useState("");
	const [workspacesExpanded, setWorkspacesExpanded] = useState(true);

	function handleCreateBoard() {
		const trimmed = newBoardName.trim();
		if (!trimmed) return;
		onCreateBoard(trimmed);
		setNewBoardName("");
		setBoardModalOpen(false);
	}

	return (
		<aside className="w-[240px] shrink-0 flex flex-col border-r border-surface-border min-h-[100dvh] px-4 py-5 gap-5">
			{/* Wordmark */}
			<div className="flex items-center justify-between">
				<span className="text-sm font-semibold tracking-tighter text-text-primary">
					Riza
				</span>
			</div>

			{/* ── Workspaces ──────────────────────────────────────────────────────── */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<button
						type="button"
						onClick={() => setWorkspacesExpanded((v) => !v)}
						className="flex items-center gap-1.5 text-xs text-text-tertiary font-mono uppercase tracking-widest hover:text-text-secondary transition-colors"
					>
						<svg
							width="8"
							height="8"
							viewBox="0 0 8 8"
							fill="currentColor"
							className={`transition-transform duration-150 ${workspacesExpanded ? "rotate-90" : "rotate-0"}`}
						>
							<path d="M2 1 L6 4 L2 7 Z" />
						</svg>
						Workspaces
					</button>
					<button
						type="button"
						onClick={onAddWorkspace}
						title="Add workspace"
						className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors rounded hover:bg-surface-overlay"
					>
						<svg
							width="10"
							height="10"
							viewBox="0 0 10 10"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						>
							<path d="M5 2 V8 M2 5 H8" />
						</svg>
					</button>
				</div>

				{workspacesExpanded && (
					<div className="flex flex-col gap-0.5">
						{workspaces.map((ws) => {
							const isActive = ws.id === workspace.id;
							return (
								<button
									key={ws.id}
									type="button"
									onClick={() => onSwitchWorkspace(ws.id)}
									className={[
										"flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-150 text-left w-full",
										isActive
											? "bg-surface-overlay text-text-primary"
											: "text-text-secondary hover:bg-surface-overlay/60 hover:text-text-primary",
									].join(" ")}
								>
									<span
										className={[
											"w-1.5 h-1.5 rounded-full shrink-0",
											isActive ? "bg-accent" : "bg-surface-border",
										].join(" ")}
									/>
									<span className="truncate text-xs font-mono">{ws.name}</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* Divider */}
			<div className="border-t border-surface-border/60" />

			{/* ── Boards (sessions) ───────────────────────────────────────────────── */}
			<div className="flex flex-col gap-1.5 flex-1">
				<div className="flex items-center justify-between">
					<span className="text-xs text-text-tertiary font-mono uppercase tracking-widest">
						Boards
					</span>
					<button
						type="button"
						onClick={() => setBoardModalOpen(true)}
						title="New board"
						className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors rounded hover:bg-surface-overlay"
					>
						<svg
							width="10"
							height="10"
							viewBox="0 0 10 10"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						>
							<path d="M5 2 V8 M2 5 H8" />
						</svg>
					</button>
				</div>

				<div className="flex flex-col gap-0.5">
					{boards.map((board) => {
						const isActive = board.id === activeBoardId;
						return (
							<div key={board.id} className="group flex items-center gap-1">
								<button
									type="button"
									onClick={() => onSelectBoard(board.id)}
									className={[
										"flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-200 ease-out text-left flex-1 min-w-0 border border-transparent",
										isActive
											? "bg-surface-overlay text-text-primary border-surface-border"
											: "text-text-secondary hover:bg-surface-overlay/60 hover:border-surface-border/50 hover:translate-x-[2px] hover:text-text-primary",
									].join(" ")}
								>
									<span
										className={[
											"w-2 h-2 rounded-full shrink-0",
											isActive
												? "bg-accent"
												: "bg-transparent border border-surface-border",
										].join(" ")}
									/>
									<span className="truncate">{board.name}</span>
								</button>

								{/* Delete board — only show on hover, never for the last board */}
								{boards.length > 1 && (
									<button
										type="button"
										onClick={() => onDeleteBoard(board.id)}
										title="Delete board"
										className="w-4 h-4 flex items-center justify-center text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all duration-150 shrink-0"
									>
										<svg
											width="8"
											height="8"
											viewBox="0 0 8 8"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
										>
											<path d="M1.5 1.5 L6.5 6.5 M6.5 1.5 L1.5 6.5" />
										</svg>
									</button>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* ── Bottom ──────────────────────────────────────────────────────────── */}
			<div className="border-t border-surface-border pt-4 shrink-0">
				{/* Active workspace repo path */}
				<p
					className="text-[10px] text-text-tertiary font-mono truncate mb-3"
					title={workspace.repoPath}
				>
					{workspace.repoPath}
				</p>
				<button
					type="button"
					className="text-xs text-text-tertiary hover:text-text-secondary font-mono transition-colors active:-translate-y-px"
				>
					Settings
				</button>
			</div>

			{/* New board modal */}
			<SessionsCardModal
				open={boardModalOpen}
				value={newBoardName}
				onChange={setNewBoardName}
				onClose={() => {
					setBoardModalOpen(false);
					setNewBoardName("");
				}}
				onCreate={handleCreateBoard}
			/>
		</aside>
	);
}
