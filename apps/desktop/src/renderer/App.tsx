"use client";
import type { Workspace } from "@riza/shared";
import { useState } from "react";
import { BoardPage } from "./pages/BoardPage";
import { WorkspaceSetupPage } from "./pages/WorkspaceSetupPage";

/**
 * App root — decides whether to show workspace setup or the board.
 * In the real app, this checks SQLite via IPC for existing workspaces.
 */
export function App() {
	const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
		null,
	);

	if (!activeWorkspace) {
		return <WorkspaceSetupPage onWorkspaceCreated={setActiveWorkspace} />;
	}

	return <BoardPage workspace={activeWorkspace} />;
}
