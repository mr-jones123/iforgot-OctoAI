import { dialog, ipcMain } from "electron";
import type { CardCost } from "@riza/shared";
import {
	checkProviderInstalled,
	getBuffer,
	killAgent,
	resizeAgent,
	spawnAgent,
	writeToAgent,
} from "../agents/spawner";
import { scheduleCard, unscheduleCard } from "../scheduler";

// In-memory store of costs keyed by cardId — persists across panel opens
const cardCosts = new Map<string, CardCost>();

export function registerIpcHandlers() {
	// ── Dialog ────────────────────────────────────────────────────────────────
	ipcMain.handle("dialog:openFolder", async () => {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"],
			title: "Select a git repository",
		});
		return result.filePaths[0] ?? null;
	});

	// ── Agent ─────────────────────────────────────────────────────────────────
	ipcMain.handle(
		"agent:spawn",
		(
			_e,
			payload: {
				cardId: string;
				provider: string;
				description: string;
				worktreePath: string;
				model?: string;
			},
		) => {
			console.log(
				`[ipc] agent:spawn received cardId=${payload.cardId} provider=${payload.provider} worktreePath=${payload.worktreePath}`,
			);
			spawnAgent(
				payload.cardId,
				payload.provider as never,
				payload.description,
				payload.worktreePath,
				payload.model,
			);
			console.log(`[ipc] agent:spawn returned for ${payload.cardId}`);
		},
	);

	ipcMain.handle("agent:kill", (_e, cardId: string) => {
		killAgent(cardId);
	});

	// ── Scheduler ─────────────────────────────────────────────────────────────

	// Register or re-register a scheduled card.
	// Called whenever a card with scheduledAt is created, edited, or restored on mount.
	ipcMain.handle(
		"card:schedule",
		(
			_e,
			payload: {
				cardId: string;
				provider: string;
				description: string;
				worktreePath: string;
				scheduledAt: string;
				model?: string;
				dependsOn?: string[];
			},
		) => {
			scheduleCard({
				...payload,
				provider: payload.provider as never,
			});
		},
	);

	// Cancel the timer for a card (deleted, edited to remove schedule, or manually played).
	ipcMain.handle("card:unschedule", (_e, cardId: string) => {
		unscheduleCard(cardId);
	});

	// ── Analytics / Cost ──────────────────────────────────────────────────────

	// Store cost when spawner emits it (internal — not invoked by renderer)
	ipcMain.on(
		"_internal:cost",
		(_e, payload: { cardId: string; cost: CardCost }) => {
			cardCosts.set(payload.cardId, payload.cost);
		},
	);

	// Renderer can fetch all stored costs
	ipcMain.handle("analytics:getCosts", () => {
		return Object.fromEntries(cardCosts.entries());
	});

	// Replay buffered output to a terminal panel that just opened
	ipcMain.handle("terminal:buffer", (_e, cardId: string) => {
		return getBuffer(cardId);
	});

	// ── Terminal I/O (fire-and-forget, no return value needed) ────────────────
	ipcMain.on(
		"terminal:input",
		(_e, payload: { cardId: string; data: string }) => {
			writeToAgent(payload.cardId, payload.data);
		},
	);

	ipcMain.on(
		"terminal:resize",
		(_e, payload: { cardId: string; cols: number; rows: number }) => {
			resizeAgent(payload.cardId, payload.cols, payload.rows);
		},
	);
}
