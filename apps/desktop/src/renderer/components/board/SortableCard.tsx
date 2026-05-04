import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@riza/shared";
import { KanbanCard } from "./KanbanCard";

interface SortableCardProps {
	card: Card;
	isBlocked: boolean;
	onPlay: () => void;
	onStop: () => void;
	onOpen: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export function SortableCard({
	card,
	isBlocked,
	onPlay,
	onStop,
	onOpen,
	onEdit,
	onDelete,
}: SortableCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: card.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging ? 999 : undefined,
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<KanbanCard
				card={card}
				isBlocked={isBlocked}
				onPlay={onPlay}
				onStop={onStop}
				onOpen={onOpen}
				onEdit={onEdit}
				onDelete={onDelete}
			/>
		</div>
	);
}
