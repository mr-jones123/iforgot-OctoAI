import type { AgentProvider } from "./agent";

export interface Workspace {
	id: string;
	name: string;
	repoPath: string; // absolute path to the git repo root
	worktreeRoot: string; // where per-card worktrees are created (default: repoPath/.riza-worktrees)
	providers: AgentProvider[]; // which agent providers are configured for this workspace
	createdAt: string;
	updatedAt: string;
}

export interface WorkspaceCreateInput {
	name: string;
	repoPath: string;
	providers: AgentProvider[];
}
