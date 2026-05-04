export type MessageSender = "user" | string; // string = agent id / provider name

export interface Message {
	id: string;
	channelId: string;
	sender: MessageSender;
	content: string;
	// If the agent raised its hand, this message is the blocking question
	isHandRaise: boolean;
	timestamp: string;
}

export interface Channel {
	id: string;
	cardId: string;
	// Channel name mirrors the card title for readability
	name: string;
	messages: Message[];
	createdAt: string;
}
