"use client";
import type { Channel } from "@riza/shared";
/**
 * ChannelPanel — Slack-style agent communication channel per card.
 *
 * Lives as a tab alongside the terminal in the card drawer.
 * Messages come from SQLite via IPC `channel:messages:{channelId}`.
 * New messages pushed via IPC event `channel:message:{channelId}`.
 *
 * Design:
 *   - Message list: agent messages left-aligned, user messages right-aligned
 *   - Agent messages have provider badge + subtle left border in accent color
 *   - Hand-raise messages get amber highlight + icon
 *   - User reply input at bottom — sends via IPC `channel:send`
 *   - Staggered mount animation on initial message list load
 *   - Auto-scroll to bottom on new message (no jumping — smooth scroll)
 *
 * Doubles as session recap: the entire decision trail is readable here.
 *
 * TODO: wire IPC listeners + reply input
 */
import { memo, useEffect, useRef } from "react";

interface ChannelPanelProps {
	channel: Channel;
}

export const ChannelPanel = memo(function ChannelPanel({
	channel,
}: ChannelPanelProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [channel.messages.length]);

	return (
		<div className="flex flex-col h-full">
			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
				{channel.messages.length === 0 && (
					<div className="flex items-center justify-center py-12">
						<p className="text-text-tertiary text-xs font-mono">
							No messages yet. Agent activity will appear here.
						</p>
					</div>
				)}

				{channel.messages.map((msg) => (
					<div
						key={msg.id}
						className={[
							"flex flex-col gap-1 max-w-[85%]",
							msg.sender === "user"
								? "self-end items-end"
								: "self-start items-start",
							msg.isHandRaise ? "border-l-2 border-yellow-500 pl-2" : "",
						].join(" ")}
					>
						<span className="text-[10px] font-mono text-text-tertiary">
							{msg.sender}
						</span>
						<div
							className={[
								"px-3 py-2 rounded-card text-sm leading-relaxed",
								msg.sender === "user"
									? "bg-accent/10 text-text-primary border border-accent/20"
									: "bg-surface-raised text-text-primary border border-surface-border",
								msg.isHandRaise ? "border-yellow-500/40" : "",
							].join(" ")}
						>
							{msg.content}
						</div>
					</div>
				))}

				<div ref={bottomRef} />
			</div>

			{/* Reply input */}
			<div className="border-t border-surface-border px-4 py-3 shrink-0">
				<input
					type="text"
					placeholder="Reply to agent…"
					className="w-full bg-surface-overlay text-text-primary text-sm px-3 py-2 rounded-card border border-surface-border placeholder:text-text-tertiary focus:outline-none focus:border-accent/60 transition-colors duration-200 font-mono"
				/>
			</div>
		</div>
	);
});
