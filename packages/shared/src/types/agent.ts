export type AgentProvider = "claude-code" | "codex" | "gemini" | "ollama";

export interface AgentConfig {
	provider: AgentProvider;
	model?: string; // e.g. "claude-sonnet-4-5", "gpt-4o", "gemini-2.0-flash"
	ollamaModel?: string; // only for ollama provider
}

export interface AgentStatus {
	cardId: string;
	provider: AgentProvider;
	pid?: number;
	state: "idle" | "running" | "waiting" | "done" | "failed";
	raisedHand: boolean; // agent emitted a blocking question / needs human input
	startedAt?: string;
	finishedAt?: string;
}

// CLI invocation map — how each provider is spawned
export const AGENT_COMMANDS: Record<AgentProvider, string> = {
	"claude-code": "claude",
	codex: "codex",
	gemini: "gemini",
	ollama: "ollama",
};
