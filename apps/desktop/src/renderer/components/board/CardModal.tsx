import type { AgentProvider, Card } from "@riza/shared";
import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high";
type Tab = "ticket" | "prompt";

const PROVIDERS: { id: AgentProvider; label: string; description: string }[] = [
	{
		id: "claude-code",
		label: "Claude Code",
		description: "Anthropic · best for code",
	},
	{ id: "codex", label: "Codex", description: "OpenAI · versatile" },
	{ id: "gemini", label: "Gemini CLI", description: "Google · multimodal" },
	{ id: "amp", label: "Amp", description: "Sourcegraph · multi-model" },
];

// ── Default system instruction ─────────────────────────────────────────────
const DEFAULT_SYSTEM_INSTRUCTION = `You are an expert software engineer working inside a real codebase. Your job is to complete the task below precisely, following all constraints provided. Before writing any code, think through your approach step by step.`;

// ── Prompt assembly ────────────────────────────────────────────────────────

const PRIORITY_INSTRUCTION: Record<Priority, string> = {
	low: "This is a low-priority task. Take your time, be thorough, and prefer clean code over speed.",
	medium:
		"This is a medium-priority task. Balance thoroughness with efficiency.",
	high: "This is a high-priority task. Be decisive and execute with minimal back-and-forth. Prefer action over asking for clarification unless something is truly ambiguous.",
};

function assemblePrompt(
	goal: string,
	acceptanceCriteria: string,
	context: string,
	priority: Priority,
	systemInstruction: string,
): string {
	const sections: string[] = [];

	const instruction = systemInstruction.trim() || DEFAULT_SYSTEM_INSTRUCTION;
	sections.push(
		`<system_instruction>\n${instruction} ${PRIORITY_INSTRUCTION[priority]}\n</system_instruction>`,
	);

	if (goal) {
		sections.push(`<task>\n${goal}\n</task>`);
	}

	if (acceptanceCriteria) {
		sections.push(
			`<acceptance_criteria>\n` +
				`The task is complete when ALL of the following are true:\n` +
				acceptanceCriteria +
				`\n</acceptance_criteria>`,
		);
	}

	if (context) {
		sections.push(
			`<context_and_constraints>\n${context}\n</context_and_constraints>`,
		);
	}

	sections.push(
		`<output_format>\n` +
			`1. Briefly explain your approach before making any changes.\n` +
			`2. Make all necessary code changes.\n` +
			`3. Verify each acceptance criterion is met.\n` +
			`4. Summarize what you did and flag anything that needs human review.\n` +
			`</output_format>`,
	);

	return sections.join("\n\n");
}

// ── Parse existing description back into fields ────────────────────────────
// Now also extracts <system_instruction> if present

function parseDescription(description: string) {
	const systemInstruction =
		extractXmlSection(description, "system_instruction") ?? "";
	const extractedGoal = extractXmlSection(description, "task");
	// If no <task> tags found, the description is a raw prompt (pre-modal cards)
	// Show it as-is in the goal field so the user can restructure it
	const goal = extractedGoal ?? description;
	const acceptanceCriteria =
		extractXmlSection(description, "acceptance_criteria")?.replace(
			/^The task is complete when ALL of the following are true:\n/,
			"",
		) ?? "";
	const context =
		extractXmlSection(description, "context_and_constraints") ?? "";

	let priority: Priority = "low";
	if (description.includes("high-priority")) priority = "high";
	else if (description.includes("medium-priority")) priority = "medium";

	return {
		goal,
		acceptanceCriteria,
		context,
		priority,
		systemInstruction,
	};
}

function extractXmlSection(text: string, tag: string): string | undefined {
	const regex = new RegExp(`<${tag}>\\n?([\\s\\S]*?)\\n?<\\/${tag}>`);
	return regex.exec(text)?.[1]?.trim();
}

// ── Component ──────────────────────────────────────────────────────────────

interface CardModalProps {
	columnId: string;
	allCards: Card[];
	existing?: Card;
	onConfirm: (
		title: string,
		description: string,
		prompt: string,
		provider: AgentProvider,
		dependsOn: string[],
		scheduledAt: string | null,
	) => void;

	onCancel: () => void;
}

export function CardModal({
	allCards,
	existing,
	onConfirm,
	onCancel,
}: CardModalProps) {
	const isEdit = !!existing;

	const parsed = existing ? parseDescription(existing.description) : null;

	const [tab, setTab] = useState<Tab>("ticket");
	const [title, setTitle] = useState(existing?.title ?? "");
	const [description, setDescription] = useState(existing?.description ?? "");

	const [goal, setGoal] = useState(parsed?.goal ?? "");
	const [acceptanceCriteria, setAcceptanceCriteria] = useState(
		parsed?.acceptanceCriteria ?? "",
	);
	const [context, setContext] = useState(parsed?.context ?? "");
	const [priority, setPriority] = useState<Priority>(parsed?.priority ?? "low");
	const [systemInstruction, setSystemInstruction] = useState(
		parsed?.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,
	);
	const [provider, setProvider] = useState<AgentProvider>(
		existing?.agent.provider ?? "claude-code",
	);
	const [dependsOn, setDependsOn] = useState<string[]>(
		existing?.dependsOn ?? [],
	);

	// scheduledAt stored as a datetime-local string ("YYYY-MM-DDTHH:mm") locally,
	// converted to ISO 8601 on submit. Empty string = no schedule.
	const [scheduledAt, setScheduledAt] = useState<string>(() => {
		if (!existing?.scheduledAt) return "";
		// Convert stored ISO → datetime-local format (strip seconds + Z)
		const d = new Date(existing.scheduledAt);
		const pad = (n: number) => String(n).padStart(2, "0");
		return (
			`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
			`T${pad(d.getHours())}:${pad(d.getMinutes())}`
		);
	});
	const [titleError, setTitleError] = useState(false);
	const [goalError, setGoalError] = useState(false);
	const [copied, setCopied] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false); // optional collapsible

	const prompt = assemblePrompt(
		goal,
		acceptanceCriteria,
		context,
		priority,
		systemInstruction,
	);

	// Escape to close
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onCancel]);

	// Cmd/Ctrl+Enter to submit
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	});

	function handleSubmit() {
		if (!title.trim()) {
			setTitleError(true);
			return;
		}
		if (!goal.trim()) {
			setGoalError(true);
			return;
		}
		const isoScheduledAt = scheduledAt
			? new Date(scheduledAt).toISOString()
			: null;
		onConfirm(
			title.trim(),
			description.trim(),
			prompt,
			provider,
			dependsOn,
			isoScheduledAt,
		);
	}

	function handleCopy() {
		navigator.clipboard.writeText(prompt).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}

	// Context template helpers (from previous enhancement)
	const contextTemplates: Record<string, string> = {
		"Express + Prisma":
			"Use Express + Prisma. No external auth libraries. Follow existing error-handling patterns in /src/middleware.",
		"React + TanStack":
			"Use React functional components, TanStack Query for data fetching, and Tailwind CSS. Avoid class components.",
		"Python + FastAPI":
			"Use FastAPI with Pydantic models, async endpoints, and dependency injection. Follow PEP 8.",
	};

	const priorityStyles: Record<Priority, string> = {
		low: "border-teal-600/50  bg-teal-500/10  text-teal-400",
		medium: "border-amber-600/50 bg-amber-500/10 text-amber-400",
		high: "border-red-600/50   bg-red-500/10   text-red-400",
	};

	return (
		// Backdrop
		<div
			className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
			style={{ zIndex: 50 }}
			onClick={onCancel}
			role="dialog"
			aria-modal="true"
			aria-labelledby="card-modal-title"
		>
			{/* Panel */}
			<div
				className="glass-panel rounded-panel w-full max-w-lg mx-4 flex flex-col overflow-hidden max-h-[90dvh]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* ── Header + Tabs ── */}
				<div className="px-6 pt-5 pb-0 border-b border-surface-border shrink-0">
					<h2
						id="card-modal-title"
						className="text-sm font-semibold tracking-tight text-text-primary mb-0.5"
					>
						{isEdit ? "Edit task" : "New task"}
					</h2>
					<p className="text-[11px] text-text-tertiary mb-3">
						{isEdit
							? "Changes apply on the next run. Editing does not restart a running agent."
							: "Fill in the ticket — we'll assemble the agent prompt for you."}
					</p>

					{/* Tabs */}
					<div className="flex gap-0 -mb-px">
						{(["ticket", "prompt"] as Tab[]).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setTab(t)}
								className={[
									"px-4 py-2 text-[11px] font-mono capitalize border-b-2 transition-colors duration-150",
									tab === t
										? "border-accent text-text-primary"
										: "border-transparent text-text-tertiary hover:text-text-secondary",
								].join(" ")}
							>
								{t === "prompt" ? "Prompt preview" : t}
							</button>
						))}
					</div>
				</div>

				{/* ── Scrollable body ── */}
				<div className="overflow-y-auto flex-1">
					{/* TICKET TAB */}
					{tab === "ticket" && (
						<div className="px-6 py-5 flex flex-col gap-4">
							{/* Title */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
									Title <span className="text-red-400">*</span>
								</label>
								<input
									autoFocus
									type="text"
									maxLength={120}
									value={title}
									onChange={(e) => {
										setTitle(e.target.value);
										setTitleError(false);
									}}
									placeholder="Build the auth module"
									className={[
										"bg-surface-overlay border rounded-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-sans focus:outline-none transition-colors duration-200",
										titleError
											? "border-red-500/60"
											: "border-surface-border focus:border-accent/60",
									].join(" ")}
								/>
								{titleError && (
									<p className="text-[11px] text-red-400 font-mono">
										Title is required.
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
									Description
								</label>
								<p className="text-[11px] text-text-tertiary -mt-1">
									Short summary shown on the card. Not sent to the agent.
								</p>
								<input
									type="text"
									maxLength={160}
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Add JWT auth with refresh tokens to the user service."
									className="bg-surface-overlay border border-surface-border rounded-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-sans focus:outline-none focus:border-accent/60 transition-colors duration-200"
								/>
							</div>

							{/* ── NEW: System instruction (editable) ── */}
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
										System instruction
									</label>
									<button
										type="button"
										onClick={() =>
											setSystemInstruction(DEFAULT_SYSTEM_INSTRUCTION)
										}
										className="text-[10px] font-mono text-text-tertiary hover:text-accent transition"
									>
										Reset to default
									</button>
								</div>
								<p className="text-[11px] text-text-tertiary -mt-1">
									The initial instruction given to the agent. Overrides the
									default.
								</p>
								<textarea
									value={systemInstruction}
									onChange={(e) => setSystemInstruction(e.target.value)}
									placeholder={DEFAULT_SYSTEM_INSTRUCTION}
									rows={2}
									className="bg-surface-overlay border border-surface-border rounded-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-sans focus:outline-none focus:border-accent/60 transition-colors duration-200 resize-none leading-relaxed"
								/>
							</div>

							{/* Goal */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
									What should the agent do?{" "}
									<span className="text-red-400">*</span>
								</label>
								<textarea
									value={goal}
									onChange={(e) => {
										setGoal(e.target.value);
										setGoalError(false);
									}}
									placeholder="Implement JWT-based auth with refresh tokens using the existing User model."
									rows={3}
									className={[
										"bg-surface-overlay border rounded-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-sans focus:outline-none transition-colors duration-200 resize-none leading-relaxed",
										goalError
											? "border-red-500/60"
											: "border-surface-border focus:border-accent/60",
									].join(" ")}
								/>
								{goalError && (
									<p className="text-[11px] text-red-400 font-mono">
										Describe what the agent should do.
									</p>
								)}
							</div>

							{/* Acceptance criteria */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
									Acceptance criteria
								</label>
								<p className="text-[11px] text-text-tertiary -mt-1">
									How do we know it's done? Agents perform better with a clear
									exit condition.
								</p>
								<textarea
									value={acceptanceCriteria}
									onChange={(e) => setAcceptanceCriteria(e.target.value)}
									placeholder={
										"- Unit tests pass\n- Refresh token rotates on use\n- Tokens expire in 15m / 7d"
									}
									rows={3}
									className="bg-surface-overlay border border-surface-border rounded-card px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:border-accent/60 transition-colors duration-200 resize-none leading-relaxed"
								/>
							</div>

							{/* Context & constraints (enhanced) */}
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
										Context & constraints
									</label>
									<button
										type="button"
										onClick={() => setContext("")}
										className="text-[10px] font-mono text-text-tertiary hover:text-red-400 transition"
									>
										Clear
									</button>
								</div>
								<p className="text-[11px] text-text-tertiary -mt-1">
									Stack details, conventions to follow, things to avoid. The
									most powerful field.
								</p>
								<textarea
									value={context}
									onChange={(e) => setContext(e.target.value)}
									placeholder="Use Express + Prisma. No third-party auth libraries. Follow existing error-handling patterns in /src/middleware."
									rows={3}
									className="bg-surface-overlay border border-surface-border rounded-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-sans focus:outline-none focus:border-accent/60 transition-colors duration-200 resize-none leading-relaxed"
								/>
								<div className="flex flex-wrap gap-2 mt-1">
									{Object.entries(contextTemplates).map(([name, template]) => (
										<button
											key={name}
											type="button"
											onClick={() => setContext(template)}
											className="text-[10px] font-mono bg-surface-muted/30 px-2 py-0.5 rounded border border-surface-border hover:border-accent/40 transition-colors"
										>
											{name}
										</button>
									))}
								</div>
							</div>

							{/* Priority */}
							<div className="flex flex-col gap-2">
								<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
									Priority
								</label>
								<div className="flex gap-2">
									{(["low", "medium", "high"] as Priority[]).map((p) => (
										<button
											key={p}
											type="button"
											onClick={() => setPriority(p)}
											className={[
												"px-3 py-1 rounded-full border text-[11px] font-mono capitalize transition-all duration-150 active:scale-[0.97]",
												priority === p
													? priorityStyles[p]
													: "border-surface-border text-text-tertiary hover:border-surface-muted",
											].join(" ")}
										>
											{p}
										</button>
									))}
								</div>
							</div>

							{/* Agent provider */}
							<div className="flex flex-col gap-2">
								<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
									Assign to agent
								</label>
								<div className="grid grid-cols-2 gap-2">
									{PROVIDERS.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => setProvider(p.id)}
											className={[
												"text-left px-3 py-2.5 rounded-card border transition-all duration-150 active:scale-[0.97]",
												provider === p.id
													? "border-accent/60 bg-accent/10"
													: "border-surface-border hover:border-surface-muted",
											].join(" ")}
										>
											<div
												className={[
													"text-xs font-mono font-medium mb-0.5",
													provider === p.id
														? "text-accent"
														: "text-text-primary",
												].join(" ")}
											>
												{p.label}
											</div>
											<div className="text-[11px] text-text-tertiary">
												{p.description}
											</div>
										</button>
									))}
								</div>
							</div>

							{/* Schedule */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
									Scheduled execution
								</label>
								<p className="text-[11px] text-text-tertiary -mt-1">
									Leave blank to run manually. Set a date and time to have the
									agent start automatically.
								</p>
								<div className="flex items-center gap-2">
									<input
										type="datetime-local"
										value={scheduledAt}
										onChange={(e) => setScheduledAt(e.target.value)}
										className="flex-1 bg-surface-overlay border border-surface-border rounded-card px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors duration-200 [color-scheme:dark]"
									/>
									{scheduledAt && (
										<button
											type="button"
											onClick={() => setScheduledAt("")}
											className="shrink-0 text-[10px] font-mono text-text-tertiary hover:text-red-400 transition-colors"
										>
											Clear
										</button>
									)}
								</div>
							</div>

							{/* Dependencies */}
							{allCards.filter((c) => c.id !== existing?.id).length > 0 && (
								<div className="flex flex-col gap-2">
									<label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
										Depends on
									</label>
									<p className="text-[11px] text-text-tertiary -mt-1">
										This card won\'t start until all dependencies are done.
									</p>
									<div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
										{allCards
											.filter((c) => c.id !== existing?.id)
											.map((c) => {
												const checked = dependsOn.includes(c.id);
												return (
													<button
														key={c.id}
														type="button"
														onClick={() => {
															setDependsOn((prev) =>
																checked
																	? prev.filter((id) => id !== c.id)
																	: [...prev, c.id],
															);
														}}
														className={[
															"flex items-center gap-2 px-3 py-2 rounded-card border text-left transition-all duration-150 active:scale-[0.98]",
															checked
																? "border-accent/60 bg-accent/10"
																: "border-surface-border hover:border-surface-muted",
														].join(" ")}
													>
														<div
															className={[
																"w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors",
																checked
																	? "bg-accent border-accent"
																	: "border-surface-border",
															].join(" ")}
														>
															{checked && (
																<svg
																	width="8"
																	height="8"
																	viewBox="0 0 8 8"
																	fill="none"
																	stroke="white"
																	strokeWidth="1.5"
																	strokeLinecap="round"
																>
																	<path d="M1.5 4 L3 5.5 L6.5 2" />
																</svg>
															)}
														</div>
														<span
															className={[
																"text-xs font-medium flex-1 truncate",
																checked
																	? "text-text-primary"
																	: "text-text-secondary",
															].join(" ")}
														>
															{c.title}
														</span>
														<span
															className={[
																"text-[9px] font-mono uppercase tracking-widest",
																c.status === "done"
																	? "text-emerald-500"
																	: c.status === "running"
																		? "text-blue-400"
																		: "text-text-tertiary",
															].join(" ")}
														>
															{c.status}
														</span>
													</button>
												);
											})}
									</div>
								</div>
							)}
						</div>
					)}

					{/* PROMPT PREVIEW TAB */}
					{tab === "prompt" && (
						<div className="px-6 py-5 flex flex-col gap-3">
							<p className="text-[11px] text-text-tertiary">
								This is the exact prompt the agent receives. Edit the ticket
								fields to change it.
							</p>

							{prompt.trim() ? (
								<pre className="bg-surface-overlay border border-surface-border rounded-card px-4 py-3 text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
									{prompt}
								</pre>
							) : (
								<div className="bg-surface-overlay border border-dashed border-surface-border/60 rounded-card px-4 py-6 text-center">
									<p className="text-[11px] text-text-tertiary font-mono">
										Fill in the ticket fields to see the prompt.
									</p>
								</div>
							)}

							<button
								type="button"
								onClick={handleCopy}
								className="self-start px-3 py-1.5 rounded-card border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-text-secondary hover:border-surface-muted transition-colors duration-150 active:scale-[0.97]"
							>
								{copied ? "Copied!" : "Copy prompt"}
							</button>
						</div>
					)}
				</div>

				{/* ── Footer ── */}
				<div className="px-6 py-4 border-t border-surface-border flex items-center justify-between shrink-0">
					<span className="text-[10px] font-mono text-text-tertiary">
						⌘ + ↵ to {isEdit ? "save" : "add"}
					</span>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onCancel}
							className="text-xs font-mono text-text-tertiary hover:text-text-secondary transition-colors active:scale-[0.97]"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSubmit}
							className="px-4 py-2 rounded-card bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors duration-150 active:scale-[0.97]"
						>
							{isEdit ? "Save changes" : "Add task"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
