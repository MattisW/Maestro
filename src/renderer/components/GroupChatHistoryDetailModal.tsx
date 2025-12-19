/**
 * GroupChatHistoryDetailModal.tsx
 *
 * Modal for viewing full details of a group chat history entry.
 * Supports navigation between entries and deletion.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Copy, Clock, Coins, Hash } from 'lucide-react';
import type { Theme } from '../types';
import type { GroupChatHistoryEntry, GroupChatHistoryEntryType } from '../../shared/group-chat-types';
import { useLayerStack } from '../contexts/LayerStackContext';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';

interface GroupChatHistoryDetailModalProps {
  theme: Theme;
  entry: GroupChatHistoryEntry;
  entries: GroupChatHistoryEntry[];
  currentIndex: number;
  participantColors: Record<string, string>;
  onClose: () => void;
  onDelete: (entryId: string) => Promise<boolean>;
  onNavigate: (entry: GroupChatHistoryEntry) => void;
}

export function GroupChatHistoryDetailModal({
  theme,
  entry,
  entries,
  currentIndex,
  participantColors,
  onClose,
  onDelete,
  onNavigate,
}: GroupChatHistoryDetailModalProps): JSX.Element {
  const { registerLayer, unregisterLayer } = useLayerStack();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Register with layer stack
  useEffect(() => {
    const id = registerLayer({
      type: 'modal',
      priority: MODAL_PRIORITIES.HISTORY_DETAIL || 70,
      onEscape: () => onCloseRef.current(),
    });
    return () => unregisterLayer(id);
  }, [registerLayer, unregisterLayer]);

  // Navigation helpers
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < entries.length - 1;

  const navigatePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(entries[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, entries, onNavigate]);

  const navigateNext = useCallback(() => {
    if (hasNext) {
      onNavigate(entries[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, entries, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        navigateNext();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, navigatePrev, navigateNext]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format elapsed time
  const formatElapsedTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Get type label and color
  const getTypeStyle = (type: GroupChatHistoryEntryType) => {
    switch (type) {
      case 'response':
        return { label: 'Response', color: theme.colors.success };
      case 'delegation':
        return { label: 'Delegated', color: theme.colors.warning };
      case 'synthesis':
        return { label: 'Synthesis', color: theme.colors.accent };
      case 'error':
        return { label: 'Error', color: theme.colors.error };
      default:
        return { label: type, color: theme.colors.textDim };
    }
  };

  const typeStyle = getTypeStyle(entry.type);

  // Copy full response to clipboard
  const handleCopy = useCallback(async () => {
    const textToCopy = entry.fullResponse || entry.summary;
    await navigator.clipboard.writeText(textToCopy);
  }, [entry]);

  // Handle delete with confirmation
  const handleDelete = useCallback(async () => {
    if (confirm('Delete this history entry?')) {
      await onDelete(entry.id);
    }
  }, [entry.id, onDelete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative rounded-lg border shadow-xl flex flex-col max-h-[80vh] w-[600px] max-w-[90vw]"
        style={{
          backgroundColor: theme.colors.bgMain,
          borderColor: theme.colors.border,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-3">
            {/* Participant Color Dot */}
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: entry.participantColor || participantColors[entry.participantName] || theme.colors.textDim,
              }}
            />
            {/* Participant Name */}
            <span
              className="font-medium"
              style={{ color: entry.participantColor || participantColors[entry.participantName] || theme.colors.textMain }}
            >
              {entry.participantName}
            </span>
            {/* Type Pill */}
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{
                backgroundColor: typeStyle.color + '20',
                color: typeStyle.color,
                border: `1px solid ${typeStyle.color}40`,
              }}
            >
              {typeStyle.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation */}
            <button
              onClick={navigatePrev}
              disabled={!hasPrev}
              className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous entry (←)"
            >
              <ChevronLeft className="w-4 h-4" style={{ color: theme.colors.textDim }} />
            </button>
            <span className="text-xs font-mono" style={{ color: theme.colors.textDim }}>
              {currentIndex + 1} / {entries.length}
            </span>
            <button
              onClick={navigateNext}
              disabled={!hasNext}
              className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next entry (→)"
            >
              <ChevronRight className="w-4 h-4" style={{ color: theme.colors.textDim }} />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-white/10 transition-colors ml-2"
              title="Close (Escape)"
            >
              <X className="w-4 h-4" style={{ color: theme.colors.textDim }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Timestamp */}
          <div className="text-xs mb-4" style={{ color: theme.colors.textDim }}>
            {formatTime(entry.timestamp)}
          </div>

          {/* Summary */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase mb-1" style={{ color: theme.colors.textDim }}>
              Summary
            </div>
            <p className="text-sm" style={{ color: theme.colors.textMain }}>
              {entry.summary}
            </p>
          </div>

          {/* Full Response (if different from summary) */}
          {entry.fullResponse && entry.fullResponse !== entry.summary && (
            <div className="mb-4">
              <div className="text-xs font-bold uppercase mb-1" style={{ color: theme.colors.textDim }}>
                Full Response
              </div>
              <pre
                className="text-xs p-3 rounded border overflow-x-auto whitespace-pre-wrap font-mono"
                style={{
                  backgroundColor: theme.colors.bgSidebar,
                  borderColor: theme.colors.border,
                  color: theme.colors.textMain,
                }}
              >
                {entry.fullResponse}
              </pre>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: theme.colors.textDim }}>
            {/* Elapsed Time */}
            {entry.elapsedTimeMs !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatElapsedTime(entry.elapsedTimeMs)}</span>
              </div>
            )}

            {/* Token Count */}
            {entry.tokenCount !== undefined && (
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>{entry.tokenCount.toLocaleString()} tokens</span>
              </div>
            )}

            {/* Cost */}
            {entry.cost !== undefined && entry.cost > 0 && (
              <div className="flex items-center gap-1">
                <Coins className="w-3 h-3" />
                <span
                  className="font-bold"
                  style={{ color: theme.colors.success }}
                >
                  ${entry.cost.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-between p-4 border-t shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-2">
            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium hover:bg-white/10 transition-colors"
              style={{ color: theme.colors.textDim }}
              title="Copy response to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium hover:bg-white/10 transition-colors"
              style={{ color: theme.colors.error }}
              title="Delete this entry"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>

          {/* Entry ID */}
          <span className="text-[10px] font-mono" style={{ color: theme.colors.textDim }}>
            {entry.id.split('-')[0]}
          </span>
        </div>
      </div>
    </div>
  );
}
