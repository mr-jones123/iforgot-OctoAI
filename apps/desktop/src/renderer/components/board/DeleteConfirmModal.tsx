import type { Card } from "@riza/shared";
import { useEffect, useState } from "react";

interface DeleteConfirmModalProps {
	card: Card;
	dependents: Card[];
	onConfirmCascade: () => void;
	onConfirmOnlyThis: () => void;
	onCancel: () => void;
}

export function DeleteConfirmModal({
	card,
	dependents,
	onConfirmCascade,
	onConfirmOnlyThis,
	onCancel,
}: DeleteConfirmModalProps) {
	const [mode, setMode] = useState<"cascade" | "only" | null>(null);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onCancel]);

	function handleConfirm() {
		if (mode === "cascade") onConfirmCascade();
		else if (mode === "only") onConfirmOnlyThis();
	}

	const canConfirm = mode !== null;

	return (
		<div
			className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
			style={{ zIndex: 70 }}
			onClick={onCancel}
			role="dialog"
			aria-modal="true"
		>
			<div
				className="glass-panel rounded-panel w-full max-w-md mx-4 flex flex-col overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="px-6 pt-5 pb-0">
					<div className="flex items-center gap-2 mb-1">
						<div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
							<svg
								width="8"
								height="8"
								viewBox="0 0 8 8"
								fill="none"
								stroke="#ef4444"
								strokeWidth="1.5"
								strokeLinecap="round"
							>
								<path d="M2 2 L6 6 M6 2 L2 6" />
							</svg>
						</div>
						<h2 className="text-sm font-semibold tracking-tight text-text-primary">
							Delete task
						</h2>
					</div>
					<p className="text-xs text-text-tertiary font-mono">"{card.title}"</p>
				</div>

				{/* Body */}
				<div className="px-6 py-4 flex flex-col gap-4">
					<p className="text-sm text-text-secondary leading-relaxed">
						{dependents.length} card
						{dependents.length > 1 ? "s depend" : " depends"} on this task. What
						should we do with them?
					</p>

					{/* Dependent cards list */}
					<div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
						{dependents.map((dep) => (
							<div
								key={dep.id}
								className="flex items-center gap-2 px-3 py-2 rounded-card border border-surface-border"
							>
								<div className={`status-dot-${dep.status}`} />
								<span className="text-xs font-medium text-text-primary flex-1 truncate">
									{dep.title}
								</span>
								<span className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
									{dep.status}
								</span>
							</div>
						))}
					</div>

					{/* Options */}
					<div className="flex flex-col gap-2">
						<button
							type="button"
							onClick={() => setMode(mode === "cascade" ? null : "cascade")}
							className={[
								"flex items-start gap-3 px-4 py-3 rounded-card border text-left transition-all duration-150 active:scale-[0.98]",
								mode === "cascade"
									? "border-red-500/60 bg-red-500/10"
									: "border-surface-border hover:border-surface-muted",
							].join(" ")}
						>
							<div
								className={[
									"w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
									mode === "cascade"
										? "border-red-500 bg-red-500"
										: "border-surface-border",
								].join(" ")}
							>
								{mode === "cascade" && (
									<svg width="6" height="6" viewBox="0 0 6 6" fill="white">
										<circle cx="3" cy="3" r="2.5" />
									</svg>
								)}
							</div>
							<div>
								<p className="text-xs font-medium text-text-primary">
									Delete all
								</p>
								<p className="text-[11px] text-text-tertiary mt-0.5">
									Remove this task and all {dependents.length} dependent card
									{dependents.length > 1 ? "s" : ""}
								</p>
							</div>
						</button>

						<button
							type="button"
							onClick={() => setMode(mode === "only" ? null : "only")}
							className={[
								"flex items-start gap-3 px-4 py-3 rounded-card border text-left transition-all duration-150 active:scale-[0.98]",
								mode === "only"
									? "border-accent/60 bg-accent/10"
									: "border-surface-border hover:border-surface-muted",
							].join(" ")}
						>
							<div
								className={[
									"w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
									mode === "only"
										? "border-accent bg-accent"
										: "border-surface-border",
								].join(" ")}
							>
								{mode === "only" && (
									<svg width="6" height="6" viewBox="0 0 6 6" fill="white">
										<circle cx="3" cy="3" r="2.5" />
									</svg>
								)}
							</div>
							<div>
								<p className="text-xs font-medium text-text-primary">
									Delete only this task
								</p>
								<p className="text-[11px] text-text-tertiary mt-0.5">
									Keep dependent cards but remove the dependency link
								</p>
							</div>
						</button>
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-surface-border flex items-center justify-between shrink-0">
					<button
						type="button"
						onClick={onCancel}
						className="text-xs font-mono text-text-tertiary hover:text-text-secondary transition-colors active:scale-[0.97]"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={!canConfirm}
						className={[
							"px-4 py-2 rounded-card text-xs font-medium transition-colors duration-150 active:scale-[0.97]",
							canConfirm
								? mode === "cascade"
									? "bg-red-500 hover:bg-red-600 text-white"
									: "bg-accent hover:bg-accent-hover text-white"
								: "bg-surface-overlay border border-surface-border text-text-tertiary cursor-not-allowed",
						].join(" ")}
					>
						{mode === "cascade"
							? `Delete ${dependents.length + 1} cards`
							: mode === "only"
								? "Delete 1 card"
								: "Delete"}
					</button>
				</div>
			</div>
		</div>
	);
}
