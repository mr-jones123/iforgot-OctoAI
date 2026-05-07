/**
 * Card scheduler — fires spawnAgent at a user-defined date/time.
 *
 * Each card with a scheduledAt gets one precise setTimeout aimed at its fire
 * time. No polling loop needed. On app restart the renderer re-registers every
 * idle scheduled card via IPC so timers are restored.
 *
 * Timers are stored by cardId and cleared if the card is edited, deleted, or
 * manually played before the scheduled time.
 */

import { BrowserWindow } from "electron";
import { spawnAgent } from "./agents/spawner";
import type { AgentProvider } from "@riza/shared";

interface ScheduleEntry {
	cardId: string;
	provider: AgentProvider;
	description: string;
	worktreePath: string;
	model?: string;
	dependsOn?: string[];
	scheduledAt: string; // ISO 8601
}

// Map from cardId → the active timer handle
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function getWin() {
	return BrowserWindow.getAllWindows()[0] ?? null;
}

/**
 * Register (or re-register) a scheduled card.
 * Safe to call multiple times for the same cardId — clears the old timer first.
 */
export function scheduleCard(entry: ScheduleEntry): void {
	// Clear any existing timer for this card
	unscheduleCard(entry.cardId);

	const fireAt = new Date(entry.scheduledAt).getTime();
	const now = Date.now();
	const delayMs = fireAt - now;

	if (delayMs <= 0) {
		// Already past — don't fire automatically. The card stays idle so the
		// user can review and play manually. We do flag it to the renderer so
		// the UI can show "overdue".
		console.log(
			`[scheduler] card ${entry.cardId} scheduled time is in the past (${entry.scheduledAt}), skipping`,
		);
		getWin()?.webContents.send("scheduler:overdue", { cardId: entry.cardId });
		return;
	}

	console.log(
		`[scheduler] scheduling card ${entry.cardId} to fire in ${Math.round(delayMs / 1000)}s (${entry.scheduledAt})`,
	);

	const handle = setTimeout(() => {
		timers.delete(entry.cardId);
		console.log(`[scheduler] firing card ${entry.cardId}`);

		// Tell the renderer the card is now running before the PTY even starts
		getWin()?.webContents.send("scheduler:fire", { cardId: entry.cardId });

		spawnAgent(
			entry.cardId,
			entry.provider,
			entry.description,
			entry.worktreePath,
			entry.model,
			entry.dependsOn,
		);
	}, delayMs);

	timers.set(entry.cardId, handle);
}

/** Cancel a pending timer. No-op if the card has no active timer. */
export function unscheduleCard(cardId: string): void {
	const handle = timers.get(cardId);
	if (handle !== undefined) {
		clearTimeout(handle);
		timers.delete(cardId);
		console.log(`[scheduler] unscheduled card ${cardId}`);
	}
}

/** Cancel all timers — called on app quit. */
export function clearAllSchedules(): void {
	for (const handle of timers.values()) clearTimeout(handle);
	timers.clear();
}
