/**
 * Embedded MCP server — agent message bus.
 *
 * Starts a local HTTP+SSE MCP server on a random available port when the app launches.
 * Each agent gets a generated mcp.json injected at spawn time pointing to this server.
 *
 * Exposed MCP tools:
 *
 *   post_message(channel_id, content, is_hand_raise?)
 *     → Inserts message into SQLite messages table
 *     → Emits IPC event `channel:message:{channelId}` to renderer
 *     → If is_hand_raise=true, also emits `agent:status` with raisedHand: true
 *
 *   read_messages(channel_id, since_timestamp?)
 *     → Returns message array from SQLite for the given channel
 *     → Agents use this to read user replies or other agents' messages
 *
 *   mention_agent(agent_id, message)
 *     → Targeted message to a specific agent's channel
 *     → Used for agent-to-agent communication (subtask handoffs)
 *
 *   get_task_context(card_id)
 *     → Returns the card title, description, and worktree path
 *     → Agents call this to re-orient after a context reset
 *
 * The server port is stored in a module-level variable and written to each
 * mcp.json config at agent spawn time.
 *
 * TODO: implement using @modelcontextprotocol/sdk McpServer
 */

let serverPort: number | null = null;

export async function startMcpServer(): Promise<number> {
	// TODO: initialize McpServer, register tools, start on random port
	serverPort = 0; // placeholder
	return serverPort;
}

export function getMcpPort(): number {
	if (serverPort === null) throw new Error("MCP server not started");
	return serverPort;
}

export function generateMcpConfig(cardId: string, channelId: string): object {
	const port = getMcpPort();
	return {
		mcpServers: {
			riza: {
				url: `http://localhost:${port}/mcp`,
				env: {
					RIZA_CARD_ID: cardId,
					RIZA_CHANNEL_ID: channelId,
				},
			},
		},
	};
}
