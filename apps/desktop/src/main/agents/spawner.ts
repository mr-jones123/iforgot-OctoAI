import type { AgentProvider } from "@riza/shared";
import { BrowserWindow } from "electron";
import type { IDisposable, IPty } from "node-pty";
import * as pty from "node-pty";

interface Session {
	pty: IPty;
	dataListener: IDisposable;
	// Rolling buffer of output — replayed to the terminal panel when it connects
	buffer: string[];
}

const sessions = new Map<string, Session>();
const MAX_BUFFER = 2000; // max chunks to keep

function buildCommand(
	provider: AgentProvider,
	description: string,
	model?: string,
): { cmd: string; args: string[]; injectStdin: boolean } {
	switch (provider) {
		case "claude-code":
			// Positional prompt arg boots the interactive TUI with the task pre-loaded.
			// User can type in the xterm panel at any time. No stdin injection needed.
			return {
				cmd: "claude",
				args: ["--dangerously-skip-permissions", description],
				injectStdin: false,
			};
		case "codex":
			// Same pattern — bare TUI + stdin injection
			return {
				cmd: "codex",
				args: [],
				injectStdin: true,
			};
		case "gemini":
			// -i/--prompt-interactive sends the prompt and stays in interactive mode
			// --yolo auto-accepts tool calls, --skip-trust skips workspace trust prompt
			return {
				cmd: "gemini",
				args: ["--prompt-interactive", description, "--yolo", "--skip-trust"],
				injectStdin: false,
			};
		case "ollama":
			// ollama run drops into an interactive chat — inject task via stdin after boot
			return {
				cmd: "ollama",
				args: ["run", model ?? "llama3"],
				injectStdin: true,
			};
	}
}

function getWin() {
	return BrowserWindow.getAllWindows()[0] ?? null;
}

function sendToTerminal(cardId: string, text: string) {
	getWin()?.webContents.send(`terminal:data:${cardId}`, text);
}

function bufferAndSend(session: Session, cardId: string, text: string) {
	session.buffer.push(text);
	if (session.buffer.length > MAX_BUFFER) session.buffer.shift();
	sendToTerminal(cardId, text);
}

// How long to wait for the TUI to boot before sending the initial task prompt
const BOOT_DELAY_MS: Record<AgentProvider, number> = {
	"claude-code": 3000,
	codex: 2000,
	gemini: 2000,
	ollama: 1000,
};

export function spawnAgent(
	cardId: string,
	provider: AgentProvider,
	description: string,
	worktreePath: string,
	model?: string,
): void {
	console.log(
		`[spawner] spawnAgent called: cardId=${cardId} provider=${provider} cwd=${worktreePath}`,
	);
	console.log(
		`[spawner] description length=${description.length}: "${description.slice(0, 100)}"`,
	);

	if (sessions.has(cardId)) {
		console.log(`[spawner] session already exists for ${cardId}, skipping`);
		return;
	}

	const { cmd, args, injectStdin } = buildCommand(provider, description, model);

	console.log(
		`[spawner] full command: ${cmd} ${args.map((a) => `"${a.slice(0, 80)}"`).join(" ")}`,
	);
	console.log(`[spawner] injectStdin=${injectStdin}`);

	let ptyProcess: IPty;
	try {
		console.log(`[spawner] calling pty.spawn(...) cwd=${worktreePath}`);
		ptyProcess = pty.spawn(cmd, args, {
			name: "xterm-256color",
			cols: 220,
			rows: 50,
			cwd: worktreePath,
			env: { ...process.env } as Record<string, string>,
		});
		console.log(`[spawner] pty.spawn returned pid=${ptyProcess.pid}`);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[spawner] spawn failed: ${msg}`);
		// Store a fake session with the error so the panel can replay it
		const errorSession: Session = {
			pty: null as never,
			dataListener: null as never,
			buffer: [],
		};
		const errText = `\x1b[31m[riza] Failed to start agent: ${msg}\r\n\x1b[33m[riza] Make sure '${cmd}' is installed and in your PATH.\r\n\x1b[0m`;
		errorSession.buffer.push(errText);
		sessions.set(cardId, errorSession);
		sendToTerminal(cardId, errText);
		getWin()?.webContents.send("agent:status", {
			cardId,
			state: "failed",
			raisedHand: false,
		});
		return;
	}

	const session: Session = {
		pty: ptyProcess,
		dataListener: null as never,
		buffer: [],
	};
	sessions.set(cardId, session);

	const startMsg = `\x1b[90m[riza] Started ${cmd} (pid ${ptyProcess.pid})\r\n\x1b[0m`;
	bufferAndSend(session, cardId, startMsg);
	console.log(
		`[spawner] Started ${cmd} pid=${ptyProcess.pid}, sending agent:status running`,
	);

	// Immediately notify renderer that the agent is running
	getWin()?.webContents.send("agent:status", {
		cardId,
		state: "running",
		raisedHand: false,
	});

	let firstDataReceived = false;
	const dataListener = ptyProcess.onData((data) => {
		if (!firstDataReceived) {
			firstDataReceived = true;
			console.log(
				`[spawner] first PTY output received for ${cardId} (${data.length} bytes)`,
			);
		}
		bufferAndSend(session, cardId, data);
	});
	session.dataListener = dataListener;

	// For providers that don't support a prompt arg (ollama),
	// inject the task via stdin after a short boot delay.
	if (injectStdin && description.trim()) {
		const delay = BOOT_DELAY_MS[provider] ?? 2000;
		console.log(
			`[spawner] scheduling stdin injection in ${delay}ms for ${provider}`,
		);
		setTimeout(() => {
			if (sessions.has(cardId)) {
				console.log(`[spawner] injecting stdin prompt for ${provider}`);
				ptyProcess.write(description + "\r");
			} else {
				console.log(
					`[spawner] session gone before stdin injection for ${cardId}`,
				);
			}
		}, delay);
	}

	ptyProcess.onExit(({ exitCode }) => {
		console.log(
			`[spawner] ${cmd} pid=${ptyProcess.pid} exited code=${exitCode}`,
		);
		const exitMsg = `\x1b[90m\r\n[riza] Process exited (code ${exitCode})\r\n\x1b[0m`;
		bufferAndSend(session, cardId, exitMsg);
		getWin()?.webContents.send("agent:status", {
			cardId,
			state: exitCode === 0 ? "done" : "failed",
			raisedHand: false,
		});
		// Keep session in map so buffer remains available for replay
		session.dataListener?.dispose();
	});
}

/** Returns all buffered output for a card — called when terminal panel opens */
export function getBuffer(cardId: string): string {
	const session = sessions.get(cardId);
	if (!session) return "";
	return session.buffer.join("");
}

export function killAgent(cardId: string): void {
	const session = sessions.get(cardId);
	if (!session) return;
	session.dataListener?.dispose();
	session.pty?.kill();
	sessions.delete(cardId);
}

export function writeToAgent(cardId: string, data: string): void {
	sessions.get(cardId)?.pty?.write(data);
}

export function resizeAgent(cardId: string, cols: number, rows: number): void {
	sessions.get(cardId)?.pty?.resize(cols, rows);
}
