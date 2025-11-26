import React, { useEffect, useRef } from 'react';
import { X, Bot, User, ExternalLink } from 'lucide-react';
import type { Theme, HistoryEntry } from '../types';
import { useLayerStack } from '../contexts/LayerStackContext';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';

interface HistoryDetailModalProps {
  theme: Theme;
  entry: HistoryEntry;
  onClose: () => void;
  onJumpToClaudeSession?: (claudeSessionId: string) => void;
}

export function HistoryDetailModal({
  theme,
  entry,
  onClose,
  onJumpToClaudeSession
}: HistoryDetailModalProps) {
  const { registerLayer, unregisterLayer, updateLayerHandler } = useLayerStack();
  const layerIdRef = useRef<string>();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Register layer on mount
  useEffect(() => {
    const id = registerLayer({
      type: 'modal',
      priority: MODAL_PRIORITIES.CONFIRM, // Use same priority as confirm modal
      onEscape: () => {
        onCloseRef.current();
      }
    });
    layerIdRef.current = id;

    return () => {
      if (layerIdRef.current) {
        unregisterLayer(layerIdRef.current);
      }
    };
  }, [registerLayer, unregisterLayer]);

  // Keep escape handler up to date
  useEffect(() => {
    if (layerIdRef.current) {
      updateLayerHandler(layerIdRef.current, () => {
        onCloseRef.current();
      });
    }
  }, [onClose, updateLayerHandler]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get pill color based on type
  const getPillColor = () => {
    if (entry.type === 'AUTO') {
      return { bg: theme.colors.warning + '20', text: theme.colors.warning, border: theme.colors.warning + '40' };
    }
    return { bg: theme.colors.accent + '20', text: theme.colors.accent, border: theme.colors.accent + '40' };
  };

  const colors = getPillColor();
  const Icon = entry.type === 'AUTO' ? Bot : User;

  // Clean up the response for display - remove ANSI codes
  const rawResponse = entry.fullResponse || entry.summary || '';
  const cleanResponse = rawResponse.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI codes

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-lg border shadow-2xl flex flex-col"
        style={{
          backgroundColor: theme.colors.bgSidebar,
          borderColor: theme.colors.border
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-3">
            {/* Type Pill */}
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`
              }}
            >
              <Icon className="w-2.5 h-2.5" />
              {entry.type}
            </span>

            {/* Session ID Octet (clickable) */}
            {entry.claudeSessionId && onJumpToClaudeSession && (
              <button
                onClick={() => {
                  onJumpToClaudeSession(entry.claudeSessionId!);
                  onClose();
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase transition-colors hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.accent + '20',
                  color: theme.colors.accent,
                  border: `1px solid ${theme.colors.accent}40`
                }}
                title={`Jump to session ${entry.claudeSessionId}`}
              >
                {entry.claudeSessionId.split('-')[0].toUpperCase()}
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}

            {/* Timestamp */}
            <span className="text-xs" style={{ color: theme.colors.textDim }}>
              {formatTime(entry.timestamp)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: theme.colors.textDim }} />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5"
          style={{ color: theme.colors.textMain }}
        >
          <pre
            className="whitespace-pre-wrap font-mono text-sm leading-relaxed"
            style={{ color: theme.colors.textMain }}
          >
            {cleanResponse}
          </pre>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end px-6 py-4 border-t shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium transition-colors hover:opacity-90"
            style={{
              backgroundColor: theme.colors.accent,
              color: 'white'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
