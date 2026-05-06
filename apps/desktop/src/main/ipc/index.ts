import { dialog, ipcMain } from "electron";
import {
	checkProviderInstalled,
	getBuffer,
	killAgent,
	resizeAgent,
	spawnAgent,
	writeToAgent,
} from "../agents/spawner";

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
