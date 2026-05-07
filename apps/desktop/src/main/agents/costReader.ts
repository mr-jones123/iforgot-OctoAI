/**
 * costReader.ts
 *
 * Reads token usage from provider-specific local files or PTY output.
 *
 * Strategy per provider:
 *   claude-code  → ~/.claude/projects/<encoded-path>/<session>.jsonl
 *                  Each assistant message has a `usage` field with token counts.
 *                  We match by session start time (nearest file to spawnedAt).
 *
 *   codex        → ~/.codex/sessions/<session>.jsonl
 *                  Events with payload.type === "token_count" carry cumulative totals.
 *                  We find the latest file touched after spawnedAt.
 *
 *   gemini       → No local files. Inject `/stats\r` into the PTY on completion,
 *                  regex-parse the output block that follows.
 *
 *   amp          → Unknown format. Fall back to PTY scraping the total cost line
 *                  that Amp prints on exit (empirically observed pattern).
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentProvider } from "@riza/shared";
import type { CardCost } from "@riza/shared";

// ── Pricing table (USD per 1M tokens) ────────────────────────────────────────
// https://www.anthropic.com/pricing  |  https://openai.com/pricing
// These are approximate defaults; real billing depends on model and plan.
const PRICING: Record<
	string,
	{ inputPerM: number; outputPerM: number; cachedPerM: number }
> = {
	// Claude models
	"claude-opus-4": { inputPerM: 15, outputPerM: 75, cachedPerM: 1.5 },
	"claude-sonnet-4": { inputPerM: 3, outputPerM: 15, cachedPerM: 0.3 },
	"claude-sonnet-4-5": { inputPerM: 3, outputPerM: 15, cachedPerM: 0.3 },
	"claude-haiku-4": { inputPerM: 0.8, outputPerM: 4, cachedPerM: 0.08 },
	"claude-haiku-4-5": { inputPerM: 0.8, outputPerM: 4, cachedPerM: 0.08 },
	// OpenAI models
	"gpt-4o": { inputPerM: 2.5, outputPerM: 10, cachedPerM: 1.25 },
	"gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6, cachedPerM: 0.075 },
	o3: { inputPerM: 10, outputPerM: 40, cachedPerM: 2.5 },
	"o4-mini": { inputPerM: 1.1, outputPerM: 4.4, cachedPerM: 0.275 },
	// Gemini models
	"gemini-2.5-pro": { inputPerM: 1.25, outputPerM: 10, cachedPerM: 0.3125 },
	"gemini-2.5-flash": { inputPerM: 0.15, outputPerM: 0.6, cachedPerM: 0.0375 },
	"gemini-2.0-flash": { inputPerM: 0.1, outputPerM: 0.4, cachedPerM: 0.025 },
};

const DEFAULT_PRICING = { inputPerM: 3, outputPerM: 15, cachedPerM: 0.3 };

function getPricing(model?: string) {
	if (!model) return DEFAULT_PRICING;
	// Try exact match first, then prefix match
	if (PRICING[model]) return PRICING[model];
	const key = Object.keys(PRICING).find((k) => model.startsWith(k));
	return key ? PRICING[key] : DEFAULT_PRICING;
}

function calcCost(
	inputTokens: number,
	outputTokens: number,
	cachedTokens: number,
	model?: string,
): number {
	const p = getPricing(model);
	return (
		(inputTokens * p.inputPerM +
			outputTokens * p.outputPerM +
			cachedTokens * p.cachedPerM) /
		1_000_000
	);
}

// ── Claude Code ───────────────────────────────────────────────────────────────

interface ClaudeUsage {
	input_tokens?: number;
	output_tokens?: number;
	cache_read_input_tokens?: number;
	cache_creation_input_tokens?: number;
}

interface ClaudeJsonlEntry {
	type?: string;
	message?: { usage?: ClaudeUsage };
	usage?: ClaudeUsage;
}

async function readClaudeCost(
	spawnedAt: Date,
	worktreePath: string,
	model?: string,
): Promise<CardCost | null> {
	try {
		// Claude stores sessions at ~/.claude/projects/<url-encoded-path>/<uuid>.jsonl
		const claudeDir = join(homedir(), ".claude", "projects");
		// Encode the worktree path the same way Claude does
		const encodedPath = encodeURIComponent(worktreePath).replace(/%2F/g, "%2F");

		let projectDir: string | null = null;

		// Try to find the matching project folder — Claude encodes the path as the dir name
		try {
			const entries = await readdir(claudeDir);
			// Find folder whose name decodes to (or contains) the worktree path
			for (const entry of entries) {
				try {
					const decoded = decodeURIComponent(entry);
					if (
						decoded === worktreePath ||
						worktreePath.includes(decoded) ||
						decoded.includes(worktreePath)
					) {
						projectDir = join(claudeDir, entry);
						break;
					}
				} catch {
					/* invalid encoding, skip */
				}
			}
			// Fallback: find most recently modified folder
			if (!projectDir && entries.length > 0) {
				const stats = await Promise.all(
					entries.map(async (e) => ({
						name: e,
						mtime: (await stat(join(claudeDir, e))).mtime,
					})),
				);
				// Pick folder most recently modified after spawn
				const recent = stats
					.filter((s) => s.mtime >= spawnedAt)
					.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];
				if (recent) projectDir = join(claudeDir, recent.name);
			}
		} catch {
			/* ~/.claude/projects doesn't exist yet */
		}

		if (!projectDir) return null;

		// Find the JSONL file created closest to spawnedAt
		const files = (await readdir(projectDir)).filter((f) =>
			f.endsWith(".jsonl"),
		);
		if (files.length === 0) return null;

		const fileStats = await Promise.all(
			files.map(async (f) => ({
				name: f,
				mtime: (await stat(join(projectDir!, f))).mtime,
				ctime: (await stat(join(projectDir!, f))).ctime,
			})),
		);

		// Best candidate: newest file that was created after spawnedAt
		const candidates = fileStats
			.filter((f) => f.ctime >= spawnedAt || f.mtime >= spawnedAt)
			.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

		const target =
			candidates[0] ??
			fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];
		if (!target) return null;

		const raw = await readFile(join(projectDir, target.name), "utf-8");
		const lines = raw.split("\n").filter(Boolean);

		let inputTokens = 0;
		let outputTokens = 0;
		let cachedTokens = 0;

		for (const line of lines) {
			try {
				const entry = JSON.parse(line) as ClaudeJsonlEntry;
				// Claude Code format: entry.message.usage or entry.usage
				const usage = entry.message?.usage ?? entry.usage;
				if (!usage) continue;
				inputTokens += usage.input_tokens ?? 0;
				outputTokens += usage.output_tokens ?? 0;
				cachedTokens +=
					(usage.cache_read_input_tokens ?? 0) +
					(usage.cache_creation_input_tokens ?? 0);
			} catch {
				/* malformed line */
			}
		}

		if (inputTokens === 0 && outputTokens === 0) return null;

		const totalTokens = inputTokens + outputTokens + cachedTokens;
		return {
			inputTokens,
			outputTokens,
			cachedTokens,
			totalTokens,
			estimatedCostUsd: calcCost(
				inputTokens,
				outputTokens,
				cachedTokens,
				model,
			),
			source: "jsonl",
		};
	} catch (err) {
		console.error("[costReader] claude error:", err);
		return null;
	}
}

// ── Codex ─────────────────────────────────────────────────────────────────────

interface CodexTokenCount {
	input_tokens?: number;
	output_tokens?: number;
	cached_tokens?: number;
	reasoning_tokens?: number;
	total_tokens?: number;
}

interface CodexJsonlEntry {
	type?: string;
	payload?: {
		type?: string;
		usage?: CodexTokenCount;
		// cumulative totals in token_count events
		input?: number;
		output?: number;
		cached?: number;
		total?: number;
	};
}

async function readCodexCost(
	spawnedAt: Date,
	model?: string,
): Promise<CardCost | null> {
	try {
		const codexDir = join(homedir(), ".codex", "sessions");
		const files = (await readdir(codexDir)).filter((f) => f.endsWith(".jsonl"));
		if (files.length === 0) return null;

		const fileStats = await Promise.all(
			files.map(async (f) => ({
				name: f,
				mtime: (await stat(join(codexDir, f))).mtime,
			})),
		);

		// Find session files touched after spawn
		const candidates = fileStats
			.filter((f) => f.mtime >= spawnedAt)
			.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

		const target = candidates[0];
		if (!target) return null;

		const raw = await readFile(join(codexDir, target.name), "utf-8");
		const lines = raw.split("\n").filter(Boolean);

		// Codex uses cumulative totals — take the last token_count event
		let lastInput = 0,
			lastOutput = 0,
			lastCached = 0;

		for (const line of lines) {
			try {
				const entry = JSON.parse(line) as CodexJsonlEntry;
				if (entry.payload?.type === "token_count") {
					lastInput = entry.payload.input ?? lastInput;
					lastOutput = entry.payload.output ?? lastOutput;
					lastCached = entry.payload.cached ?? lastCached;
				}
				// Also handle turn.completed style events
				if (entry.type === "turn.completed" && entry.payload?.usage) {
					const u = entry.payload.usage;
					lastInput = u.input_tokens ?? lastInput;
					lastOutput = u.output_tokens ?? lastOutput;
					lastCached = u.cached_tokens ?? lastCached;
				}
			} catch {
				/* malformed line */
			}
		}

		if (lastInput === 0 && lastOutput === 0) return null;

		const totalTokens = lastInput + lastOutput + lastCached;
		return {
			inputTokens: lastInput,
			outputTokens: lastOutput,
			cachedTokens: lastCached,
			totalTokens,
			estimatedCostUsd: calcCost(lastInput, lastOutput, lastCached, model),
			source: "jsonl",
		};
	} catch (err) {
		console.error("[costReader] codex error:", err);
		return null;
	}
}

// ── Gemini (PTY scrape) ───────────────────────────────────────────────────────

// Strip ANSI escape sequences
function stripAnsi(s: string): string {
	// eslint-disable-next-line no-control-regex
	return s.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "").replace(/\r/g, "");
}

/**
 * Parse Gemini /stats output from raw PTY text.
 * Looks for patterns like:
 *   Total tokens used:  42,341
 *   Input tokens:       38,104
 *   Output tokens:       4,237
 *   Cached tokens:         892
 */
export function parseGeminiStats(rawOutput: string): CardCost | null {
	const text = stripAnsi(rawOutput);

	function extract(label: string): number {
		const re = new RegExp(`${label}[:\\s]+([\\d,]+)`, "i");
		const m = text.match(re);
		return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
	}

	const inputTokens = extract("input tokens");
	const outputTokens = extract("output tokens");
	const cachedTokens = extract("cached tokens");
	const totalFromStats = extract("total tokens");

	if (inputTokens === 0 && outputTokens === 0 && totalFromStats === 0)
		return null;

	const totalTokens =
		totalFromStats || inputTokens + outputTokens + cachedTokens;
	return {
		inputTokens,
		outputTokens,
		cachedTokens,
		totalTokens,
		estimatedCostUsd: calcCost(inputTokens, outputTokens, cachedTokens),
		source: "pty-scrape",
	};
}

// ── Amp (PTY scrape) ──────────────────────────────────────────────────────────

/**
 * Amp prints a summary on exit. Empirically observed patterns:
 *   Tokens: 12,450 input / 2,340 output
 *   Cost: $0.0423
 * This is speculative — will improve as we observe real output.
 */
export function parseAmpStats(rawOutput: string): CardCost | null {
	const text = stripAnsi(rawOutput);

	// Try to find explicit cost line first
	const costMatch = text.match(/cost[:\s]+\$?([\d.]+)/i);
	const estimatedCostUsd = costMatch ? parseFloat(costMatch[1]) : 0;

	const tokenMatch = text.match(/([\d,]+)\s*input\s*\/\s*([\d,]+)\s*output/i);
	if (!tokenMatch && !costMatch) return null;

	const inputTokens = tokenMatch
		? parseInt(tokenMatch[1].replace(/,/g, ""), 10)
		: 0;
	const outputTokens = tokenMatch
		? parseInt(tokenMatch[2].replace(/,/g, ""), 10)
		: 0;

	return {
		inputTokens,
		outputTokens,
		cachedTokens: 0,
		totalTokens: inputTokens + outputTokens,
		estimatedCostUsd,
		source: "pty-scrape",
	};
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function readCostFromFiles(
	provider: AgentProvider,
	spawnedAt: Date,
	worktreePath: string,
	model?: string,
): Promise<CardCost | null> {
	switch (provider) {
		case "claude-code":
			return readClaudeCost(spawnedAt, worktreePath, model);
		case "codex":
			return readCodexCost(spawnedAt, model);
		default:
			// gemini + amp: use PTY scraping (handled in spawner via parseGeminiStats/parseAmpStats)
			return null;
	}
}
