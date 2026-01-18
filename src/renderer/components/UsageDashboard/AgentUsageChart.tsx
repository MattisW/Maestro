/**
 * AgentUsageChart
 *
 * Line chart showing agent usage over time with dual metrics.
 * Displays both session count and total time on the same chart.
 *
 * Features:
 * - Dual Y-axes: sessions (left) and time (right)
 * - Color-coded lines for each metric
 * - Hover tooltips with exact values
 * - Responsive SVG rendering
 * - Theme-aware styling
 */

import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import type { Theme } from '../../types';
import type { StatsTimeRange, StatsAggregation } from '../../hooks/useStats';
import { COLORBLIND_LINE_COLORS } from '../../constants/colorblindPalettes';

// Data point for the chart
interface DataPoint {
  date: string;
  formattedDate: string;
  sessions: number;
  duration: number; // Total duration in ms
}

interface AgentUsageChartProps {
  /** Aggregated stats data from the API */
  data: StatsAggregation;
  /** Current time range selection */
  timeRange: StatsTimeRange;
  /** Current theme for styling */
  theme: Theme;
  /** Enable colorblind-friendly colors */
  colorBlindMode?: boolean;
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms === 0) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format duration for Y-axis labels (shorter format)
 */
function formatYAxisDuration(ms: number): string {
  if (ms === 0) return '0';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60);

  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${totalSeconds}s`;
}

/**
 * Format date for X-axis based on time range
 */
function formatXAxisDate(dateStr: string, timeRange: StatsTimeRange): string {
  const date = parseISO(dateStr);

  switch (timeRange) {
    case 'day':
      return format(date, 'HH:mm');
    case 'week':
      return format(date, 'EEE');
    case 'month':
      return format(date, 'MMM d');
    case 'year':
      return format(date, 'MMM');
    case 'all':
      return format(date, 'MMM yyyy');
    default:
      return format(date, 'MMM d');
  }
}

export function AgentUsageChart({ data, timeRange, theme, colorBlindMode = false }: AgentUsageChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ point: DataPoint; index: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Chart dimensions
  const chartWidth = 600;
  const chartHeight = 220;
  const padding = { top: 20, right: 60, bottom: 40, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Colors for the two metrics
  const sessionColor = useMemo(() => {
    return colorBlindMode ? COLORBLIND_LINE_COLORS.primary : theme.colors.accent;
  }, [colorBlindMode, theme.colors.accent]);

  const durationColor = useMemo(() => {
    return colorBlindMode ? COLORBLIND_LINE_COLORS.secondary : '#10b981'; // emerald
  }, [colorBlindMode]);

  // Combine byDay data with sessionsByDay to get both metrics per day
  const chartData = useMemo((): DataPoint[] => {
    if (data.byDay.length === 0) return [];

    // Create a map of sessions by date
    const sessionsByDateMap = new Map<string, number>();
    for (const day of data.sessionsByDay || []) {
      sessionsByDateMap.set(day.date, day.count);
    }

    return data.byDay.map((day) => ({
      date: day.date,
      formattedDate: format(parseISO(day.date), 'EEEE, MMM d, yyyy'),
      sessions: sessionsByDateMap.get(day.date) || 0,
      duration: day.duration,
    }));
  }, [data.byDay, data.sessionsByDay]);

  // Calculate scales for both Y-axes
  const { xScale, yScaleSessions, yScaleDuration, yTicksSessions, yTicksDuration } = useMemo(() => {
    if (chartData.length === 0) {
      return {
        xScale: (_: number) => padding.left,
        yScaleSessions: (_: number) => chartHeight - padding.bottom,
        yScaleDuration: (_: number) => chartHeight - padding.bottom,
        yTicksSessions: [0],
        yTicksDuration: [0],
      };
    }

    const maxSessions = Math.max(...chartData.map((d) => d.sessions), 1);
    const maxDuration = Math.max(...chartData.map((d) => d.duration), 1);

    // Add 10% padding to max values
    const sessionMax = Math.ceil(maxSessions * 1.1);
    const durationMax = maxDuration * 1.1;

    // X scale - linear across data points
    const xScaleFn = (index: number) =>
      padding.left + (index / Math.max(chartData.length - 1, 1)) * innerWidth;

    // Y scale for sessions (left axis) - inverted for SVG coordinates
    const yScaleSessionsFn = (value: number) =>
      chartHeight - padding.bottom - (value / sessionMax) * innerHeight;

    // Y scale for duration (right axis)
    const yScaleDurationFn = (value: number) =>
      chartHeight - padding.bottom - (value / durationMax) * innerHeight;

    // Generate nice Y-axis ticks
    const tickCount = 5;
    const yTicksSessionsArr = Array.from({ length: tickCount }, (_, i) =>
      Math.round((sessionMax / (tickCount - 1)) * i)
    );
    const yTicksDurationArr = Array.from({ length: tickCount }, (_, i) =>
      (durationMax / (tickCount - 1)) * i
    );

    return {
      xScale: xScaleFn,
      yScaleSessions: yScaleSessionsFn,
      yScaleDuration: yScaleDurationFn,
      yTicksSessions: yTicksSessionsArr,
      yTicksDuration: yTicksDurationArr,
    };
  }, [chartData, chartHeight, innerWidth, innerHeight, padding]);

  // Generate line paths for both metrics
  const sessionsPath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData
      .map((point, idx) => {
        const x = xScale(idx);
        const y = yScaleSessions(point.sessions);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [chartData, xScale, yScaleSessions]);

  const durationPath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData
      .map((point, idx) => {
        const x = xScale(idx);
        const y = yScaleDuration(point.duration);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [chartData, xScale, yScaleDuration]);

  // Handle mouse events for tooltip
  const handleMouseEnter = useCallback(
    (point: DataPoint, index: number, event: React.MouseEvent<SVGCircleElement>) => {
      setHoveredPoint({ point, index });
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setTooltipPos(null);
  }, []);

  // Generate unique IDs for gradients
  const gradientIdSessions = useMemo(() => `sessions-gradient-${Math.random().toString(36).slice(2, 9)}`, []);
  const gradientIdDuration = useMemo(() => `duration-gradient-${Math.random().toString(36).slice(2, 9)}`, []);

  // Parse colors for gradients
  const sessionRgb = useMemo(() => {
    const color = sessionColor;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return { r: 100, g: 149, b: 237 };
  }, [sessionColor]);

  const durationRgb = useMemo(() => {
    const color = durationColor;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return { r: 16, g: 185, b: 129 };
  }, [durationColor]);

  // Area paths for gradient fills
  const sessionsAreaPath = useMemo(() => {
    if (chartData.length === 0) return '';
    const pathStart = chartData
      .map((point, idx) => {
        const x = xScale(idx);
        const y = yScaleSessions(point.sessions);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
    const lastX = xScale(chartData.length - 1);
    const firstX = xScale(0);
    const baseline = chartHeight - padding.bottom;
    return `${pathStart} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
  }, [chartData, xScale, yScaleSessions, chartHeight, padding.bottom]);

  return (
    <div
      className="p-4 rounded-lg"
      style={{ backgroundColor: theme.colors.bgMain }}
      role="figure"
      aria-label={`Agent usage chart showing sessions and time over time. ${chartData.length} data points displayed.`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-medium"
          style={{ color: theme.colors.textMain }}
        >
          Agent Usage Over Time
        </h3>
      </div>

      {/* Chart container */}
      <div className="relative">
        {chartData.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: chartHeight, color: theme.colors.textDim }}
          >
            <span className="text-sm">No usage data available</span>
          </div>
        ) : (
          <svg
            width="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Dual-axis chart showing sessions and time usage over time`}
          >
            {/* Gradient definitions */}
            <defs>
              <linearGradient id={gradientIdSessions} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`rgba(${sessionRgb.r}, ${sessionRgb.g}, ${sessionRgb.b}, 0.2)`} />
                <stop offset="100%" stopColor={`rgba(${sessionRgb.r}, ${sessionRgb.g}, ${sessionRgb.b}, 0)`} />
              </linearGradient>
              <linearGradient id={gradientIdDuration} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`rgba(${durationRgb.r}, ${durationRgb.g}, ${durationRgb.b}, 0.2)`} />
                <stop offset="100%" stopColor={`rgba(${durationRgb.r}, ${durationRgb.g}, ${durationRgb.b}, 0)`} />
              </linearGradient>
            </defs>

            {/* Grid lines (horizontal) */}
            {yTicksSessions.map((tick, idx) => (
              <line
                key={`grid-${idx}`}
                x1={padding.left}
                y1={yScaleSessions(tick)}
                x2={chartWidth - padding.right}
                y2={yScaleSessions(tick)}
                stroke={theme.colors.border}
                strokeOpacity={0.3}
                strokeDasharray="4,4"
              />
            ))}

            {/* Left Y-axis labels (Sessions) */}
            {yTicksSessions.map((tick, idx) => (
              <text
                key={`y-left-${idx}`}
                x={padding.left - 8}
                y={yScaleSessions(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill={sessionColor}
              >
                {tick}
              </text>
            ))}

            {/* Right Y-axis labels (Duration) */}
            {yTicksDuration.map((tick, idx) => (
              <text
                key={`y-right-${idx}`}
                x={chartWidth - padding.right + 8}
                y={yScaleDuration(tick)}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={10}
                fill={durationColor}
              >
                {formatYAxisDuration(tick)}
              </text>
            ))}

            {/* X-axis labels */}
            {chartData.map((point, idx) => {
              const labelInterval = chartData.length > 14
                ? Math.ceil(chartData.length / 7)
                : chartData.length > 7 ? 2 : 1;

              if (idx % labelInterval !== 0 && idx !== chartData.length - 1) {
                return null;
              }

              return (
                <text
                  key={`x-label-${idx}`}
                  x={xScale(idx)}
                  y={chartHeight - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize={10}
                  fill={theme.colors.textDim}
                >
                  {formatXAxisDate(point.date, timeRange)}
                </text>
              );
            })}

            {/* Sessions area fill */}
            <path
              d={sessionsAreaPath}
              fill={`url(#${gradientIdSessions})`}
              style={{ transition: 'd 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Sessions line */}
            <path
              d={sessionsPath}
              fill="none"
              stroke={sessionColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'd 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Duration line */}
            <path
              d={durationPath}
              fill="none"
              stroke={durationColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6,3"
              style={{ transition: 'd 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Data points for sessions */}
            {chartData.map((point, idx) => {
              const x = xScale(idx);
              const y = yScaleSessions(point.sessions);
              const isHovered = hoveredPoint?.index === idx;

              return (
                <circle
                  key={`session-point-${idx}`}
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? sessionColor : theme.colors.bgMain}
                  stroke={sessionColor}
                  strokeWidth={2}
                  style={{
                    cursor: 'pointer',
                    transition: 'cx 0.5s, cy 0.5s, r 0.15s ease',
                  }}
                  onMouseEnter={(e) => handleMouseEnter(point, idx, e)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}

            {/* Data points for duration */}
            {chartData.map((point, idx) => {
              const x = xScale(idx);
              const y = yScaleDuration(point.duration);
              const isHovered = hoveredPoint?.index === idx;

              return (
                <circle
                  key={`duration-point-${idx}`}
                  cx={x}
                  cy={y}
                  r={isHovered ? 5 : 3}
                  fill={isHovered ? durationColor : theme.colors.bgMain}
                  stroke={durationColor}
                  strokeWidth={2}
                  style={{
                    cursor: 'pointer',
                    transition: 'cx 0.5s, cy 0.5s, r 0.15s ease',
                  }}
                  onMouseEnter={(e) => handleMouseEnter(point, idx, e)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}

            {/* Y-axis labels */}
            <text
              x={12}
              y={chartHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill={sessionColor}
              transform={`rotate(-90, 12, ${chartHeight / 2})`}
            >
              Sessions
            </text>
            <text
              x={chartWidth - 10}
              y={chartHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill={durationColor}
              transform={`rotate(90, ${chartWidth - 10}, ${chartHeight / 2})`}
            >
              Time
            </text>
          </svg>
        )}

        {/* Tooltip */}
        {hoveredPoint && tooltipPos && (
          <div
            className="fixed z-50 px-3 py-2 rounded text-xs whitespace-nowrap pointer-events-none shadow-lg"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 8,
              transform: 'translate(-50%, -100%)',
              backgroundColor: theme.colors.bgActivity,
              color: theme.colors.textMain,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            <div className="font-medium mb-1">{hoveredPoint.point.formattedDate}</div>
            <div style={{ color: theme.colors.textDim }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sessionColor }} />
                Sessions: <span style={{ color: theme.colors.textMain }}>{hoveredPoint.point.sessions}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: durationColor }} />
                Time: <span style={{ color: theme.colors.textMain }}>{formatDuration(hoveredPoint.point.duration)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-6 mt-3 pt-3 border-t"
        style={{ borderColor: theme.colors.border }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: sessionColor }} />
          <span className="text-xs" style={{ color: theme.colors.textDim }}>Sessions</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-0.5 rounded"
            style={{
              backgroundColor: durationColor,
              backgroundImage: `repeating-linear-gradient(90deg, ${durationColor} 0, ${durationColor} 4px, transparent 4px, transparent 6px)`,
            }}
          />
          <span className="text-xs" style={{ color: theme.colors.textDim }}>Time</span>
        </div>
      </div>
    </div>
  );
}

export default AgentUsageChart;
