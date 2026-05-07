import type {
	DragEndEvent,
	DragOverEvent,
	DragStartEvent,
} from "@dnd-kit/core";
import {
	closestCorners,
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { AgentProvider, Board, Card, Workspace } from "@riza/shared";
import { useEffect, useState } from "react";
import { CardDetailPanel } from "./CardDetailPanel";
import { CardModal } from "./CardModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { Column } from "./Column";
import { KanbanCard } from "./KanbanCard";

export interface BoardProps {
	workspace: Workspace;
	board: Board;
	cards: Card[];
	onCardsChange: (updater: (prev: Card[]) => Card[]) => void;
}

function makeId() {
	return crypto.randomUUID();
}

export function Board({ workspace, board, cards, onCardsChange }: BoardProps) {
	const [openCardId, setOpenCardId] = useState<string | null>(null);
	const [panelMode, setPanelMode] = useState<"detail" | "terminal">("detail");
	const [activeCard, setActiveCard] = useState<Card | null>(null);
	const [editingCard, setEditingCard] = useState<Card | null>(null);
	const [deletingCard, setDeletingCard] = useState<Card | null>(null);

	// ── Scheduler listeners ────────────────────────────────────────────────

	useEffect(() => {
		// Re-register all idle scheduled cards so timers survive hot-reloads and
		// app restarts (renderer calls this on every mount).
		for (const card of cards) {
			if (card.scheduledAt && card.status === "idle") {
				window.riza?.card.schedule({
					cardId: card.id,
					provider: card.agent.provider,
					description: card.prompt,
					worktreePath: workspace.repoPath,
					scheduledAt: card.scheduledAt,
					model: card.agent.model,
					dependsOn: card.dependsOn,
				});
			}
		}

		// When the scheduler fires a card, update its status to running in React
		// state. The PTY is already spawning via spawnAgent on the main side.
		const offFire = window.riza?.card.onFire((cardId) => {
			onCardsChange((prev) =>
				prev.map((c) =>
					c.id === cardId
						? { ...c, status: "running", updatedAt: new Date().toISOString() }
						: c,
				),
			);
			setOpenCardId(cardId);
			setPanelMode("terminal");
		});

		// When a scheduled time is already past on registration, mark card overdue
		// (no status change — just a visual flag via re-render; the pill reads the date).
		// Nothing extra needed here — ScheduledPill computes overdue from the date itself.
		const offOverdue = window.riza?.card.onOverdue((_cardId) => {
			// Trigger a re-render so the pill recalculates.
			onCardsChange((prev) => [...prev]);
		});

		return () => {
			offFire?.();
			offOverdue?.();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [board.id]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
	);

	const doneIds = new Set(
		cards.filter((c) => c.status === "done").map((c) => c.id),
	);
	const blockedCardIds = new Set(
		cards
			.filter((c) => c.dependsOn.some((dep) => !doneIds.has(dep)))
			.map((c) => c.id),
	);

	// ── Drag ──────────────────────────────────────────────────────────────────

	function onDragStart({ active }: DragStartEvent) {
		setActiveCard(cards.find((c) => c.id === active.id) ?? null);
	}

	function onDragOver({ active, over }: DragOverEvent) {
		if (!over) return;
		const activeId = active.id as string;
		const overId = over.id as string;
		if (activeId === overId) return;
		const card = cards.find((c) => c.id === activeId);
		if (!card) return;
		const overColumn = board.columns.find((col) => col.id === overId);
		if (overColumn && card.columnId !== overId) {
			onCardsChange((prev) =>
				prev.map((c) =>
					c.id === activeId
						? {
								...c,
								columnId: overId,
								order: prev.filter((x) => x.columnId === overId).length,
							}
						: c,
				),
			);
		}
	}

	function onDragEnd({ active, over }: DragEndEvent) {
		setActiveCard(null);
		if (!over) return;
		const activeId = active.id as string;
		const overId = over.id as string;
		if (activeId === overId) return;
		onCardsChange((prev) => {
			const card = prev.find((c) => c.id === activeId);
			if (!card) return prev;
			const overColumn = board.columns.find((col) => col.id === overId);
			if (overColumn)
				return prev.map((c) =>
					c.id === activeId ? { ...c, columnId: overId } : c,
				);
			const overCard = prev.find((c) => c.id === overId);
			if (!overCard) return prev;
			if (card.columnId !== overCard.columnId) {
				return prev.map((c) =>
					c.id === activeId ? { ...c, columnId: overCard.columnId } : c,
				);
			}
			const colCards = prev
				.filter((c) => c.columnId === card.columnId)
				.sort((a, b) => a.order - b.order);
			const oldIndex = colCards.findIndex((c) => c.id === activeId);
			const newIndex = colCards.findIndex((c) => c.id === overId);
			const reordered = arrayMove(colCards, oldIndex, newIndex).map((c, i) => ({
				...c,
				order: i,
			}));
			return prev.map((c) => reordered.find((r) => r.id === c.id) ?? c);
		});
	}

	// ── Card CRUD ─────────────────────────────────────────────────────────────

	function addCard(
		columnId: string,
		title: string,
		description: string,
		prompt: string,
		provider: AgentProvider,
		dependsOn: string[] = [],
		scheduledAt: string | null = null,
	) {
		const id = makeId();
		onCardsChange((prev) => [
			...prev,
			{
				id,
				boardId: board.id,
				columnId,
				title,
				description,
				prompt,
				agent: { provider },
				channelId: makeId(),
				status: "idle",
				raisedHand: false,
				order: prev.filter((c) => c.columnId === columnId).length,
				dependsOn,
				scheduledAt,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		]);
		if (scheduledAt) {
			window.riza?.card.schedule({
				cardId: id,
				provider,
				description: prompt,
				worktreePath: workspace.repoPath,
				scheduledAt,
				dependsOn,
			});
		}
	}

	function editCard(
		cardId: string,
		title: string,
		description: string,
		prompt: string,
		provider: AgentProvider,
		dependsOn: string[],
		scheduledAt: string | null = null,
	) {
		onCardsChange((prev) =>
			prev.map((c) =>
				c.id === cardId
					? {
							...c,
							title,
							description,
							prompt,
							agent: { ...c.agent, provider },
							dependsOn,
							scheduledAt,
							updatedAt: new Date().toISOString(),
						}
					: c,
			),
		);
		// Always cancel the old timer first, then re-register if a new time is set
		window.riza?.card.unschedule(cardId);
		if (scheduledAt) {
			window.riza?.card.schedule({
				cardId,
				provider,
				description: prompt,
				worktreePath: workspace.repoPath,
				scheduledAt,
				dependsOn,
			});
		}
	}

	function deleteCard(cardId: string) {
		const card = cards.find((c) => c.id === cardId);
		if (!card) return;
		const dependents = cards.filter((c) => c.dependsOn.includes(cardId));
		if (dependents.length > 0) {
			setDeletingCard(card);
			return;
		}
		if (card.status === "running" || card.status === "waiting") {
			window.riza?.agent.kill(cardId);
		}
		window.riza?.card.unschedule(cardId);
		if (openCardId === cardId) setOpenCardId(null);
		if (editingCard?.id === cardId) setEditingCard(null);
		onCardsChange((prev) => prev.filter((c) => c.id !== cardId));
	}

	function deleteCardCascade(cardId: string) {
		const card = cards.find((c) => c.id === cardId);
		if (!card) return;
		const dependents = cards.filter((c) => c.dependsOn.includes(cardId));
		const idsToDelete = new Set([cardId]);
		for (const dep of dependents) {
			if (dep.status === "running" || dep.status === "waiting") {
				window.riza?.agent.kill(dep.id);
			}
			idsToDelete.add(dep.id);
		}
		if (card.status === "running" || card.status === "waiting") {
			window.riza?.agent.kill(cardId);
		}
		if (openCardId && idsToDelete.has(openCardId)) setOpenCardId(null);
		if (editingCard && idsToDelete.has(editingCard.id)) setEditingCard(null);
		onCardsChange((prev) => prev.filter((c) => !idsToDelete.has(c.id)));
		setDeletingCard(null);
	}

	function deleteCardOnly(cardId: string) {
		const card = cards.find((c) => c.id === cardId);
		if (!card) return;
		if (card.status === "running" || card.status === "waiting") {
			window.riza?.agent.kill(cardId);
		}
		if (openCardId === cardId) setOpenCardId(null);
		if (editingCard?.id === cardId) setEditingCard(null);
		onCardsChange((prev) =>
			prev
				.filter((c) => c.id !== cardId)
				.map((c) => ({
					...c,
					dependsOn: c.dependsOn.filter((id) => id !== cardId),
				})),
		);
		setDeletingCard(null);
	}

	function playCard(cardId: string) {
		const card = cards.find((c) => c.id === cardId);
		if (!card) return;
		// Cancel any pending scheduled timer — this is a manual override
		window.riza?.card.unschedule(cardId);
		onCardsChange((prev) =>
			prev.map((c) =>
				c.id === cardId
					? { ...c, status: "running", updatedAt: new Date().toISOString() }
					: c,
			),
		);
		setOpenCardId(cardId);
		setPanelMode("terminal");
		window.riza?.agent
			.spawn({
				cardId,
				provider: card.agent.provider,
				description: card.prompt,
				worktreePath: workspace.repoPath,
				model: card.agent.model,
			})
			?.catch((err: unknown) =>
				console.error("[board] agent:spawn error:", err),
			);
	}

	function stopCard(cardId: string) {
		onCardsChange((prev) =>
			prev.map((c) =>
				c.id === cardId
					? { ...c, status: "idle", updatedAt: new Date().toISOString() }
					: c,
			),
		);
		window.riza?.agent.kill(cardId);
	}

	function runAll(columnId: string) {
		const eligible = cards.filter(
			(c) =>
				c.columnId === columnId &&
				c.status === "idle" &&
				!blockedCardIds.has(c.id),
		);
		for (const card of eligible) {
			playCard(card.id);
		}
	}

	// ── Render ─────────────────────────────────────────────────────────────────

	const openCard = cards.find((c) => c.id === openCardId);

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragEnd={onDragEnd}
		>
			<div className="flex flex-col min-h-[100dvh]">
				{/* Board header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
					<div>
						<h2 className="text-sm font-semibold tracking-tight text-text-primary">
							{board.name}
						</h2>
						<p className="text-[11px] font-mono text-text-tertiary truncate max-w-[300px]">
							{workspace.repoPath}
						</p>
					</div>
					<div className="flex items-center gap-4 text-[11px] font-mono text-text-tertiary">
						<div className="status-dot-running" />
						<span>
							{cards.filter((c) => c.status === "running").length} Running
						</span>
						<div className="status-dot-waiting" />
						<span>
							{cards.filter((c) => c.status === "waiting").length} Waiting
						</span>
						<div className="status-dot-done" />
						<span>{cards.filter((c) => c.status === "done").length} Done</span>
					</div>
				</div>

				{/* Columns */}
				<div className="flex gap-5 px-6 py-5 overflow-x-auto flex-1 items-start">
					{board.columns.map((col) => (
						<Column
							key={col.id}
							column={col}
							cards={cards
								.filter((c) => c.columnId === col.id)
								.sort((a, b) => a.order - b.order)}
							allCards={cards}
							blockedCardIds={blockedCardIds}
							onAddCard={(
								title,
								desc,
								prompt,
								provider,
								dependsOn,
								scheduledAt,
							) =>
								addCard(
									col.id,
									title,
									desc,
									prompt,
									provider,
									dependsOn,
									scheduledAt,
								)
							}
							onEditCard={editCard}
							onOpenEditModal={setEditingCard}
							onDeleteCard={deleteCard}
							onRunAll={() => runAll(col.id)}
							onPlayCard={playCard}
							onStopCard={stopCard}
							onOpenCard={(cardId: string) => {
								const c = cards.find((x) => x.id === cardId);
								setOpenCardId(cardId);
								setPanelMode(
									c && (c.status === "running" || c.status === "waiting")
										? "terminal"
										: "detail",
								);
							}}
						/>
					))}
				</div>
			</div>

			{/* Drag ghost */}
			<DragOverlay>
				{activeCard ? (
					<div className="rotate-1 scale-105">
						<KanbanCard
							card={activeCard}
							isBlocked={blockedCardIds.has(activeCard.id)}
							onPlay={() => {}}
							onStop={() => {}}
							onOpen={() => {}}
							onEdit={() => {}}
							onDelete={() => {}}
						/>
					</div>
				) : null}
			</DragOverlay>

			{/* Edit modal */}
			{editingCard && (
				<CardModal
					columnId={editingCard.columnId}
					allCards={cards}
					existing={editingCard}
					onConfirm={(
						title,
						description,
						prompt,
						provider,
						dependsOn,
						scheduledAt,
					) => {
						editCard(
							editingCard.id,
							title,
							description,
							prompt,
							provider,
							dependsOn,
							scheduledAt,
						);
						setEditingCard(null);
					}}
					onCancel={() => setEditingCard(null)}
				/>
			)}

			{/* Delete confirmation */}
			{deletingCard && (
				<DeleteConfirmModal
					card={deletingCard}
					dependents={cards.filter((c) =>
						c.dependsOn.includes(deletingCard.id),
					)}
					onConfirmCascade={() => deleteCardCascade(deletingCard.id)}
					onConfirmOnlyThis={() => deleteCardOnly(deletingCard.id)}
					onCancel={() => setDeletingCard(null)}
				/>
			)}

			{/* Side panel — detail or terminal */}
			{openCard && panelMode === "detail" && (
				<CardDetailPanel
					card={openCard}
					allCards={cards}
					isOpen={true}
					onClose={() => setOpenCardId(null)}
					onEdit={() => setEditingCard(openCard)}
					onPlay={() => playCard(openCard.id)}
					onStop={() => stopCard(openCard.id)}
					onViewTerminal={() => setPanelMode("terminal")}
					isBlocked={blockedCardIds.has(openCard.id)}
				/>
			)}

			{openCard && panelMode === "terminal" && (
				<TerminalPanel
					card={openCard}
					isOpen={true}
					onClose={() => setOpenCardId(null)}
				/>
			)}
		</DndContext>
	);
}
