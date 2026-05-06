import type { Card } from "@riza/shared";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

interface KanbanCardProps {
  card: Card;
  isBlocked: boolean;
  onPlay?: () => void;
  onStop?: () => void;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Extract just the task description from the assembled prompt
function extractTaskPreview(description: string): string {
  // Try to get content from <task> tags
  const match = /<task>\n?([\s\S]*?)\n?<\/task>/.exec(description);
  if (match?.[1]?.trim()) return match[1].trim();
  // Fallback: return the raw description (pre-modal cards)
  return description;
}

const PROVIDER_LABELS: Record<string, string> = {
  "claude-code": "Claude",
  codex: "Codex",
  gemini: "Gemini",
  amp: "Amp",
};

export function KanbanCard({
  card,
  isBlocked,
  onPlay,
  onStop,
  onOpen,
  onEdit,
  onDelete,
}: KanbanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  const isRunning = card.status === "running";
  const isDone = card.status === "done";
  const isFailed = card.status === "failed";
  const isWaiting = card.status === "waiting";
  const isActive = isRunning || isWaiting;

  // Can't edit or delete while the agent is actively running
  const canMutate = !isRunning && !isWaiting;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={() => {
        if (!menuOpen) onOpen?.();
      }}
      className="spotlight-card p-3 cursor-pointer select-none active:scale-[0.98] transition-transform duration-150 group"
    >
      {/* Top row: status dot + provider + actions */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`status-dot-${card.status}`} />
          {isWaiting && (
            <span className="text-[9px] font-mono text-yellow-500 uppercase tracking-widest">
              Needs your action
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
            {PROVIDER_LABELS[card.agent.provider] ?? card.agent.provider}
          </span>

          {/* Play / Stop */}
          {!isDone && !isFailed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                isActive ? onStop?.() : onPlay?.();
              }}
              disabled={isBlocked}
              className={[
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90",
                isBlocked
                  ? "opacity-30 cursor-not-allowed border border-surface-border"
                  : isActive
                    ? "bg-surface-overlay border border-surface-border hover:border-red-500/60 hover:text-red-400 text-text-tertiary"
                    : "bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent",
              ].join(" ")}
            >
              {isActive ? (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="0.5" />
                </svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                  <path d="M2 1.5 L7 4 L2 6.5 Z" />
                </svg>
              )}
            </button>
          )}

          {isDone && (
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
              >
                <path
                  d="M1.5 4 L3.5 6 L6.5 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          {isFailed && (
            <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.5"
              >
                <path d="M2 2 L6 6 M6 2 L2 6" strokeLinecap="round" />
              </svg>
            </div>
          )}

          {/* ··· context menu — only visible on hover */}
          <div className="relative">
            <button
              ref={menuBtnRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!menuOpen && menuBtnRef.current) {
                  const r = menuBtnRef.current.getBoundingClientRect();
                  setMenuPos({ top: r.bottom + 4, left: r.right - 128 });
                }
                setMenuOpen((v) => !v);
              }}
              className="w-5 h-5 rounded flex items-center justify-center text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-text-primary hover:bg-surface-overlay transition-all duration-150"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <circle cx="2" cy="5" r="1" />
                <circle cx="5" cy="5" r="1" />
                <circle cx="8" cy="5" r="1" />
              </svg>
            </button>

            {menuOpen &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0"
                    style={{ zIndex: 60 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    className="fixed w-32 glass-panel rounded-card border border-surface-border py-1 flex flex-col"
                    style={{ zIndex: 61, top: menuPos.top, left: menuPos.left }}
                  >
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit?.();
                      }}
                      className={[
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors duration-100",
                        canMutate
                          ? "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
                          : "text-text-tertiary opacity-40 cursor-not-allowed",
                      ].join(" ")}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      >
                        <path d="M7 1.5 L8.5 3 L3.5 8 L1.5 8.5 L2 6.5 Z" />
                      </svg>
                      Edit
                    </button>

                    <div className="border-t border-surface-border/50 my-1" />

                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete?.();
                      }}
                      className={[
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors duration-100",
                        canMutate
                          ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          : "text-text-tertiary opacity-40 cursor-not-allowed",
                      ].join(" ")}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      >
                        <path d="M2 3.5 H8 M4 3.5 V2 H6 V3.5 M3.5 3.5 L4 8 H6 L6.5 3.5" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </>,
                document.body,
              )}
          </div>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-text-primary leading-snug line-clamp-2 mb-1">
        {card.title}
      </p>

      {/* Description preview — shows task text, not full prompt */}
      {card.description && (
        <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2">
          {extractTaskPreview(card.description)}
        </p>
      )}

      {/* Blocked footer */}
      {(isBlocked || card.dependsOn.length > 0) && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-surface-border/50">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="#71717a"
            strokeWidth="1.2"
          >
            <rect x="2" y="4.5" width="6" height="4.5" rx="0.8" />
            <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[9px] font-mono text-text-tertiary">
            blocked
          </span>
        </div>
      )}
    </div>
  );
}
