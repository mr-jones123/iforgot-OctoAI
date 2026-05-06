import type { AgentConfig } from "./agent";

export type CardStatus = "idle" | "running" | "waiting" | "done" | "failed";

export interface Card {
	id: string;
	boardId: string;
	columnId: string;
	title: string;
	description: string; // the task prompt sent to the agent
	agent: AgentConfig;
	worktreePath?: string; // set when agent is spawned
	status: CardStatus;
	raisedHand: boolean; // agent is blocked and needs human attention
	order: number;
	dependsOn: string[]; // card IDs that must be in 'done' before this card can run
	createdAt: string;
	updatedAt: string;
}

export interface CardCreateInput {
	boardId: string;
	columnId: string;
	title: string;
	description: string;
	agent: AgentConfig;
	dependsOn?: string[];
}
