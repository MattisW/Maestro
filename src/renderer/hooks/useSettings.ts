import { useState, useEffect } from 'react';
import type { LLMProvider, ThemeId, Shortcut } from '../types';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';

export interface UseSettingsReturn {
  // LLM settings
  llmProvider: LLMProvider;
  modelSlug: string;
  apiKey: string;
  setLlmProvider: (value: LLMProvider) => void;
  setModelSlug: (value: string) => void;
  setApiKey: (value: string) => void;

  // Tunnel settings
  tunnelProvider: string;
  tunnelApiKey: string;
  setTunnelProvider: (value: string) => void;
  setTunnelApiKey: (value: string) => void;

  // Agent settings
  defaultAgent: string;
  setDefaultAgent: (value: string) => void;

  // Shell settings
  defaultShell: string;
  setDefaultShell: (value: string) => void;

  // Font settings
  fontFamily: string;
  fontSize: number;
  customFonts: string[];
  setFontFamily: (value: string) => void;
  setFontSize: (value: number) => void;
  setCustomFonts: (value: string[]) => void;

  // UI settings
  activeThemeId: ThemeId;
  setActiveThemeId: (value: ThemeId) => void;
  enterToSend: boolean;
  setEnterToSend: (value: boolean) => void;
  leftSidebarWidth: number;
  rightPanelWidth: number;
  markdownRawMode: boolean;
  setLeftSidebarWidth: (value: number) => void;
  setRightPanelWidth: (value: number) => void;
  setMarkdownRawMode: (value: boolean) => void;

  // Logging settings
  logLevel: string;
  setLogLevel: (value: string) => void;

  // Output settings
  maxOutputLines: number;
  setMaxOutputLines: (value: number) => void;

  // Shortcuts
  shortcuts: Record<string, Shortcut>;
  setShortcuts: (value: Record<string, Shortcut>) => void;
}

export function useSettings(): UseSettingsReturn {
  // LLM Config
  const [llmProvider, setLlmProviderState] = useState<LLMProvider>('openrouter');
  const [modelSlug, setModelSlugState] = useState('anthropic/claude-3.5-sonnet');
  const [apiKey, setApiKeyState] = useState('');

  // Tunnel Config
  const [tunnelProvider, setTunnelProviderState] = useState('ngrok');
  const [tunnelApiKey, setTunnelApiKeyState] = useState('');

  // Agent Config
  const [defaultAgent, setDefaultAgentState] = useState('claude-code');

  // Shell Config
  const [defaultShell, setDefaultShellState] = useState('zsh');

  // Font Config
  const [fontFamily, setFontFamilyState] = useState('Roboto Mono, Menlo, "Courier New", monospace');
  const [fontSize, setFontSizeState] = useState(14);
  const [customFonts, setCustomFontsState] = useState<string[]>([]);

  // UI Config
  const [activeThemeId, setActiveThemeIdState] = useState<ThemeId>('dracula');
  const [enterToSend, setEnterToSendState] = useState(true);
  const [leftSidebarWidth, setLeftSidebarWidthState] = useState(256);
  const [rightPanelWidth, setRightPanelWidthState] = useState(384);
  const [markdownRawMode, setMarkdownRawModeState] = useState(false);

  // Logging Config
  const [logLevel, setLogLevelState] = useState('info');

  // Output Config
  const [maxOutputLines, setMaxOutputLinesState] = useState(25);

  // Shortcuts
  const [shortcuts, setShortcutsState] = useState<Record<string, Shortcut>>(DEFAULT_SHORTCUTS);

  // Wrapper functions that persist to electron-store
  const setLlmProvider = (value: LLMProvider) => {
    setLlmProviderState(value);
    window.maestro.settings.set('llmProvider', value);
  };

  const setModelSlug = (value: string) => {
    setModelSlugState(value);
    window.maestro.settings.set('modelSlug', value);
  };

  const setApiKey = (value: string) => {
    setApiKeyState(value);
    window.maestro.settings.set('apiKey', value);
  };

  const setTunnelProvider = (value: string) => {
    setTunnelProviderState(value);
    window.maestro.settings.set('tunnelProvider', value);
  };

  const setTunnelApiKey = (value: string) => {
    setTunnelApiKeyState(value);
    window.maestro.settings.set('tunnelApiKey', value);
  };

  const setDefaultAgent = (value: string) => {
    setDefaultAgentState(value);
    window.maestro.settings.set('defaultAgent', value);
  };

  const setDefaultShell = (value: string) => {
    setDefaultShellState(value);
    window.maestro.settings.set('defaultShell', value);
  };

  const setFontFamily = (value: string) => {
    setFontFamilyState(value);
    window.maestro.settings.set('fontFamily', value);
  };

  const setFontSize = (value: number) => {
    setFontSizeState(value);
    window.maestro.settings.set('fontSize', value);
  };

  const setCustomFonts = (value: string[]) => {
    setCustomFontsState(value);
    window.maestro.settings.set('customFonts', value);
  };

  const setActiveThemeId = (value: ThemeId) => {
    setActiveThemeIdState(value);
    window.maestro.settings.set('activeThemeId', value);
  };

  const setEnterToSend = (value: boolean) => {
    setEnterToSendState(value);
    window.maestro.settings.set('enterToSend', value);
  };

  const setLeftSidebarWidth = (width: number) => {
    setLeftSidebarWidthState(width);
    window.maestro.settings.set('leftSidebarWidth', width);
  };

  const setRightPanelWidth = (width: number) => {
    setRightPanelWidthState(width);
    window.maestro.settings.set('rightPanelWidth', width);
  };

  const setMarkdownRawMode = (value: boolean) => {
    setMarkdownRawModeState(value);
    window.maestro.settings.set('markdownRawMode', value);
  };

  const setShortcuts = (value: Record<string, Shortcut>) => {
    setShortcutsState(value);
    window.maestro.settings.set('shortcuts', value);
  };

  const setLogLevel = async (value: string) => {
    setLogLevelState(value);
    await window.maestro.logger.setLogLevel(value);
  };

  const setMaxOutputLines = (value: number) => {
    setMaxOutputLinesState(value);
    window.maestro.settings.set('maxOutputLines', value);
  };

  // Load settings from electron-store on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedEnterToSend = await window.maestro.settings.get('enterToSend');
      const savedLlmProvider = await window.maestro.settings.get('llmProvider');
      const savedModelSlug = await window.maestro.settings.get('modelSlug');
      const savedApiKey = await window.maestro.settings.get('apiKey');
      const savedTunnelProvider = await window.maestro.settings.get('tunnelProvider');
      const savedTunnelApiKey = await window.maestro.settings.get('tunnelApiKey');
      const savedDefaultAgent = await window.maestro.settings.get('defaultAgent');
      const savedDefaultShell = await window.maestro.settings.get('defaultShell');
      const savedFontSize = await window.maestro.settings.get('fontSize');
      const savedFontFamily = await window.maestro.settings.get('fontFamily');
      const savedCustomFonts = await window.maestro.settings.get('customFonts');
      const savedLeftSidebarWidth = await window.maestro.settings.get('leftSidebarWidth');
      const savedRightPanelWidth = await window.maestro.settings.get('rightPanelWidth');
      const savedMarkdownRawMode = await window.maestro.settings.get('markdownRawMode');
      const savedShortcuts = await window.maestro.settings.get('shortcuts');
      const savedActiveThemeId = await window.maestro.settings.get('activeThemeId');
      const savedLogLevel = await window.maestro.logger.getLogLevel();
      const savedMaxOutputLines = await window.maestro.settings.get('maxOutputLines');

      if (savedEnterToSend !== undefined) setEnterToSendState(savedEnterToSend);
      if (savedLlmProvider !== undefined) setLlmProviderState(savedLlmProvider);
      if (savedModelSlug !== undefined) setModelSlugState(savedModelSlug);
      if (savedApiKey !== undefined) setApiKeyState(savedApiKey);
      if (savedTunnelProvider !== undefined) setTunnelProviderState(savedTunnelProvider);
      if (savedTunnelApiKey !== undefined) setTunnelApiKeyState(savedTunnelApiKey);
      if (savedDefaultAgent !== undefined) setDefaultAgentState(savedDefaultAgent);
      if (savedDefaultShell !== undefined) setDefaultShellState(savedDefaultShell);
      if (savedFontSize !== undefined) setFontSizeState(savedFontSize);
      if (savedFontFamily !== undefined) setFontFamilyState(savedFontFamily);
      if (savedCustomFonts !== undefined) setCustomFontsState(savedCustomFonts);
      if (savedLeftSidebarWidth !== undefined) setLeftSidebarWidthState(savedLeftSidebarWidth);
      if (savedRightPanelWidth !== undefined) setRightPanelWidthState(savedRightPanelWidth);
      if (savedMarkdownRawMode !== undefined) setMarkdownRawModeState(savedMarkdownRawMode);
      if (savedActiveThemeId !== undefined) setActiveThemeIdState(savedActiveThemeId);
      if (savedLogLevel !== undefined) setLogLevelState(savedLogLevel);
      if (savedMaxOutputLines !== undefined) setMaxOutputLinesState(savedMaxOutputLines);

      // Merge saved shortcuts with defaults (in case new shortcuts were added)
      if (savedShortcuts !== undefined) {
        setShortcutsState({ ...DEFAULT_SHORTCUTS, ...savedShortcuts });
      }
    };
    loadSettings();
  }, []);

  // Apply font size to HTML root element so rem-based Tailwind classes scale
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  return {
    llmProvider,
    modelSlug,
    apiKey,
    setLlmProvider,
    setModelSlug,
    setApiKey,
    tunnelProvider,
    tunnelApiKey,
    setTunnelProvider,
    setTunnelApiKey,
    defaultAgent,
    setDefaultAgent,
    defaultShell,
    setDefaultShell,
    fontFamily,
    fontSize,
    customFonts,
    setFontFamily,
    setFontSize,
    setCustomFonts,
    activeThemeId,
    setActiveThemeId,
    enterToSend,
    setEnterToSend,
    leftSidebarWidth,
    rightPanelWidth,
    markdownRawMode,
    setLeftSidebarWidth,
    setRightPanelWidth,
    setMarkdownRawMode,
    logLevel,
    setLogLevel,
    maxOutputLines,
    setMaxOutputLines,
    shortcuts,
    setShortcuts,
  };
}
