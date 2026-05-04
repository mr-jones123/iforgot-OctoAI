/**
 * BoardPage — the main workspace view.
 *
 * Layout (DESIGN_VARIANCE 8 — asymmetric):
 *   Left rail (240px fixed): workspace nav + agent status summary
 *   Main area: horizontal kanban columns, horizontally scrollable
 *
 * TODO: wire to IPC for real board/card data
 */
import type { Workspace } from "@riza/shared";
import { Board } from "../components/board/Board";
import { Sidebar } from "../components/workspace/Sidebar";

interface BoardPageProps {
	workspace: Workspace;
}

export function BoardPage({ workspace }: BoardPageProps) {
	return (
		<div className="flex min-h-[100dvh] bg-[#09090b]">
			<Sidebar workspace={workspace} />
			<main className="flex-1 overflow-hidden">
				<Board workspace={workspace} />
			</main>
		</div>
	);
}
