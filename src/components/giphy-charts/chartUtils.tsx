'use client';

import React from 'react';
import html2canvas from 'html2canvas';
import { ChannelDisplayData } from '@/lib/types';

// Types
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime';
export type ScaleType = 'linear' | 'sqrt' | 'log';

export interface ChartProps {
  channels: ChannelDisplayData[];
  scaleType?: ScaleType;
  timePeriod?: TimePeriod;
  count?: number;
}

// Format number with K/M/B suffix
export function formatNumber(num: number): string {
  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Generate nice round tick values for Y-axis
export function generateNiceTicks(maxValue: number, count: number = 5): number[] {
  if (maxValue <= 0) return [0];

  // Nice intervals to use
  const niceNumbers = [1, 2, 5, 10, 20, 50, 100, 200, 500];

  // Find the order of magnitude
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const normalized = maxValue / magnitude;

  // Find the best nice number that gives us good tick spacing
  let interval = magnitude;
  for (const nice of niceNumbers) {
    if (normalized <= nice) {
      interval = nice * magnitude / 10;
      break;
    }
  }

  // Generate ticks
  const ticks: number[] = [0];
  let tick = interval;
  while (tick <= maxValue * 1.1) {
    ticks.push(tick);
    tick += interval;
  }

  // Limit to reasonable number of ticks
  if (ticks.length > count + 1) {
    const step = Math.ceil(ticks.length / count);
    return ticks.filter((_, i) => i % step === 0 || i === ticks.length - 1);
  }

  return ticks;
}

// Get title based on time period
export function getChartTitle(timePeriod: TimePeriod, type: 'views' | 'growth'): string {
  if (type === 'views') {
    switch (timePeriod) {
      case 'daily':
        return 'GIPHY Views (24h Change)';
      case 'weekly':
        return 'GIPHY Views (7d Change)';
      default:
        return 'All Time GIPHY Views';
    }
  } else {
    const periodLabels: Record<TimePeriod, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
      alltime: 'All Time',
    };
    return `${periodLabels[timePeriod]} GIPHY Growth`;
  }
}

// Bold, high-contrast colors for dark background
export const BAR_COLORS = [
  '#00D4FF', // cyan
  '#FF3366', // pink/red
  '#00FF88', // green
  '#FFD700', // gold
  '#FF6B35', // orange
  '#A855F7', // purple
  '#00BFFF', // sky blue
  '#FF1493', // deep pink
  '#32CD32', // lime
  '#FF4500', // red-orange
  '#1E90FF', // dodger blue
  '#FFB347', // pastel orange
  '#00CED1', // dark turquoise
  '#FF69B4', // hot pink
  '#7CFC00', // lawn green
];

// Copy chart to clipboard as PNG
export async function copyChartToClipboard(chartRef: React.RefObject<HTMLDivElement | null>): Promise<boolean> {
  if (!chartRef.current) return false;

  try {
    // Pre-load all images as base64 to avoid CORS issues
    const images = chartRef.current.querySelectorAll('image');
    await Promise.all(
      Array.from(images).map(async (img) => {
        const href = img.getAttribute('href');
        if (href && href.startsWith('http')) {
          try {
            const response = await fetch(href);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            img.setAttribute('href', base64);
          } catch {
            // If fetch fails, just skip this image
          }
        }
      })
    );

    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: '#0a0f1a',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        resolve(true);
      }, 'image/png');
    });
  } catch (error) {
    console.error('Failed to copy chart:', error);
    return false;
  }
}

// Custom tooltip component with React.memo for optimization
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

export const CustomTooltip = React.memo(function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    const displayValue = data?.views ?? data?.delta ?? data?.followers ?? data?.likes ?? data?.subscribers ?? 0;
    const rank = data?.rank;
    const isPositive = displayValue >= 0;
    const metricLabel = data?.views !== undefined ? 'views' :
                       data?.followers !== undefined ? 'followers' :
                       data?.likes !== undefined ? 'likes' :
                       data?.subscribers !== undefined ? 'subscribers' : 'views';

    return (
      <div
        className="chart-tooltip"
        style={{
          background: 'rgba(10, 15, 25, 0.98)',
          border: '1px solid rgba(46, 219, 132, 0.2)',
          borderRadius: '10px',
          padding: '12px 16px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(46, 219, 132, 0.2)',
          minWidth: '160px',
          animation: 'tooltipFadeIn 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          {data?.logoUrl && (
            <img
              src={data.logoUrl}
              alt=""
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.1)'
              }}
            />
          )}
          <div>
            <p style={{ color: '#fff', fontWeight: 600, margin: 0, fontSize: '14px' }}>
              {data?.fullName}
            </p>
            {rank && (
              <p style={{ color: '#666', fontSize: '11px', margin: '2px 0 0 0' }}>
                <span style={{
                  background: 'rgba(46, 219, 132, 0.15)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: '#2edb84',
                  fontWeight: 600
                }}>
                  #{rank}
                </span>
              </p>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          <p style={{
            color: isPositive ? '#2edb84' : '#ef4444',
            fontFamily: 'JetBrains Mono, monospace',
            margin: 0,
            fontSize: '18px',
            fontWeight: 700
          }}>
            {data?.delta !== undefined && isPositive ? '+' : ''}{displayValue.toLocaleString()}
          </p>
          <span style={{ color: '#555', fontSize: '11px' }}>{metricLabel}</span>
        </div>
      </div>
    );
  }
  return null;
});

// Custom tick component to show logos with click support - wrapped with React.memo
interface CustomXAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
  visibleTicksCount?: number;
}

export const CustomXAxisTick = React.memo(function CustomXAxisTick({ x = 0, y = 0, payload, index = 0, visibleTicksCount }: CustomXAxisTickProps) {
  const data = payload?.value;
  const parts = data?.split('|||') || [];
  const fullName = parts[0] || '';
  const localLogoUrl = parts[1] || '';
  const channelUrl = parts[2] || '';
  const fallbackLogo = parts[3] || '';
  const rank = index + 1;

  // Use state to track if local image failed
  const [imgError, setImgError] = React.useState(false);
  const logoUrl = imgError ? fallbackLogo : localLogoUrl;

  // Responsive sizing based on number of items and screen width
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const itemCount = visibleTicksCount || 15;

  // Scale down logo size on mobile or when many items
  let logoSize = 36;
  let containerSize = 40;
  let fontSize = 9;
  let nameMaxLen = 10;

  if (isMobile) {
    if (itemCount > 10) {
      logoSize = 20;
      containerSize = 24;
      fontSize = 6;
      nameMaxLen = 6;
    } else {
      logoSize = 28;
      containerSize = 32;
      fontSize = 7;
      nameMaxLen = 8;
    }
  } else if (itemCount > 12) {
    logoSize = 30;
    containerSize = 34;
    fontSize = 8;
  }

  const handleClick = () => {
    if (channelUrl) {
      window.open(channelUrl, '_blank');
    }
  };

  // Smarter name splitting
  const splitName = (name: string, maxLen: number = nameMaxLen): string[] => {
    if (name.length <= maxLen) return [name];
    const words = name.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLen) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.length > maxLen ? word.substring(0, maxLen - 1) + '.' : word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, isMobile ? 1 : 2);
  };

  const nameLines = splitName(fullName);
  const halfContainer = containerSize / 2;
  const logoOffset = (containerSize - logoSize) / 2;

  return (
    <g transform={`translate(${x},${y})`} onClick={handleClick} style={{ cursor: channelUrl ? 'pointer' : 'default' }}>
      {/* Rank badge - hide on mobile with many items */}
      {!(isMobile && itemCount > 10) && (
        <text
          x={0}
          y={8}
          textAnchor="middle"
          fill="#444"
          fontSize={fontSize}
          fontWeight={600}
          fontFamily="JetBrains Mono, monospace"
        >
          #{rank}
        </text>
      )}
      {(logoUrl || fallbackLogo) && (
        <>
          <rect
            x={-halfContainer}
            y={isMobile && itemCount > 10 ? 4 : 14}
            width={containerSize}
            height={containerSize}
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
            rx={4}
          />
          <foreignObject
            x={-halfContainer + logoOffset}
            y={(isMobile && itemCount > 10 ? 4 : 14) + logoOffset}
            width={logoSize}
            height={logoSize}
          >
            <img
              src={logoUrl || fallbackLogo}
              alt=""
              style={{
                width: logoSize,
                height: logoSize,
                objectFit: 'cover',
                borderRadius: 4,
              }}
              onError={(e) => {
                if (!imgError && fallbackLogo) {
                  setImgError(true);
                }
              }}
            />
          </foreignObject>
        </>
      )}
      {nameLines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={logoUrl ? (isMobile && itemCount > 10 ? 4 : 14) + containerSize + 12 + (i * (fontSize + 2)) : 24 + (i * 12)}
          textAnchor="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize={fontSize}
          fontWeight={500}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {line}
        </text>
      ))}
    </g>
  );
});
