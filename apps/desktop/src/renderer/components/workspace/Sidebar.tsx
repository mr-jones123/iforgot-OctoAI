/**
 * Sidebar — left rail navigation (240px fixed).
 *
 * Sections:
 *   - Riza wordmark at top
 *   - Workspace name + repo path (truncated)
 *   - Agent status summary: count of running / waiting / done agents
 *   - Workspace switcher (list of other workspaces)
 *   - Settings link at bottom
 *
 * Design (DESIGN_VARIANCE 8):
 *   - No card containers — separation via border-t and spacing only
 *   - Geist font, tight tracking
 *   - Accent color used exclusively for active state dot and count badge
 *   - Fixed position, full height
 *
 * TODO: wire workspace list + agent counts from store/IPC
 */
import type { Workspace } from "@riza/shared";

interface SidebarProps {
	workspace: Workspace;
}

export function Sidebar({ workspace }: SidebarProps) {
	return (
		<aside className="w-[240px] shrink-0 flex flex-col border-r border-surface-border min-h-[100dvh] px-4 py-5 gap-6">
			{/* Wordmark */}
			<div>
				<span className="text-sm font-semibold tracking-tighter text-text-primary">
					Riza
				</span>
			</div>

			{/* Workspace info */}
			<div className="flex flex-col gap-1">
				<span className="text-xs text-text-tertiary font-mono uppercase tracking-widest">
					Workspace
				</span>
				<span className="text-sm font-medium text-text-primary truncate">
					{workspace.name}
				</span>
				<span className="text-[11px] text-text-tertiary font-mono truncate">
					{workspace.repoPath}
				</span>
			</div>

			{/* Agent status summary */}
			<div className="flex flex-col gap-2 border-t border-surface-border pt-4">
				<span className="text-xs text-text-tertiary font-mono uppercase tracking-widest mb-1">
					Agents
				</span>
				{/* Status rows: running / waiting / done — wired from store */}
				<div className="flex items-center gap-2">
					<div className="status-dot-running" />
					<span className="text-xs text-text-secondary font-mono">
						0 running
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="status-dot-waiting" />
					<span className="text-xs text-text-secondary font-mono">
						0 waiting
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="status-dot-done" />
					<span className="text-xs text-text-secondary font-mono">0 done</span>
				</div>
			</div>

			{/* Spacer pushes settings to bottom */}
			<div className="flex-1" />

			{/* Settings */}
			<div className="border-t border-surface-border pt-4">
				<button
					type="button"
					className="text-xs text-text-tertiary hover:text-text-secondary font-mono transition-colors active:-translate-y-px"
				>
					Settings
				</button>
			</div>
		</aside>
	);
}
