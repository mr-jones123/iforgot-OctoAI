/**
 * Electron main process entry point.
 *
 * Responsibilities:
 *   1. Create BrowserWindow and load the Vite renderer
 *   2. Initialize SQLite database (db/index.ts)
 *   3. Start the embedded MCP server (mcp/server.ts)
 *   4. Register all IPC handlers (ipc/index.ts)
 *
 * Security:
 *   - contextIsolation: true
 *   - nodeIntegration: false
 *   - All Node.js access via contextBridge preload (preload.ts)
 */
import { app, BrowserWindow } from "electron";
import path from "path";
import { registerIpcHandlers } from "./ipc/index";

// Electron on macOS strips the shell PATH. Restore common locations so CLIs
// installed via homebrew, nvm, pip, etc. are all findable.
const EXTRA_PATH = [
	"/usr/local/bin",
	"/opt/homebrew/bin",
	"/opt/homebrew/sbin",
	`${process.env.HOME}/.local/bin`,
	`${process.env.HOME}/.bun/bin`,
	`${process.env.HOME}/.nvm/versions/node/v24.13.0/bin`,
].join(":");
process.env.PATH = `${EXTRA_PATH}:${process.env.PATH ?? ""}`;

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 900,
		minHeight: 600,
		backgroundColor: "#09090b", // zinc-950 — prevents white flash on load
		titleBarStyle: "hiddenInset", // macOS native traffic lights
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	// Always open devtools in dev (check for Vite dev server port as signal)
	const isDev = !app.isPackaged;
	if (isDev) {
		await mainWindow.loadURL("http://localhost:5173");
		mainWindow.webContents.openDevTools();
	} else {
		await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
	}
}

app.whenReady().then(async () => {
	// TODO: initDatabase()
	// TODO: startMcpServer()
	registerIpcHandlers();
	await createWindow();
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
	if (BrowserWindow.getAllWindows().length === 0) await createWindow();
});
