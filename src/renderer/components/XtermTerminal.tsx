/**
 * XtermTerminal - Full terminal emulator for interactive AI sessions.
 *
 * Uses xterm.js to render raw PTY output (ANSI escape sequences, cursor control,
 * bracketed paste, etc.) that ansi-to-html cannot handle. Used when a session
 * has isInteractiveAI=true (e.g., Claude Code running as an interactive TUI).
 *
 * Data flow:
 *   PTY (main) → IPC process:data → window.maestro.process.onData → term.write()
 *   term.onData (keystrokes) → window.maestro.process.write → PTY stdin
 *   fitAddon.fit() → window.maestro.process.resize → PTY resize
 */

import { useEffect, useRef, memo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { Theme } from '../types';

interface XtermTerminalProps {
	sessionId: string;
	tabId: string;
	theme: Theme;
	fontFamily: string;
}

function themeToXterm(theme: Theme): Record<string, string> {
	const isDark = theme.mode === 'dark' || theme.mode === 'vibe';
	return {
		background: theme.colors.bgActivity,
		foreground: theme.colors.textMain,
		cursor: theme.colors.accent,
		cursorAccent: theme.colors.bgActivity,
		selectionBackground: `${theme.colors.accent}40`,
		selectionForeground: theme.colors.textMain,
		// Map ANSI colors - use theme accent for bright blue
		black: isDark ? '#282a36' : '#000000',
		red: theme.colors.error,
		green: theme.colors.success,
		yellow: theme.colors.warning,
		blue: theme.colors.accent,
		magenta: isDark ? '#bd93f9' : '#a626a4',
		cyan: isDark ? '#8be9fd' : '#0184bc',
		white: theme.colors.textMain,
		brightBlack: theme.colors.textDim,
		brightRed: theme.colors.error,
		brightGreen: theme.colors.success,
		brightYellow: theme.colors.warning,
		brightBlue: theme.colors.accent,
		brightMagenta: isDark ? '#ff79c6' : '#c678dd',
		brightCyan: isDark ? '#8be9fd' : '#56b6c2',
		brightWhite: theme.colors.textMain,
	};
}

export const XtermTerminal = memo(function XtermTerminal({
	sessionId,
	tabId,
	theme,
	fontFamily,
}: XtermTerminalProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const termRef = useRef<Terminal | null>(null);
	const fitAddonRef = useRef<FitAddon | null>(null);
	const ptySessionId = `${sessionId}-ai-${tabId}`;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const term = new Terminal({
			cursorBlink: true,
			cursorStyle: 'bar',
			fontSize: 13,
			lineHeight: 1.4,
			fontFamily: fontFamily || 'Menlo, Monaco, "Courier New", monospace',
			theme: themeToXterm(theme),
			allowProposedApi: true,
			scrollback: 10000,
			convertEol: false,
		});

		const fitAddon = new FitAddon();
		const webLinksAddon = new WebLinksAddon();

		term.loadAddon(fitAddon);
		term.loadAddon(webLinksAddon);
		term.open(container);

		termRef.current = term;
		fitAddonRef.current = fitAddon;

		// Initial fit after DOM paint
		requestAnimationFrame(() => {
			try {
				fitAddon.fit();
				window.maestro.process
					.resize(ptySessionId, term.cols, term.rows)
					.catch(() => {});
			} catch {
				// ignore
			}
		});

		// Forward user keystrokes to the PTY
		const inputDisposable = term.onData((data) => {
			window.maestro.process.write(ptySessionId, data).catch(() => {});
		});

		// Listen for PTY output and write to xterm
		const unsubscribeData = window.maestro.process.onData(
			(sid: string, data: string) => {
				if (sid === ptySessionId) {
					term.write(data);
				}
			}
		);

		// Auto-resize on container size changes
		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				try {
					fitAddon.fit();
					window.maestro.process
						.resize(ptySessionId, term.cols, term.rows)
						.catch(() => {});
				} catch {
					// ignore
				}
			});
		});
		resizeObserver.observe(container);

		return () => {
			inputDisposable.dispose();
			unsubscribeData();
			resizeObserver.disconnect();
			term.dispose();
			termRef.current = null;
			fitAddonRef.current = null;
		};
	}, [ptySessionId, fontFamily]); // eslint-disable-line react-hooks/exhaustive-deps

	// Update theme without re-creating terminal
	useEffect(() => {
		if (termRef.current) {
			termRef.current.options.theme = themeToXterm(theme);
		}
	}, [theme]);

	return (
		<div
			ref={containerRef}
			className="flex-1 w-full h-full"
			style={{
				backgroundColor: theme.colors.bgActivity,
				padding: '4px 0 0 4px',
			}}
		/>
	);
});
