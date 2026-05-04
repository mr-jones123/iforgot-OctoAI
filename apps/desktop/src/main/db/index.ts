/**
 * SQLite database layer — better-sqlite3.
 *
 * Single database file at: {app.getPath('userData')}/riza.db
 *
 * Schema (tables):
 *   workspaces   — id, name, repo_path, worktree_root, providers, created_at, updated_at
 *   boards       — id, workspace_id, created_at, updated_at
 *   columns      — id, board_id, title, order, is_review_gate
 *   cards        — id, board_id, column_id, title, description, agent_provider, agent_model,
 *                  worktree_path, channel_id, status, raised_hand, order, depends_on, created_at, updated_at
 *   channels     — id, card_id, name, created_at
 *   messages     — id, channel_id, sender, content, is_hand_raise, timestamp
 *
 * All queries are synchronous (better-sqlite3 is sync by design).
 * Exported as a singleton initialized once at app start.
 *
 * TODO: implement init(), migrations, and query functions per domain
 */

export type { Database } from "better-sqlite3";

// TODO: export db singleton + query helpers
// export { db } from './connection'
// export * from './queries/workspace'
// export * from './queries/board'
// export * from './queries/card'
// export * from './queries/channel'
