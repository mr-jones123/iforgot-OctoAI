import type { AgentProvider, Workspace } from "@riza/shared";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FolderOpen, Check, ArrowRight, X } from "@phosphor-icons/react";

interface WorkspaceSetupPageProps {
	onWorkspaceCreated: (workspace: Workspace) => void;
	isModal?: boolean;
	onCancel?: () => void;
}

const PROVIDERS: { id: AgentProvider; label: string; description: string }[] = [
	{ id: "claude-code", label: "Claude Code", description: "Anthropic" },
	{ id: "codex", label: "Codex", description: "OpenAI" },
	{ id: "gemini", label: "Gemini CLI", description: "Google" },
	{ id: "amp", label: "Amp", description: "Sourcegraph" },
];

// Subtle animated aurora orbs -- pure CSS, no heavy deps
function AuroraBackground() {
	return (
		<div
			className="absolute inset-0 overflow-hidden pointer-events-none"
			aria-hidden
		>
			{/* Large soft orb top-left */}
			<div
				className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
				style={{
					background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
					animation: "float 9s ease-in-out infinite",
				}}
			/>
			{/* Medium orb bottom-right */}
			<div
				className="absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full opacity-[0.05]"
				style={{
					background: "radial-gradient(circle, #818cf8 0%, transparent 70%)",
					animation: "float 12s ease-in-out infinite reverse",
				}}
			/>
			{/* Small accent orb center-right */}
			<div
				className="absolute top-1/3 right-1/4 w-[200px] h-[200px] rounded-full opacity-[0.04]"
				style={{
					background: "radial-gradient(circle, #a5b4fc 0%, transparent 70%)",
					animation: "float 7s ease-in-out infinite 2s",
				}}
			/>
		</div>
	);
}

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
			const path = window.prompt("Enter repo path:");
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

		const workspace: Workspace = {
			id: crypto.randomUUID(),
			name: name.trim(),
			repoPath: repoPath.trim(),
			worktreeRoot: `${repoPath.trim()}/.octa-worktrees`,
			providers,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		onWorkspaceCreated(workspace);
	}

	const containerVariants = {
		hidden: {},
		visible: { transition: { staggerChildren: 0.07 } },
	};
	const itemVariants = {
		hidden: { opacity: 0, y: 14 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { type: "spring", stiffness: 120, damping: 20 },
		},
	};

	if (isModal) {
		return (
			<div className="bg-surface-raised rounded-panel px-8 py-8 w-full border border-surface-border">
				{onCancel && (
					<div className="flex justify-end mb-5">
						<button
							type="button"
							onClick={onCancel}
							className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-surface-overlay transition-all duration-200"
						>
							<X size={14} weight="bold" />
						</button>
					</div>
				)}

				<p className="text-[10px] font-mono text-text-tertiary tracking-[0.18em] uppercase mb-4">
					New workspace
				</p>
				<h2 className="text-2xl font-semibold tracking-tight text-text-primary leading-none mb-6">
					Configure workspace
				</h2>

				<ModalForm
					name={name}
					setName={setName}
					repoPath={repoPath}
					setRepoPath={setRepoPath}
					providers={providers}
					toggleProvider={toggleProvider}
					handlePickFolder={handlePickFolder}
					handleCreate={handleCreate}
					onCancel={onCancel}
					error={error}
				/>
			</div>
		);
	}

	return (
		<div className="relative min-h-[100dvh] bg-[#0d0d14] flex overflow-hidden">
			{/* Dot grid layer */}
			<div
				className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none"
				aria-hidden
			/>

			{/* Aurora orbs */}
			<AuroraBackground />

			{/* Thin top border line -- matches OctoAI nav divider */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-border to-transparent" />

			{/* Left: branding column */}
			<div className="hidden lg:flex flex-col justify-between w-[44%] min-h-[100dvh] px-14 py-12 relative z-10">
				<div>
					{/* Wordmark */}
					<div className="flex items-center gap-2 mb-20">
						<span className="text-sm font-semibold tracking-[-0.01em] text-text-primary">
							octoai
						</span>
						<span className="text-[10px] font-mono text-text-tertiary px-1.5 py-0.5 rounded border border-surface-border">
							beta
						</span>
					</div>

					{/* Hero copy */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
					>
						<h1 className="text-[2.6rem] font-semibold tracking-[-0.03em] leading-[1.1] text-text-primary mb-4">
							Your agents,
							<br />
							<span className="text-text-secondary font-light">
								one workspace.
							</span>
						</h1>
						<p className="text-sm text-text-tertiary leading-relaxed max-w-[32ch]">
							Point OctoAI at a git repository. Each task card spawns a real
							interactive agent in its own isolated worktree.
						</p>
					</motion.div>
				</div>

				{/* Bottom: feature list */}
				<motion.ul
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4, duration: 0.5 }}
					className="flex flex-col gap-3"
				>
					{[
						"Isolated git worktrees per card",
						"Live PTY terminal for every agent",
						"Human review gate before merge",
					].map((item) => (
						<li
							key={item}
							className="flex items-center gap-2.5 text-xs text-text-tertiary"
						>
							<span className="w-4 h-4 rounded-full bg-surface-overlay flex items-center justify-center shrink-0">
								<Check size={9} weight="bold" className="text-text-secondary" />
							</span>
							{item}
						</li>
					))}
				</motion.ul>
			</div>

			{/* Right: form column */}
			<div className="flex-1 flex items-center justify-center min-h-[100dvh] px-8 py-12 relative z-10">
				<motion.div
					className="w-full max-w-[420px]"
					variants={containerVariants}
					initial="hidden"
					animate="visible"
				>
					{/* Mobile wordmark */}
					<motion.p
						variants={itemVariants}
						className="lg:hidden text-[10px] font-mono text-text-tertiary tracking-[0.18em] uppercase mb-8"
					>
						OctoAI
					</motion.p>

					<motion.p
						variants={itemVariants}
						className="text-[10px] font-mono text-text-tertiary tracking-[0.18em] uppercase mb-3"
					>
						Get started
					</motion.p>

					<motion.h2
						variants={itemVariants}
						className="text-[1.75rem] font-semibold tracking-[-0.025em] text-text-primary leading-tight mb-7"
					>
						Create your first
						<br />
						workspace
					</motion.h2>

					<motion.div
						variants={containerVariants}
						className="flex flex-col gap-5"
					>
						{/* Workspace name */}
						<motion.div
							variants={itemVariants}
							className="flex flex-col gap-1.5"
						>
							<label className="text-[10px] font-mono text-text-tertiary tracking-[0.14em] uppercase">
								Name
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="my-project"
								className="w-full bg-surface-raised border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:border-surface-muted transition-colors duration-200"
							/>
						</motion.div>

						{/* Repo path */}
						<motion.div
							variants={itemVariants}
							className="flex flex-col gap-1.5"
						>
							<label className="text-[10px] font-mono text-text-tertiary tracking-[0.14em] uppercase">
								Repository
							</label>
							<div className="flex gap-2">
								<input
									type="text"
									value={repoPath}
									onChange={(e) => setRepoPath(e.target.value)}
									placeholder="/Users/you/repo"
									className="flex-1 bg-surface-raised border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:border-surface-muted transition-colors duration-200 min-w-0"
								/>
								<button
									type="button"
									onClick={handlePickFolder}
									className="px-3 py-2.5 rounded-xl border border-surface-border bg-surface-raised text-text-secondary hover:text-text-primary hover:border-surface-muted transition-all duration-200 active:scale-[0.97] shrink-0"
									title="Browse folder"
								>
									<FolderOpen size={15} weight="regular" />
								</button>
							</div>
						</motion.div>

						{/* Agent providers */}
						<motion.div
							variants={itemVariants}
							className="flex flex-col gap-1.5"
						>
							<label className="text-[10px] font-mono text-text-tertiary tracking-[0.14em] uppercase">
								Agent providers
							</label>
							<div className="grid grid-cols-2 gap-2">
								{PROVIDERS.map((p) => {
									const active = providers.includes(p.id);
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => toggleProvider(p.id)}
											className={[
												"flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.97]",
												active
													? "border-surface-muted bg-surface-overlay"
													: "border-surface-border bg-surface-raised hover:border-surface-muted",
											].join(" ")}
										>
											<span
												className={[
													"mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200",
													active
														? "border-text-secondary bg-text-secondary"
														: "border-surface-muted",
												].join(" ")}
											>
												{active && (
													<Check
														size={8}
														weight="bold"
														className="text-surface-base"
													/>
												)}
											</span>
											<div>
												<p className="text-xs font-medium text-text-primary leading-none mb-0.5">
													{p.label}
												</p>
												<p className="text-[10px] text-text-tertiary">
													{p.description}
												</p>
											</div>
										</button>
									);
								})}
							</div>
							<p className="text-[10px] text-text-tertiary font-mono mt-0.5">
								OctoAI detects which CLIs are installed at launch.
							</p>
						</motion.div>

						{/* Error */}
						<AnimatePresence>
							{error && (
								<motion.p
									initial={{ opacity: 0, y: -6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									className="text-[11px] text-red-400 font-mono"
								>
									{error}
								</motion.p>
							)}
						</AnimatePresence>

						{/* Submit */}
						<motion.div variants={itemVariants} className="pt-1">
							<button
								type="button"
								onClick={handleCreate}
								className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-text-primary hover:bg-accent-hover text-surface-base text-sm font-medium tracking-[-0.01em] transition-all duration-200 active:scale-[0.97]"
							>
								Create workspace
								<ArrowRight size={14} weight="bold" />
							</button>
						</motion.div>
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
}

// Shared form used inside the modal variant
function ModalForm({
	name,
	setName,
	repoPath,
	setRepoPath,
	providers,
	toggleProvider,
	handlePickFolder,
	handleCreate,
	onCancel,
	error,
}: {
	name: string;
	setName: (v: string) => void;
	repoPath: string;
	setRepoPath: (v: string) => void;
	providers: AgentProvider[];
	toggleProvider: (id: AgentProvider) => void;
	handlePickFolder: () => void;
	handleCreate: () => void;
	onCancel?: () => void;
	error: string | null;
}) {
	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-1.5">
				<label className="text-[10px] font-mono text-text-tertiary tracking-[0.14em] uppercase">
					Name
				</label>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="my-project"
					className="w-full bg-surface-overlay border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:border-surface-muted transition-colors duration-200"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-[10px] font-mono text-text-tertiary tracking-[0.14em] uppercase">
					Repository
				</label>
				<div className="flex gap-2">
					<input
						type="text"
						value={repoPath}
						onChange={(e) => setRepoPath(e.target.value)}
						placeholder="/Users/you/repo"
						className="flex-1 bg-surface-overlay border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:border-surface-muted transition-colors duration-200 min-w-0"
					/>
					<button
						type="button"
						onClick={handlePickFolder}
						className="px-3 py-2.5 rounded-xl border border-surface-border bg-surface-overlay text-text-secondary hover:text-text-primary hover:border-surface-muted transition-all duration-200 active:scale-[0.97] shrink-0"
					>
						<FolderOpen size={15} weight="regular" />
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-[10px] font-mono text-text-tertiary tracking-[0.14em] uppercase">
					Agent providers
				</label>
				<div className="grid grid-cols-2 gap-2">
					{PROVIDERS.map((p) => {
						const active = providers.includes(p.id);
						return (
							<button
								key={p.id}
								type="button"
								onClick={() => toggleProvider(p.id)}
								className={[
									"flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.97]",
									active
										? "border-surface-muted bg-surface-base"
										: "border-surface-border bg-surface-overlay hover:border-surface-muted",
								].join(" ")}
							>
								<span
									className={[
										"mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200",
										active
											? "border-text-secondary bg-text-secondary"
											: "border-surface-muted",
									].join(" ")}
								>
									{active && (
										<Check
											size={8}
											weight="bold"
											className="text-surface-base"
										/>
									)}
								</span>
								<div>
									<p className="text-xs font-medium text-text-primary leading-none mb-0.5">
										{p.label}
									</p>
									<p className="text-[10px] text-text-tertiary">
										{p.description}
									</p>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<AnimatePresence>
				{error && (
					<motion.p
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						className="text-[11px] text-red-400 font-mono"
					>
						{error}
					</motion.p>
				)}
			</AnimatePresence>

			<div className="flex items-center gap-3 pt-1">
				<button
					type="button"
					onClick={handleCreate}
					className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-text-primary hover:bg-accent-hover text-surface-base text-sm font-medium tracking-tight transition-all duration-200 active:scale-[0.97]"
				>
					Create workspace
					<ArrowRight size={13} weight="bold" />
				</button>
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						className="text-sm text-text-tertiary hover:text-text-secondary transition-colors font-mono"
					>
						Cancel
					</button>
				)}
			</div>
		</div>
	);
}
