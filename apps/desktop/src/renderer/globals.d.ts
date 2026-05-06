// Type declarations for the contextBridge API exposed by preload.ts
interface RizaAPI {
	dialog: {
		openFolder: () => Promise<string | null>;
	};
	agent: {
		spawn: (payload: {
			cardId: string;
			provider: string;
			description: string;
			worktreePath: string;
			model?: string;
			dependsOn?: string[];
		}) => Promise<void>;
		kill: (cardId: string) => Promise<void>;
		onStatus: (
			cb: (status: {
				cardId: string;
				state: "running" | "done" | "failed" | "waiting" | "idle";
				raisedHand: boolean;
			}) => void,
		) => () => void;
		checkInstalled: (provider: string) => Promise<{
			installed: boolean;
			command: string;
			hint: string;
		}>;
	};
	terminal: {
		input: (cardId: string, data: string) => void;
		buffer: (cardId: string) => Promise<string>;
		onData: (cardId: string, cb: (data: string) => void) => () => void;
		resize: (cardId: string, cols: number, rows: number) => void;
	};
	channel: {
		messages: (channelId: string) => Promise<unknown[]>;
		send: (channelId: string, content: string) => Promise<void>;
		onMessage: (channelId: string, cb: (msg: unknown) => void) => void;
	};
	workspace: {
		list: () => Promise<unknown[]>;
		create: (input: unknown) => Promise<unknown>;
		delete: (id: string) => Promise<void>;
	};
	board: {
		get: (workspaceId: string) => Promise<unknown>;
		cardMove: (
			cardId: string,
			columnId: string,
			order: number,
		) => Promise<void>;
		cardCreate: (input: unknown) => Promise<unknown>;
		cardDelete: (cardId: string) => Promise<void>;
	};
}

declare global {
	interface Window {
		riza?: RizaAPI;
	}
}

export {};
