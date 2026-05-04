/**
 * Preload script — contextBridge between renderer and main process.
 *
 * Exposes a typed `window.riza` API to the renderer.
 * Never expose raw ipcRenderer.on — only specific named channels.
 *
 * Channels follow the pattern: `domain:action` (e.g. `workspace:create`, `agent:spawn`)
 *
 * TODO: expand as IPC handlers are implemented
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("riza", {
	// Dialog
	dialog: {
		openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
	},

	// Workspace
	workspace: {
		list: () => ipcRenderer.invoke("workspace:list"),
		create: (input: unknown) => ipcRenderer.invoke("workspace:create", input),
		delete: (id: string) => ipcRenderer.invoke("workspace:delete", id),
	},

	// Board / Cards
	board: {
		get: (workspaceId: string) => ipcRenderer.invoke("board:get", workspaceId),
		cardMove: (cardId: string, columnId: string, order: number) =>
			ipcRenderer.invoke("card:move", { cardId, columnId, order }),
		cardCreate: (input: unknown) => ipcRenderer.invoke("card:create", input),
		cardDelete: (cardId: string) => ipcRenderer.invoke("card:delete", cardId),
	},

	// Agent control
	agent: {
		spawn: (payload: {
			cardId: string;
			provider: string;
			description: string;
			worktreePath: string;
			model?: string;
		}) => ipcRenderer.invoke("agent:spawn", payload),
		kill: (cardId: string) => ipcRenderer.invoke("agent:kill", cardId),
		onStatus: (cb: (status: unknown) => void) => {
			ipcRenderer.on("agent:status", (_e, status) => cb(status));
			return () => ipcRenderer.removeAllListeners("agent:status");
		},
	},

	// Terminal I/O
	terminal: {
		input: (cardId: string, data: string) =>
			ipcRenderer.send("terminal:input", { cardId, data }),
		// Fetch all buffered output since spawn — called when panel first opens
		buffer: (cardId: string): Promise<string> =>
			ipcRenderer.invoke("terminal:buffer", cardId),
		onData: (cardId: string, cb: (data: string) => void) => {
			const channel = `terminal:data:${cardId}`;
			const handler = (_e: Electron.IpcRendererEvent, data: string) => cb(data);
			ipcRenderer.on(channel, handler);
			return () => ipcRenderer.removeListener(channel, handler);
		},
		resize: (cardId: string, cols: number, rows: number) =>
			ipcRenderer.send("terminal:resize", { cardId, cols, rows }),
	},

	// Channel (agent messaging)
	channel: {
		messages: (channelId: string) =>
			ipcRenderer.invoke("channel:messages", channelId),
		send: (channelId: string, content: string) =>
			ipcRenderer.invoke("channel:send", { channelId, content }),
		onMessage: (channelId: string, cb: (msg: unknown) => void) => {
			ipcRenderer.on(`channel:message:${channelId}`, (_e, msg) => cb(msg));
		},
	},
});
