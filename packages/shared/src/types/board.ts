export interface Column {
	id: string;
	boardId: string;
	title: string;
	order: number;
	// Whether cards in this column can be auto-advanced by agent exit — always false for 'review'
	isReviewGate: boolean;
}

export interface Board {
	id: string;
	workspaceId: string;
	columns: Column[];
	createdAt: string;
	updatedAt: string;
}

// Default columns created with every new workspace
export const DEFAULT_COLUMNS: Omit<Column, "id" | "boardId">[] = [
	{ title: "Backlog", order: 0, isReviewGate: false },
	{ title: "To-do", order: 1, isReviewGate: false },
	{ title: "In Progress", order: 2, isReviewGate: false },
	{ title: "Review", order: 3, isReviewGate: true }, // human must manually advance
	{ title: "Done", order: 4, isReviewGate: false },
];
