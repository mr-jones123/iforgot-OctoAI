/**
 * AgentIntelPanel — analytics dashboard for agent performance.
 *
 * Slides in from the right (or replaces the board) when the user clicks
 * "Intel" in the sidebar. Shows per-provider stats derived from card state:
 *
 *   • Leaderboard  — tasks done, failure rate, avg duration per provider
 *   • Activity     — timeline of card runs (last 30)
 *   • Cost         — token spend per provider (only populated when cost data exists)
 */
import type { Card } from "@riza/shared";
import { useState } from "react";

interface AgentIntelPanelProps {
	cards: Card[]; // all cards across all boards in this workspace
	onClose: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
	"claude-code": "Claude",
	codex: "Codex",
	gemini: "Gemini",
	amp: "Amp",
};

const PROVIDER_COLORS: Record<string, string> = {
	"claude-code": "#e07b39", // warm orange — Anthropic
	codex: "#10a37f", // openai green
	gemini: "#4285f4", // google blue
	amp: "#a855f7", // sourcegraph purple
};

type Tab = "leaderboard" | "activity" | "cost";

interface ProviderStats {
	provider: string;
	done: number;
	failed: number;
	running: number;
	idle: number;
	totalRuns: number;
	avgDurationMs: number | null;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalCachedTokens: number;
	totalCostUsd: number;
	hasCostData: boolean;
}

function computeStats(cards: Card[]): ProviderStats[] {
	const map = new Map<string, ProviderStats>();

	for (const card of cards) {
		const p = card.agent.provider;
		if (!map.has(p)) {
			map.set(p, {
				provider: p,
				done: 0,
				failed: 0,
				running: 0,
				idle: 0,
				totalRuns: 0,
				avgDurationMs: null,
				totalInputTokens: 0,
				totalOutputTokens: 0,
				totalCachedTokens: 0,
				totalCostUsd: 0,
				hasCostData: false,
			});
		}
		const s = map.get(p)!;

		if (card.status === "done") s.done++;
		else if (card.status === "failed") s.failed++;
		else if (card.status === "running" || card.status === "waiting")
			s.running++;
		else s.idle++;

		if (card.status === "done" || card.status === "failed") s.totalRuns++;

		// Duration
		if (card.startedAt && card.finishedAt) {
			const ms =
				new Date(card.finishedAt).getTime() -
				new Date(card.startedAt).getTime();
			if (ms > 0) {
				s.avgDurationMs =
					s.avgDurationMs === null
						? ms
						: (s.avgDurationMs * (s.totalRuns - 1) + ms) / s.totalRuns;
			}
		}

		// Cost
		if (card.cost) {
			s.totalInputTokens += card.cost.inputTokens;
			s.totalOutputTokens += card.cost.outputTokens;
			s.totalCachedTokens += card.cost.cachedTokens;
			s.totalCostUsd += card.cost.estimatedCostUsd;
			s.hasCostData = true;
		}
	}

	return Array.from(map.values()).sort((a, b) => b.done - a.done);
}

function fmtDuration(ms: number | null): string {
	if (ms === null) return "—";
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rem = s % 60;
	return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function fmtTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

function fmtCost(usd: number): string {
	if (usd === 0) return "—";
	if (usd < 0.001) return "<$0.001";
	if (usd < 0.01) return `$${usd.toFixed(4)}`;
	return `$${usd.toFixed(3)}`;
}

// ── Leaderboard tab ───────────────────────────────────────────────────────────

function Leaderboard({ stats }: { stats: ProviderStats[] }) {
	const maxDone = Math.max(...stats.map((s) => s.done), 1);

	if (stats.length === 0) {
		return (
			<EmptyState message="No agent runs yet. Start a card to see stats." />
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{stats.map((s, i) => {
				const color = PROVIDER_COLORS[s.provider] ?? "#9898b8";
				const barPct = (s.done / maxDone) * 100;
				const failRate =
					s.totalRuns > 0 ? Math.round((s.failed / s.totalRuns) * 100) : 0;

				return (
					<div
						key={s.provider}
						className="rounded-lg border border-surface-border bg-surface-raised p-4 flex flex-col gap-3"
					>
						{/* Header row */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								{/* Rank badge */}
								<span
									className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
									style={{
										background: i === 0 ? color : "transparent",
										border: `1px solid ${i === 0 ? color : "#2a2a40"}`,
										color: i === 0 ? "#fff" : "#5a5a7a",
									}}
								>
									{i + 1}
								</span>
								{/* Provider dot + name */}
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{ background: color }}
								/>
								<span className="text-sm font-semibold text-text-primary">
									{PROVIDER_LABELS[s.provider] ?? s.provider}
								</span>
								{i === 0 && s.done > 0 && (
									<span
										className="text-[10px] font-mono px-1.5 py-0.5 rounded"
										style={{ background: `${color}22`, color }}
									>
										LEADER
									</span>
								)}
							</div>

							{/* Running indicator */}
							{s.running > 0 && (
								<div className="flex items-center gap-1.5">
									<span className="status-dot-running" />
									<span className="text-[11px] font-mono text-text-tertiary">
										{s.running} active
									</span>
								</div>
							)}
						</div>

						{/* Progress bar */}
						<div className="flex items-center gap-2">
							<div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
								<div
									className="h-full rounded-full transition-all duration-500"
									style={{ width: `${barPct}%`, background: color }}
								/>
							</div>
							<span className="text-xs font-mono text-text-primary w-12 text-right">
								{s.done} done
							</span>
						</div>

						{/* Stat grid */}
						<div className="grid grid-cols-3 gap-3">
							<StatCell
								label="Avg duration"
								value={fmtDuration(s.avgDurationMs)}
							/>
							<StatCell
								label="Fail rate"
								value={s.totalRuns > 0 ? `${failRate}%` : "—"}
								danger={failRate > 30}
							/>
							<StatCell
								label="Total cost"
								value={s.hasCostData ? fmtCost(s.totalCostUsd) : "—"}
								muted={!s.hasCostData}
							/>
						</div>
					</div>
				);
			})}

			{/* Token efficiency hint */}
			<p className="text-[10px] text-text-tertiary font-mono text-center mt-1">
				Cost data populates after Claude / Codex tasks complete · Gemini via PTY
				scrape
			</p>
		</div>
	);
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function Activity({ cards }: { cards: Card[] }) {
	// Last 30 finished cards, newest first
	const finished = [...cards]
		.filter((c) => c.finishedAt || c.startedAt)
		.sort(
			(a, b) =>
				new Date(b.finishedAt ?? b.updatedAt).getTime() -
				new Date(a.finishedAt ?? a.updatedAt).getTime(),
		)
		.slice(0, 30);

	if (finished.length === 0) {
		return (
			<EmptyState message="No completed tasks yet. Run a card to see activity." />
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			{finished.map((card) => {
				const color = PROVIDER_COLORS[card.agent.provider] ?? "#9898b8";
				const durationMs =
					card.startedAt && card.finishedAt
						? new Date(card.finishedAt).getTime() -
							new Date(card.startedAt).getTime()
						: null;
				const ts = card.finishedAt ?? card.updatedAt;
				const timeAgo = formatTimeAgo(new Date(ts));

				return (
					<div
						key={card.id}
						className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-surface-border/50 bg-surface-raised/40 hover:bg-surface-raised transition-colors"
					>
						{/* Status dot */}
						<span
							className={`w-1.5 h-1.5 rounded-full shrink-0 ${
								card.status === "done"
									? "bg-emerald-500"
									: card.status === "failed"
										? "bg-red-500"
										: card.status === "running"
											? "bg-indigo-400 animate-pulse"
											: "bg-surface-muted"
							}`}
						/>

						{/* Provider tag */}
						<span
							className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
							style={{ background: `${color}18`, color }}
						>
							{PROVIDER_LABELS[card.agent.provider] ?? card.agent.provider}
						</span>

						{/* Card title */}
						<span className="text-xs text-text-secondary truncate flex-1">
							{card.title}
						</span>

						{/* Duration */}
						<span className="text-[10px] font-mono text-text-tertiary shrink-0">
							{fmtDuration(durationMs)}
						</span>

						{/* Time ago */}
						<span className="text-[10px] font-mono text-text-tertiary shrink-0 w-16 text-right">
							{timeAgo}
						</span>
					</div>
				);
			})}
		</div>
	);
}

// ── Cost tab ──────────────────────────────────────────────────────────────────

function CostBreakdown({ stats }: { stats: ProviderStats[] }) {
	const withCost = stats.filter((s) => s.hasCostData);
	const totalCost = withCost.reduce((acc, s) => acc + s.totalCostUsd, 0);
	const totalTokens = stats.reduce(
		(acc, s) => acc + s.totalInputTokens + s.totalOutputTokens,
		0,
	);

	if (withCost.length === 0) {
		return (
			<div className="flex flex-col gap-4">
				<EmptyState message="No cost data yet. Cost is read from Claude/Codex JSONL session files and Gemini PTY output after tasks complete." />
				<div className="rounded-lg border border-surface-border/50 bg-surface-raised/30 p-4 flex flex-col gap-2">
					<p className="text-xs font-mono text-text-tertiary font-semibold uppercase tracking-widest">
						How it works
					</p>
					<ul className="flex flex-col gap-1.5">
						{[
							{
								provider: "Claude",
								detail: "Reads ~/.claude/projects/ JSONL session files",
							},
							{
								provider: "Codex",
								detail: "Reads ~/.codex/sessions/ JSONL session files",
							},
							{
								provider: "Gemini",
								detail: "Scrapes /stats output from PTY on exit",
							},
							{
								provider: "Amp",
								detail: "Scrapes cost summary from PTY on exit",
							},
						].map((row) => (
							<li
								key={row.provider}
								className="flex items-start gap-2 text-[11px]"
							>
								<span className="text-text-tertiary font-mono w-14 shrink-0">
									{row.provider}
								</span>
								<span className="text-text-tertiary">{row.detail}</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Total summary */}
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-lg border border-surface-border bg-surface-raised p-4 flex flex-col gap-1">
					<p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
						Total Estimated Cost
					</p>
					<p className="text-2xl font-mono font-semibold text-text-primary">
						{fmtCost(totalCost)}
					</p>
				</div>
				<div className="rounded-lg border border-surface-border bg-surface-raised p-4 flex flex-col gap-1">
					<p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
						Total Tokens Used
					</p>
					<p className="text-2xl font-mono font-semibold text-text-primary">
						{fmtTokens(totalTokens)}
					</p>
				</div>
			</div>

			{/* Per-provider breakdown */}
			{withCost.map((s) => {
				const color = PROVIDER_COLORS[s.provider] ?? "#9898b8";
				// totalT available for future token-based bar charts
				const _totalT = s.totalInputTokens + s.totalOutputTokens;
				void _totalT;
				const sharePct = totalCost > 0 ? (s.totalCostUsd / totalCost) * 100 : 0;

				return (
					<div
						key={s.provider}
						className="rounded-lg border border-surface-border bg-surface-raised p-4 flex flex-col gap-3"
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span
									className="w-2 h-2 rounded-full"
									style={{ background: color }}
								/>
								<span className="text-sm font-semibold text-text-primary">
									{PROVIDER_LABELS[s.provider] ?? s.provider}
								</span>
							</div>
							<span className="text-sm font-mono font-semibold text-text-primary">
								{fmtCost(s.totalCostUsd)}
							</span>
						</div>

						{/* Share bar */}
						<div className="flex items-center gap-2">
							<div className="flex-1 h-1 bg-surface-overlay rounded-full overflow-hidden">
								<div
									className="h-full rounded-full"
									style={{ width: `${sharePct}%`, background: color }}
								/>
							</div>
							<span className="text-[10px] font-mono text-text-tertiary w-10 text-right">
								{sharePct.toFixed(0)}%
							</span>
						</div>

						{/* Token breakdown */}
						<div className="grid grid-cols-3 gap-2">
							<StatCell label="Input" value={fmtTokens(s.totalInputTokens)} />
							<StatCell label="Output" value={fmtTokens(s.totalOutputTokens)} />
							<StatCell
								label="Cached"
								value={fmtTokens(s.totalCachedTokens)}
								muted={s.totalCachedTokens === 0}
							/>
						</div>

						{/* Efficiency: cost per task */}
						{s.done > 0 && (
							<div className="pt-1 border-t border-surface-border/50">
								<StatCell
									label="Cost per completed task"
									value={fmtCost(s.totalCostUsd / s.done)}
								/>
							</div>
						)}
					</div>
				);
			})}

			<p className="text-[10px] text-text-tertiary font-mono text-center">
				Estimates based on public pricing · actual billing may differ
			</p>
		</div>
	);
}

// ── Shared components ─────────────────────────────────────────────────────────

function StatCell({
	label,
	value,
	danger,
	muted,
}: {
	label: string;
	value: string;
	danger?: boolean;
	muted?: boolean;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest truncate">
				{label}
			</p>
			<p
				className={`text-sm font-mono font-semibold ${
					danger
						? "text-red-400"
						: muted
							? "text-text-tertiary"
							: "text-text-primary"
				}`}
			>
				{value}
			</p>
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
			{/* Chart icon */}
			<svg
				width="32"
				height="32"
				viewBox="0 0 32 32"
				fill="none"
				className="text-text-tertiary opacity-40"
			>
				<rect x="4" y="18" width="6" height="10" rx="1" fill="currentColor" />
				<rect x="13" y="10" width="6" height="18" rx="1" fill="currentColor" />
				<rect x="22" y="4" width="6" height="24" rx="1" fill="currentColor" />
			</svg>
			<p className="text-xs text-text-tertiary font-mono max-w-[240px]">
				{message}
			</p>
		</div>
	);
}

function formatTimeAgo(date: Date): string {
	const diff = Date.now() - date.getTime();
	const s = Math.floor(diff / 1000);
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}

// ── Panel root ────────────────────────────────────────────────────────────────

export function AgentIntelPanel({ cards, onClose }: AgentIntelPanelProps) {
	const [tab, setTab] = useState<Tab>("leaderboard");
	const stats = computeStats(cards);

	// Aggregate totals for the header
	const totalDone = cards.filter((c) => c.status === "done").length;
	const totalRunning = cards.filter(
		(c) => c.status === "running" || c.status === "waiting",
	).length;
	const totalFailed = cards.filter((c) => c.status === "failed").length;
	const totalCostUsd = cards.reduce(
		(acc, c) => acc + (c.cost?.estimatedCostUsd ?? 0),
		0,
	);

	const tabs: { id: Tab; label: string }[] = [
		{ id: "leaderboard", label: "Leaderboard" },
		{ id: "activity", label: "Activity" },
		{ id: "cost", label: "Cost" },
	];

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
				<div className="flex flex-col gap-0.5">
					<h2 className="text-sm font-semibold text-text-primary tracking-tight">
						Agent Intel
					</h2>
					<p className="text-[11px] font-mono text-text-tertiary">
						{stats.length > 0
							? `${stats.length} provider${stats.length !== 1 ? "s" : ""} · ${totalDone} done`
							: "No agents run yet"}
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors rounded hover:bg-surface-overlay"
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
						<path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" />
					</svg>
				</button>
			</div>

			{/* Quick stats strip */}
			<div className="grid grid-cols-3 gap-2 px-5 pb-4 shrink-0">
				<QuickStat
					label="Running"
					value={String(totalRunning)}
					dotClass="status-dot-running"
				/>
				<QuickStat
					label="Done"
					value={String(totalDone)}
					dotClass="status-dot-done"
				/>
				<QuickStat
					label="Failed"
					value={String(totalFailed)}
					dotClass="status-dot-failed"
				/>
			</div>

			{/* Cost strip — only shown when data exists */}
			{totalCostUsd > 0 && (
				<div className="mx-5 mb-4 px-3 py-2 rounded-md bg-surface-overlay border border-surface-border/50 flex items-center justify-between shrink-0">
					<span className="text-[11px] font-mono text-text-tertiary">
						Est. total spend
					</span>
					<span className="text-sm font-mono font-semibold text-text-primary">
						{fmtCost(totalCostUsd)}
					</span>
				</div>
			)}

			{/* Tabs */}
			<div className="flex gap-1 px-5 pb-3 border-b border-surface-border shrink-0">
				{tabs.map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTab(t.id)}
						className={[
							"px-2.5 py-1 text-xs font-mono rounded transition-colors",
							tab === t.id
								? "bg-surface-overlay text-text-primary"
								: "text-text-tertiary hover:text-text-secondary",
						].join(" ")}
					>
						{t.label}
					</button>
				))}
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
				{tab === "leaderboard" && <Leaderboard stats={stats} />}
				{tab === "activity" && <Activity cards={cards} />}
				{tab === "cost" && <CostBreakdown stats={stats} />}
			</div>
		</div>
	);
}

function QuickStat({
	label,
	value,
	dotClass,
}: {
	label: string;
	value: string;
	dotClass: string;
}) {
	return (
		<div className="flex flex-col gap-1 px-3 py-2.5 rounded-md bg-surface-raised border border-surface-border">
			<div className="flex items-center gap-1.5">
				<span className={dotClass} />
				<span className="text-[10px] font-mono text-text-tertiary">
					{label}
				</span>
			</div>
			<span className="text-lg font-mono font-semibold text-text-primary">
				{value}
			</span>
		</div>
	);
}
