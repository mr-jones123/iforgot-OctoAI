import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { AgentProvider, Card, Column as ColumnType } from "@riza/shared";
import { useState } from "react";
import { CardModal } from "./CardModal";
import { SortableCard } from "./SortableCard";

interface ColumnProps {
  column: ColumnType;
  cards: Card[];
  onRunAll?: () => void;
  onAddCard: (
    title: string,
    description: string,
    prompt: string,
    provider: AgentProvider,
  ) => void;
  onEditCard: (
    cardId: string,
    title: string,
    description: string,
    prompt: string,
    provider: AgentProvider,
  ) => void;
  onDeleteCard: (cardId: string) => void;
  onPlayCard: (cardId: string) => void;
  onStopCard: (cardId: string) => void;
  onOpenCard: (cardId: string) => void;
  blockedCardIds: Set<string>;
}

export function Column({
  column,
  cards,
  onRunAll,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onPlayCard,
  onStopCard,
  onOpenCard,
  blockedCardIds,
}: ColumnProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const runnable = cards.filter((c) => c.status === "idle").length;
  const isReview = column.isReviewGate;

  return (
    <>
      <div
        className="flex flex-col w-[272px] shrink-0"
        style={
          isReview
            ? { borderLeft: "2px solid #f59e0b", paddingLeft: "10px" }
            : undefined
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary tracking-tight">
              {column.title}
            </span>
            {cards.length > 0 && (
              <span className="text-[10px] font-mono text-text-tertiary tabular-nums">
                {cards.length}
              </span>
            )}
            {isReview && (
              <span className="text-[9px] font-mono text-yellow-500/80 uppercase tracking-widest">
                gate
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isReview && runnable > 0 && (
              <button
                type="button"
                onClick={onRunAll}
                title={`Run all ${runnable} idle tasks`}
                className="flex items-center gap-1 px-2 py-1 rounded border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors duration-150 active:scale-[0.97]"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                  <path d="M1.5 1 L7 4 L1.5 7 Z" />
                </svg>
                <span className="text-[9px] font-mono">{runnable}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              title="Add task"
              className="w-6 h-6 flex items-center justify-center rounded border border-surface-border text-text-tertiary hover:text-text-primary hover:border-surface-muted transition-colors duration-150 active:scale-[0.97]"
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
        </div>

        {/* Droppable list */}
        <div
          ref={setNodeRef}
          className={[
            "flex flex-col gap-2 min-h-[80px] rounded-card transition-colors duration-150 p-1",
            isOver ? "bg-accent/5 ring-1 ring-accent/20" : "",
          ].join(" ")}
        >
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.length === 0 ? (
              <div
                className="flex items-center justify-center py-8 border border-dashed border-surface-border/60 rounded-card cursor-pointer hover:border-surface-muted/80 transition-colors duration-200"
                onClick={() => setShowAddModal(true)}
              >
                <span className="text-[11px] text-text-tertiary font-mono">
                  + Add Task
                </span>
              </div>
            ) : (
              cards.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  isBlocked={blockedCardIds.has(card.id)}
                  onPlay={() => onPlayCard(card.id)}
                  onStop={() => onStopCard(card.id)}
                  onOpen={() => onOpenCard(card.id)}
                  onEdit={() => setEditingCard(card)}
                  onDelete={() => onDeleteCard(card.id)}
                />
              ))
            )}
          </SortableContext>
        </div>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <CardModal
          columnId={column.id}
          onConfirm={(title, description, prompt, provider) => {
            onAddCard(title, description, prompt, provider);
            setShowAddModal(false);
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Edit modal */}
      {editingCard && (
        <CardModal
          columnId={column.id}
          existing={editingCard}
          onConfirm={(title, description, prompt, provider) => {
            onEditCard(editingCard.id, title, description, prompt, provider);
            setEditingCard(null);
          }}
          onCancel={() => setEditingCard(null)}
        />
      )}
    </>
  );
}
