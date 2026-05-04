import { memo, useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import type { Card } from "@riza/shared";

interface TerminalPanelProps {
	card: Card;
	isOpen: boolean;
	onClose: () => void;
}

export const TerminalPanel = memo(function TerminalPanel({
	card,
	isOpen,
	onClose,
}: TerminalPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const termRef = useRef<Terminal | null>(null);
	const fitRef = useRef<FitAddon | null>(null);
	// Cleanup functions returned by preload listeners
	const cleanupData = useRef<(() => void) | null>(null);

	useEffect(() => {
		if (!isOpen || !containerRef.current) return;

		// Init terminal
		const term = new Terminal({
			fontFamily: "Geist Mono, JetBrains Mono, monospace",
			fontSize: 13,
			lineHeight: 1.4,
			cursorBlink: true,
			theme: {
				background: "#09090b",
				foreground: "#fafafa",
				cursor: "#e85d2f",
				selectionBackground: "rgba(232,93,47,0.3)",
				black: "#18181b",
				brightBlack: "#3f3f46",
				red: "#ef4444",
				brightRed: "#f87171",
				green: "#10b981",
				brightGreen: "#34d399",
				yellow: "#f59e0b",
				brightYellow: "#fbbf24",
				blue: "#3b82f6",
				brightBlue: "#60a5fa",
				magenta: "#8b5cf6",
				brightMagenta: "#a78bfa",
				cyan: "#06b6d4",
				brightCyan: "#22d3ee",
				white: "#a1a1aa",
				brightWhite: "#fafafa",
			},
			allowTransparency: true,
			scrollback: 5000,
		});

		const fit = new FitAddon();
		const links = new WebLinksAddon();
		term.loadAddon(fit);
		term.loadAddon(links);
		term.open(containerRef.current);

		termRef.current = term;
		fitRef.current = fit;

		// setTimeout gives the browser time to fully lay out the container
		// before xterm tries to measure pixel dimensions for the canvas.
		// requestAnimationFrame is not enough — layout happens after paint.
		const timerId = setTimeout(async () => {
			if (!termRef.current) return;
			try {
				fit.fit();
			} catch (_) {}

			if (!window.riza) {
				term.write(
					"\x1b[33m[riza] window.riza undefined — preload failed.\r\n\x1b[0m",
				);
				return;
			}

			if (card.status === "idle") {
				term.write(
					"\x1b[90m[riza] Hit the play button on the card first.\r\n\x1b[0m",
				);
				return;
			}

			// Replay buffered output that arrived before this panel opened
			try {
				const buffered = await window.riza.terminal.buffer(card.id);
				if (buffered) {
					term.write(buffered);
				} else {
					term.write(
						`\x1b[90m[riza] No output yet from ${card.agent.provider}...\r\n\x1b[0m`,
					);
				}
			} catch (e) {
				term.write(`\x1b[31m[riza] Buffer fetch failed: ${e}\r\n\x1b[0m`);
			}
		}, 50);

		// User keyboard input → main process
		term.onData((data) => {
			window.riza?.terminal.input(card.id, data);
		});

		// PTY output from main process → xterm
		const removeDataListener = window.riza?.terminal.onData(
			card.id,
			(data: string) => {
				term.write(data);
			},
		);
		cleanupData.current = removeDataListener ?? null;

		// Resize observer — keep PTY cols/rows in sync with panel size
		const resizeObserver = new ResizeObserver(() => {
			if (!termRef.current) return;
			try {
				fit.fit();
			} catch (_) {}
			window.riza?.terminal.resize(card.id, term.cols, term.rows);
		});
		resizeObserver.observe(containerRef.current);

		return () => {
			clearTimeout(timerId);
			resizeObserver.disconnect();
			cleanupData.current?.();
			cleanupData.current = null;
			term.dispose();
			termRef.current = null;
			fitRef.current = null;
		};
	}, [isOpen, card.id]);

	return (
		<div
			className={[
				"fixed inset-y-0 right-0 w-[680px] flex flex-col",
				"glass-panel border-l border-surface-border",
				"transition-transform duration-300",
				isOpen ? "translate-x-0" : "translate-x-full",
			].join(" ")}
			style={{
				zIndex: 40,
				transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
			}}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
				<div className="flex items-center gap-2">
					<div className={`status-dot-${card.status}`} />
					<span className="text-sm font-medium text-text-primary tracking-tight truncate max-w-[380px]">
						{card.title}
					</span>
					<span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest shrink-0">
						{card.agent.provider}
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="text-xs font-mono text-text-tertiary hover:text-text-primary transition-colors active:-translate-y-px shrink-0"
				>
					close
				</button>
			</div>

			{/* xterm.js mount point */}
			<div
				ref={containerRef}
				className="flex-1 overflow-hidden"
				style={{ padding: "8px" }}
			/>
		</div>
	);
});
