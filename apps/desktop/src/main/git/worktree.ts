/**
 * Worktree management — simple-git wrapper.
 *
 * Each card gets its own git worktree when the agent is spawned.
 * Worktrees live at: {workspace.worktreeRoot}/card-{cardId}
 *
 * Operations:
 *   createWorktree(repoPath, worktreeRoot, cardId)
 *     → git worktree add {worktreeRoot}/card-{cardId} -b riza/card-{cardId}
 *
 *   removeWorktree(worktreeRoot, cardId)
 *     → git worktree remove {worktreeRoot}/card-{cardId} --force
 *
 *   getDiff(repoPath, cardId)
 *     → returns unified diff of worktree branch vs main
 *     → used in the Review column diff view
 *
 *   mergeWorktree(repoPath, cardId)
 *     → git merge riza/card-{cardId} into current branch (main)
 *     → called when user approves a card in Review
 *
 * TODO: implement each function using simple-git
 */

export async function createWorktree(
	_repoPath: string,
	_worktreeRoot: string,
	_cardId: string,
): Promise<string> {
	// returns the worktree path
	throw new Error("Not implemented");
}

export async function removeWorktree(
	_worktreeRoot: string,
	_cardId: string,
): Promise<void> {
	throw new Error("Not implemented");
}

export async function getDiff(
	_repoPath: string,
	_cardId: string,
): Promise<string> {
	// returns raw unified diff string
	throw new Error("Not implemented");
}

export async function mergeWorktree(
	_repoPath: string,
	_cardId: string,
): Promise<void> {
	throw new Error("Not implemented");
}
