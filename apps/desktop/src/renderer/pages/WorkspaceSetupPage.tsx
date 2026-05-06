import type { AgentProvider, Workspace } from "@riza/shared";
import { AGENT_COMMANDS } from "@riza/shared";
import { useState } from "react";

interface WorkspaceSetupPageProps {
	onWorkspaceCreated: (workspace: Workspace) => void;
	/** When true, renders as a modal panel instead of full-screen */
	isModal?: boolean;
	onCancel?: () => void;
}

const PROVIDERS: { id: AgentProvider; label: string; hint: string }[] = [
	{ id: "claude-code", label: "Claude Code", hint: "claude" },
	{ id: "codex", label: "Codex", hint: "codex" },
	{ id: "gemini", label: "Gemini CLI", hint: "gemini" },
	{ id: "amp", label: "Amp", hint: "amp" },
];

export function WorkspaceSetupPage({
	onWorkspaceCreated,
	isModal = false,
	onCancel,
}: WorkspaceSetupPageProps) {
	const [name, setName] = useState("");
	const [repoPath, setRepoPath] = useState("");
	const [providers, setProviders] = useState<AgentProvider[]>(["claude-code"]);
	const [error, setError] = useState<string | null>(null);

	function toggleProvider(id: AgentProvider) {
		setProviders((prev) =>
			prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
		);
	}

	async function handlePickFolder() {
		if (window.riza?.dialog) {
			const path = await window.riza.dialog.openFolder();
			if (path) setRepoPath(path);
		} else {
			const path = window.prompt(
				"Enter repo path (folder picker unavailable):",
			);
			if (path) setRepoPath(path);
		}
	}

	function handleCreate() {
		setError(null);
		if (!name.trim()) {
			setError("Workspace name is required.");
			return;
		}
		if (!repoPath.trim()) {
			setError("Select a repository folder.");
			return;
		}
		if (providers.length === 0) {
			setError("Select at least one agent provider.");
			return;
		}

		// Stub — real impl calls window.riza.workspace.create via IPC
		const workspace: Workspace = {
			id: crypto.randomUUID(),
			name: name.trim(),
			repoPath: repoPath.trim(),
			worktreeRoot: `${repoPath.trim()}/.riza-worktrees`,
			providers,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		onWorkspaceCreated(workspace);
	}

	return (
		<div
			className={
				isModal
					? "bg-surface-raised rounded-panel px-10 py-10 w-full"
					: "min-h-[100dvh] bg-[#09090b] flex items-center"
			}
		>
			<div
				className={
					isModal ? "w-full" : "pl-[10vw] pr-[6vw] w-full max-w-[780px]"
				}
			>
				{/* Modal close button */}
				{isModal && onCancel && (
					<div className="flex justify-end mb-4">
						<button
							type="button"
							onClick={onCancel}
							className="text-xs font-mono text-text-tertiary hover:text-text-secondary transition-colors"
						>
							✕ Cancel
						</button>
					</div>
				)}
				{/* Eyebrow */}
				<p className="text-text-tertiary font-mono text-xs tracking-widest uppercase mb-6">
					Riza
				</p>

				{/* Heading — left aligned, no centering (DESIGN_VARIANCE 8) */}
				<h1 className="text-4xl font-semibold tracking-tighter text-text-primary leading-none mb-2">
					{isModal ? "New workspace" : "Create your first workspace"}
				</h1>
				<p className="text-text-secondary text-sm leading-relaxed mb-10 max-w-[45ch]">
					Point Riza at a git repository. Each workspace gets its own board.
					Agents run in isolated worktrees so they never step on each other.
				</p>

				<div className="flex flex-col gap-6">
					{/* Workspace name */}
					<div className="flex flex-col gap-2">
						<label className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
							Workspace name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="my-project"
							className="bg-surface-raised border border-surface-border rounded-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:border-accent/60 transition-colors duration-200 w-full max-w-sm"
						/>
					</div>

					{/* Repo path */}
					<div className="flex flex-col gap-2">
						<label className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
							Repository
						</label>
						<div className="flex items-center gap-3">
							<input
								type="text"
								value={repoPath}
								onChange={(e) => setRepoPath(e.target.value)}
								placeholder="/Users/you/your-repo"
								className="bg-surface-raised border border-surface-border rounded-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:border-accent/60 transition-colors duration-200 flex-1 max-w-sm"
							/>
							<button
								type="button"
								onClick={handlePickFolder}
								className="px-4 py-2.5 rounded-card border border-surface-border text-xs font-mono text-text-secondary hover:text-text-primary hover:border-surface-muted transition-colors duration-200 active:scale-[0.98] shrink-0"
							>
								Browse
							</button>
						</div>
					</div>

					{/* Agent providers */}
					<div className="flex flex-col gap-3">
						<label className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
							Agent providers
						</label>
						<div className="flex flex-wrap gap-2">
							{PROVIDERS.map((p) => {
								const active = providers.includes(p.id);
								return (
									<button
										key={p.id}
										type="button"
										onClick={() => toggleProvider(p.id)}
										className={[
											"flex items-center gap-2 px-3 py-2 rounded-card border text-xs font-mono transition-all duration-200 active:scale-[0.98]",
											active
												? "border-accent/60 bg-accent/10 text-text-primary"
												: "border-surface-border bg-surface-raised text-text-tertiary hover:border-surface-muted hover:text-text-secondary",
										].join(" ")}
									>
										<span
											className={[
												"w-1.5 h-1.5 rounded-full",
												active ? "bg-accent" : "bg-surface-muted",
											].join(" ")}
										/>
										{p.label}
									</button>
								);
							})}
						</div>
						<p className="text-[11px] text-text-tertiary font-mono">
							Riza will detect which CLIs are installed on your machine.
						</p>
					</div>

					{/* Error */}
					{error && <p className="text-xs text-red-400 font-mono">{error}</p>}

					{/* Submit */}
					<div className="pt-2 flex items-center gap-4">
						<button
							type="button"
							onClick={handleCreate}
							className="px-6 py-2.5 rounded-card bg-accent hover:bg-accent-hover text-white text-sm font-medium tracking-tight transition-colors duration-200 active:scale-[0.98]"
						>
							Create workspace
						</button>
						{isModal && onCancel && (
							<button
								type="button"
								onClick={onCancel}
								className="text-sm font-mono text-text-tertiary hover:text-text-secondary transition-colors"
							>
								Cancel
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
