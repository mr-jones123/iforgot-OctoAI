import type { AgentConfig } from "./agent";

export type CardStatus = "idle" | "running" | "waiting" | "done" | "failed";

export interface Card {
	id: string;
	boardId: string;
	columnId: string;
	title: string;
	description: string; // short display text shown on the card
	prompt: string; // the task prompt sent to the agent
	agent: AgentConfig;
	worktreePath?: string;
	channelId: string;
	status: CardStatus;
	raisedHand: boolean;
	order: number;
	dependsOn: string[];
	scheduledAt?: string | null; // ISO 8601 — if set, the main process fires the agent at this time
	createdAt: string;
	updatedAt: string;
}

export interface CardCreateInput {
	boardId: string;
	columnId: string;
	title: string;
	description: string;
	prompt: string;
	agent: AgentConfig;
	dependsOn?: string[];
	scheduledAt?: string | null;
}
