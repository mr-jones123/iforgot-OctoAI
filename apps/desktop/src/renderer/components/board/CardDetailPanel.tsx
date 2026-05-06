import type { Card } from "@riza/shared";
import { memo } from "react";

interface CardDetailPanelProps {
	card: Card;
	allCards: Card[];
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onPlay: () => void;
	onStop: () => void;
	onViewTerminal: () => void;
	isBlocked: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
	"claude-code": "Claude Code",
	codex: "Codex",
	gemini: "Gemini CLI",
	ollama: "Ollama",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
	idle: { label: "Not started", color: "text-text-tertiary" },
	running: { label: "Running", color: "text-blue-400" },
	waiting: { label: "Waiting", color: "text-yellow-400" },
	done: { label: "Completed", color: "text-emerald-400" },
	failed: { label: "Failed", color: "text-red-400" },
};

export const CardDetailPanel = memo(function CardDetailPanel({
	card,
	allCards,
	isOpen,
	onClose,
	onEdit,
	onPlay,
	onStop,
	onViewTerminal,
	isBlocked,
}: CardDetailPanelProps) {
	if (!isOpen) return null;

	const isRunning = card.status === "running" || card.status === "waiting";
	const hasRun =
		card.status === "running" ||
		card.status === "waiting" ||
		card.status === "done" ||
		card.status === "failed";

	const depCards = allCards.filter((c) => card.dependsOn.includes(c.id));
	const statusInfo = STATUS_LABELS[card.status] ?? {
		label: card.status,
		color: "text-text-tertiary",
	};

	return (
		<div
			className={[
				"fixed inset-y-0 right-0 w-[680px] flex flex-col",
				"glass-panel border-l border-surface-border",
				"transition-transform duration-300",
				isOpen ? "translate-x-0" : "translate-x-full",
			].join(" ")}
			style={{
				zIndex: 40,
				transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
			}}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
				<div className="flex items-center gap-3 min-w-0">
					<div className={`status-dot-${card.status}`} />
					<span className="text-sm font-semibold text-text-primary tracking-tight truncate">
						{card.title}
					</span>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{/* View terminal button — only when agent has been run */}
					{hasRun && (
						<button
							type="button"
							onClick={onViewTerminal}
							className="px-3 py-1.5 rounded-card border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-text-primary hover:border-accent/40 transition-colors duration-150 active:scale-[0.97]"
						>
							Terminal
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						className="text-xs font-mono text-text-tertiary hover:text-text-primary transition-colors active:-translate-y-px"
					>
						X
					</button>
				</div>
			</div>

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
				{/* Status + Provider row */}
				<div className="flex items-center gap-4">
					<div className="flex flex-col gap-0.5">
						<span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
							Status
						</span>
						<span className={`text-sm font-medium ${statusInfo.color}`}>
							{statusInfo.label}
						</span>
					</div>
					<div className="w-px h-8 bg-surface-border" />
					<div className="flex flex-col gap-0.5">
						<span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
							Agent
						</span>
						<span className="text-sm font-medium text-text-primary">
							{PROVIDER_LABELS[card.agent.provider] ?? card.agent.provider}
						</span>
					</div>
					{card.agent.model && (
						<>
							<div className="w-px h-8 bg-surface-border" />
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
									Model
								</span>
								<span className="text-sm font-medium text-text-primary">
									{card.agent.model}
								</span>
							</div>
						</>
					)}
				</div>

				{/* Description / Prompt */}
				<div className="flex flex-col gap-2">
					<span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
						Prompt
					</span>
					<pre className="bg-surface-overlay border border-surface-border rounded-card px-4 py-3 text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
						{card.description || "No description."}
					</pre>
				</div>

				{/* Dependencies */}
				{(depCards.length > 0 || card.dependsOn.length > 0) && (
					<div className="flex flex-col gap-2">
						<span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
							Dependencies
						</span>
						<div className="flex flex-col gap-1">
							{depCards.map((dep) => {
								const depStatus = STATUS_LABELS[dep.status] ?? {
									label: dep.status,
									color: "text-text-tertiary",
								};
								return (
									<div
										key={dep.id}
										className="flex items-center gap-2 px-3 py-2 rounded-card border border-surface-border"
									>
										<div className={`status-dot-${dep.status}`} />
										<span className="text-xs font-medium text-text-primary flex-1 truncate">
											{dep.title}
										</span>
										<span
											className={`text-[9px] font-mono uppercase tracking-widest ${depStatus.color}`}
										>
											{depStatus.label}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Timestamps */}
				<div className="flex items-center gap-4 text-[10px] font-mono text-text-tertiary">
					<span>Created {new Date(card.createdAt).toLocaleString()}</span>
					<span>Updated {new Date(card.updatedAt).toLocaleString()}</span>
				</div>
			</div>

			{/* Footer — action buttons */}
			<div className="px-6 py-4 border-t border-surface-border shrink-0 flex items-center gap-3">
				{isRunning ? (
					<button
						type="button"
						onClick={onStop}
						className="px-4 py-2 rounded-card border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors duration-150 active:scale-[0.97]"
					>
						Stop agent
					</button>
				) : (
					<button
						type="button"
						onClick={onPlay}
						disabled={isBlocked}
						className={[
							"px-4 py-2 rounded-card text-xs font-medium transition-colors duration-150 active:scale-[0.97]",
							isBlocked
								? "bg-surface-overlay border border-surface-border text-text-tertiary cursor-not-allowed"
								: "bg-accent hover:bg-accent-hover text-white",
						].join(" ")}
					>
						{isBlocked ? "Blocked" : "Run task"}
					</button>
				)}
				<button
					type="button"
					onClick={onEdit}
					className="px-4 py-2 rounded-card border border-surface-border text-xs font-mono text-text-tertiary hover:text-text-primary hover:border-surface-muted transition-colors duration-150 active:scale-[0.97]"
				>
					Edit
				</button>
			</div>
		</div>
	);
});
