'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { ChannelDisplayData } from '@/lib/types';
import { calculateViralityScores, ViralityScore } from '@/lib/viralityScore';

// Copy chart to clipboard as PNG
async function copyChartToClipboard(chartRef: React.RefObject<HTMLDivElement | null>): Promise<boolean> {
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

        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          resolve(true);
        } catch {
          // Fallback: download the image if clipboard fails
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'chart.png';
          a.click();
          URL.revokeObjectURL(url);
          resolve(true);
        }
      }, 'image/png');
    });
  } catch (error) {
    console.error('Failed to copy chart:', error);
    return false;
  }
}

// Get title based on time period
function getChartTitle(timePeriod: TimePeriod, type: 'views' | 'growth'): string {
  const periodLabels: Record<TimePeriod, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    alltime: 'All Time',
  };
  const period = periodLabels[timePeriod];
  return type === 'views' ? `${period} GIPHY Views` : `${period} GIPHY Growth`;
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime';
type ScaleType = 'linear' | 'sqrt' | 'log';

interface Props {
  channels: ChannelDisplayData[];
  scaleType?: ScaleType;
  timePeriod?: TimePeriod;
  count?: number;
}

function formatNumber(num: number): string {
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
function generateNiceTicks(maxValue: number, count: number = 5): number[] {
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

// Bold, high-contrast colors for dark background
const BAR_COLORS = [
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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    // Use the original value (views or delta), not the log-transformed value
    const displayValue = data?.views ?? data?.delta ?? data?.followers ?? data?.likes ?? 0;
    const viralityScore = data?.viralityScore as ViralityScore | undefined;
    return (
      <div
        style={{
          background: 'rgba(15, 25, 40, 0.95)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          {data?.logoUrl && (
            <img
              src={data.logoUrl}
              alt=""
              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <p style={{ color: '#e2e8f0', fontWeight: 600, margin: 0 }}>
            {data?.fullName}
          </p>
          {viralityScore && (
            <span
              style={{
                backgroundColor: viralityScore.color,
                color: '#000',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {viralityScore.grade}
            </span>
          )}
        </div>
        <p style={{ color: '#06b6d4', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
          {data?.delta !== undefined && displayValue >= 0 ? '+' : ''}{formatNumber(displayValue)}
        </p>
      </div>
    );
  }
  return null;
};

// Custom tick component to show logos with click support
const CustomXAxisTick = ({ x, y, payload }: any) => {
  const data = payload.value;
  // Parse the encoded data from the tick value
  const parts = data?.split('|||') || [];
  const fullName = parts[0] || '';
  const logoUrl = parts[1] || '';
  const channelUrl = parts[2] || '';

  const handleClick = () => {
    if (channelUrl) {
      window.open(channelUrl, '_blank');
    }
  };

  // Split name into lines (max 12 chars per line)
  const splitName = (name: string, maxLen: number = 12): string[] => {
    if (name.length <= maxLen) return [name];
    const words = name.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLen) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.length > maxLen ? word.substring(0, maxLen - 2) + '..' : word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 2); // Max 2 lines
  };

  const nameLines = splitName(fullName);

  return (
    <g transform={`translate(${x},${y})`} onClick={handleClick} style={{ cursor: channelUrl ? 'pointer' : 'default' }}>
      {logoUrl && (
        <>
          {/* Border/background */}
          <rect
            x={-18}
            y={6}
            width={36}
            height={36}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
            rx={4}
          />
          {/* Square image */}
          <image
            href={logoUrl}
            x={-16}
            y={8}
            width={32}
            height={32}
            preserveAspectRatio="xMidYMid slice"
            clipPath="inset(0 round 2px)"
          />
        </>
      )}
      {nameLines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={logoUrl ? 56 + (i * 13) : 16 + (i * 13)}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export function TotalViewsChart({ channels, scaleType = 'linear', timePeriod = 'alltime', count = 15 }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    setCopyStatus('copying');
    const success = await copyChartToClipboard(chartRef);
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // Calculate virality scores for all channels
  const viralityScores = calculateViralityScores(channels);

  const data = [...channels]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, count)
    .map((ch) => ({
      // Encode full name and logo in the x-axis value for custom tick
      name: `${ch.channelName}|||${ch.logoUrl || ''}|||${ch.channelUrl}`,
      fullName: ch.channelName,
      views: ch.totalViews,
      // Scale transformations
      sqrtViews: Math.sqrt(ch.totalViews),
      logViews: ch.totalViews > 0 ? Math.log10(ch.totalViews) : 0,
      logoUrl: ch.logoUrl,
      channelUrl: ch.channelUrl,
      viralityScore: viralityScores.get(ch.channelUrl),
    }));

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p>No data available</p>
      </div>
    );
  }

  // Calculate scale values
  const maxViews = Math.max(...data.map(d => d.views));
  const maxSqrt = Math.max(...data.map(d => d.sqrtViews));
  const maxLog = Math.ceil(Math.max(...data.map(d => d.logViews)));
  const logTicks = Array.from({ length: maxLog + 1 }, (_, i) => i);

  // Determine which data key and axis config to use
  const getDataKey = () => {
    switch (scaleType) {
      case 'sqrt': return 'sqrtViews';
      case 'log': return 'logViews';
      default: return 'views';
    }
  };

  // Generate nice ticks for the actual values
  const niceTicks = generateNiceTicks(maxViews, 5);
  const sqrtNiceTicks = niceTicks.map(v => Math.sqrt(v));

  const getYAxisConfig = () => {
    switch (scaleType) {
      case 'sqrt':
        return {
          domain: [0, Math.sqrt(niceTicks[niceTicks.length - 1])] as [number, number],
          ticks: sqrtNiceTicks,
          tickFormatter: (value: number) => formatNumber(Math.round(value * value)),
        };
      case 'log':
        return {
          domain: [0, maxLog] as [number, number],
          ticks: logTicks,
          tickFormatter: (value: number) => formatNumber(Math.pow(10, value)),
        };
      default:
        return {
          domain: [0, niceTicks[niceTicks.length - 1]] as [number, number],
          ticks: niceTicks,
          tickFormatter: formatNumber,
        };
    }
  };

  const yAxisConfig = getYAxisConfig();

  // Custom label renderer for values above bars
  const renderLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const originalValue = data[index]?.views || 0;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#fff"
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {formatNumber(originalValue)}
      </text>
    );
  };

  return (
    <div>
      <div ref={chartRef} style={{ backgroundColor: '#000', padding: '24px', borderRadius: '12px' }}>
        <h3 className="chart-title">{getChartTitle(timePeriod, 'views')}</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={data} margin={{ left: 10, right: 10, top: 40, bottom: 80 }}>
            <XAxis
              dataKey="name"
              stroke="transparent"
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick />}
              interval={0}
              height={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey={getDataKey()}
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              onClick={(data) => {
                if (data?.channelUrl) {
                  window.open(data.channelUrl, '_blank');
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <LabelList dataKey={getDataKey()} content={renderLabel} />
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <button
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          className="copy-chart-btn"
        >
          {copyStatus === 'copying' && '📋 Copying...'}
          {copyStatus === 'copied' && '✓ Copied!'}
          {copyStatus === 'error' && '✗ Failed - Downloaded instead'}
          {copyStatus === 'idle' && '📋 Copy Graph'}
        </button>
      </div>
    </div>
  );
}

export function GifCountChart({ channels, scaleType = 'linear', count = 15 }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    setCopyStatus('copying');
    const success = await copyChartToClipboard(chartRef);
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const data = [...channels]
    .filter((ch) => ch.gifCount !== null && ch.gifCount > 0)
    .sort((a, b) => (b.gifCount || 0) - (a.gifCount || 0))
    .slice(0, count)
    .map((ch) => ({
      name: `${ch.channelName}|||${ch.logoUrl || ''}|||${ch.channelUrl}`,
      fullName: ch.channelName,
      gifs: ch.gifCount || 0,
      sqrtGifs: Math.sqrt(ch.gifCount || 0),
      logGifs: ch.gifCount && ch.gifCount > 0 ? Math.log10(ch.gifCount) : 0,
      logoUrl: ch.logoUrl,
      channelUrl: ch.channelUrl,
    }));

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p>No GIF count data available</p>
      </div>
    );
  }

  const getDataKey = () => {
    switch (scaleType) {
      case 'sqrt': return 'sqrtGifs';
      case 'log': return 'logGifs';
      default: return 'gifs';
    }
  };

  const renderLabel = (props: any) => {
    const { x, y, width, index } = props;
    const originalValue = data[index]?.gifs || 0;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#fff"
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {formatNumber(originalValue)}
      </text>
    );
  };

  return (
    <div>
      <div ref={chartRef} style={{ backgroundColor: '#000', padding: '24px', borderRadius: '12px' }}>
        <h3 className="chart-title">GIPHY GIF Count</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={data} margin={{ left: 10, right: 10, top: 40, bottom: 80 }}>
            <XAxis
              dataKey="name"
              stroke="transparent"
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick />}
              interval={0}
              height={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey={getDataKey()}
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              onClick={(data) => {
                if (data?.channelUrl) {
                  window.open(data.channelUrl, '_blank');
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <LabelList dataKey={getDataKey()} content={renderLabel} />
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <button
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          className="copy-chart-btn"
        >
          {copyStatus === 'copying' && '📋 Copying...'}
          {copyStatus === 'copied' && '✓ Copied!'}
          {copyStatus === 'error' && '✗ Failed - Downloaded instead'}
          {copyStatus === 'idle' && '📋 Copy Graph'}
        </button>
      </div>
    </div>
  );
}

export function DailyGrowthChart({ channels, scaleType = 'linear', timePeriod = 'alltime', count = 15 }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    setCopyStatus('copying');
    const success = await copyChartToClipboard(chartRef);
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // Use delta1d for daily, avg7dDelta for weekly, otherwise show message
  const getDeltaValue = (ch: ChannelDisplayData): number | null => {
    switch (timePeriod) {
      case 'daily':
        return ch.delta1d;
      case 'weekly':
        return ch.avg7dDelta ? ch.avg7dDelta * 7 : null; // Approximate weekly from 7d avg
      default:
        return ch.delta1d; // Default to daily for other periods
    }
  };

  const data = [...channels]
    .filter((ch) => getDeltaValue(ch) !== null && getDeltaValue(ch) !== 0)
    .sort((a, b) => Math.abs(getDeltaValue(b) || 0) - Math.abs(getDeltaValue(a) || 0))
    .slice(0, count)
    .map((ch) => {
      const delta = getDeltaValue(ch) || 0;
      return {
        name: `${ch.channelName}|||${ch.logoUrl || ''}|||${ch.channelUrl}`,
        fullName: ch.channelName,
        delta,
        // Scale transformations (handle negative values)
        sqrtDelta: Math.sign(delta) * Math.sqrt(Math.abs(delta)),
        logDelta: delta !== 0 ? Math.sign(delta) * Math.log10(Math.abs(delta) + 1) : 0,
        logoUrl: ch.logoUrl,
        channelUrl: ch.channelUrl,
      };
    });

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p>No growth data available yet</p>
        <p>Run the tracker for at least 2 days</p>
      </div>
    );
  }

  const maxAbsDelta = Math.max(...data.map(d => Math.abs(d.delta)));
  const minDelta = Math.min(...data.map(d => d.delta));
  const maxAbsSqrt = Math.max(...data.map(d => Math.abs(d.sqrtDelta)));
  const maxAbsLog = Math.ceil(Math.max(...data.map(d => Math.abs(d.logDelta)))) || 1;
  const logTicks = Array.from({ length: maxAbsLog * 2 + 1 }, (_, i) => i - maxAbsLog);

  // Determine which data key and axis config to use
  const getDataKey = () => {
    switch (scaleType) {
      case 'sqrt': return 'sqrtDelta';
      case 'log': return 'logDelta';
      default: return 'delta';
    }
  };

  const getYAxisConfig = () => {
    switch (scaleType) {
      case 'sqrt':
        return {
          domain: [-maxAbsSqrt, maxAbsSqrt] as [number, number],
          tickFormatter: (value: number) => {
            const realValue = Math.sign(value) * value * value;
            return (realValue >= 0 ? '+' : '') + formatNumber(realValue);
          },
        };
      case 'log':
        return {
          domain: [-maxAbsLog, maxAbsLog] as [number, number],
          ticks: logTicks.filter(t => t !== 0),
          tickFormatter: (value: number) => {
            const sign = value >= 0 ? '+' : '';
            return sign + formatNumber(Math.sign(value) * Math.pow(10, Math.abs(value)));
          },
        };
      default:
        return {
          domain: [Math.min(0, minDelta), maxAbsDelta] as [number, number],
          tickFormatter: (value: number) => (value >= 0 ? '+' : '') + formatNumber(value),
        };
    }
  };

  const yAxisConfig = getYAxisConfig();

  // Custom label renderer for values above bars
  const renderLabel = (props: any) => {
    const { x, y, width, index } = props;
    const originalValue = data[index]?.delta || 0;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#fff"
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {originalValue >= 0 ? '+' : ''}{formatNumber(originalValue)}
      </text>
    );
  };

  return (
    <div>
      <div ref={chartRef} style={{ backgroundColor: '#000', padding: '24px', borderRadius: '12px' }}>
        <h3 className="chart-title">{getChartTitle(timePeriod, 'growth')}</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={data} margin={{ left: 10, right: 10, top: 40, bottom: 80 }}>
            <XAxis
              dataKey="name"
              stroke="transparent"
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick />}
              interval={0}
              height={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey={getDataKey()}
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              onClick={(data) => {
                if (data?.channelUrl) {
                  window.open(data.channelUrl, '_blank');
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <LabelList dataKey={getDataKey()} content={renderLabel} />
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.delta >= 0 ? '#00FF88' : '#FF3366'}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <button
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          className="copy-chart-btn"
        >
          {copyStatus === 'copying' && '📋 Copying...'}
          {copyStatus === 'copied' && '✓ Copied!'}
          {copyStatus === 'error' && '✗ Failed - Downloaded instead'}
          {copyStatus === 'idle' && '📋 Copy Graph'}
        </button>
      </div>
    </div>
  );
}

export function TikTokFollowersChart({ channels, count = 15 }: { channels: ChannelDisplayData[]; count?: number }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    setCopyStatus('copying');
    const success = await copyChartToClipboard(chartRef);
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // Calculate virality scores for all channels
  const viralityScores = calculateViralityScores(channels);

  const data = [...channels]
    .filter((ch) => ch.tiktokFollowers && ch.tiktokFollowers > 0)
    .sort((a, b) => (b.tiktokFollowers || 0) - (a.tiktokFollowers || 0))
    .slice(0, count)
    .map((ch) => ({
      name: `${ch.channelName}|||${ch.logoUrl || ''}|||${ch.tiktokUrl || ''}`,
      fullName: ch.channelName,
      followers: ch.tiktokFollowers || 0,
      sqrtFollowers: Math.sqrt(ch.tiktokFollowers || 0),
      logoUrl: ch.logoUrl,
      tiktokUrl: ch.tiktokUrl,
      viralityScore: viralityScores.get(ch.channelUrl),
    }));

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p>No TikTok data available</p>
      </div>
    );
  }

  const renderLabel = (props: any) => {
    const { x, y, width, index } = props;
    const originalValue = data[index]?.followers || 0;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#fff"
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {formatNumber(originalValue)}
      </text>
    );
  };

  return (
    <div>
      <div ref={chartRef} style={{ backgroundColor: '#000', padding: '24px', borderRadius: '12px' }}>
        <h3 className="chart-title">TikTok Followers</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={data} margin={{ left: 10, right: 10, top: 40, bottom: 80 }}>
            <XAxis
              dataKey="name"
              stroke="transparent"
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick />}
              interval={0}
              height={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="sqrtFollowers"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              onClick={(data) => {
                if (data?.tiktokUrl) {
                  window.open(data.tiktokUrl, '_blank');
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <LabelList dataKey="sqrtFollowers" content={renderLabel} />
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <button
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          className="copy-chart-btn"
        >
          {copyStatus === 'copying' && '📋 Copying...'}
          {copyStatus === 'copied' && '✓ Copied!'}
          {copyStatus === 'error' && '✗ Failed - Downloaded instead'}
          {copyStatus === 'idle' && '📋 Copy Graph'}
        </button>
      </div>
    </div>
  );
}

export function TikTokLikesChart({ channels, count = 15 }: { channels: ChannelDisplayData[]; count?: number }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    setCopyStatus('copying');
    const success = await copyChartToClipboard(chartRef);
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // Calculate virality scores for all channels
  const viralityScores = calculateViralityScores(channels);

  const data = [...channels]
    .filter((ch) => ch.tiktokLikes && ch.tiktokLikes > 0)
    .sort((a, b) => (b.tiktokLikes || 0) - (a.tiktokLikes || 0))
    .slice(0, count)
    .map((ch) => ({
      name: `${ch.channelName}|||${ch.logoUrl || ''}|||${ch.tiktokUrl || ''}`,
      fullName: ch.channelName,
      likes: ch.tiktokLikes || 0,
      sqrtLikes: Math.sqrt(ch.tiktokLikes || 0),
      logoUrl: ch.logoUrl,
      tiktokUrl: ch.tiktokUrl,
      viralityScore: viralityScores.get(ch.channelUrl),
    }));

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p>No TikTok data available</p>
      </div>
    );
  }

  const renderLabel = (props: any) => {
    const { x, y, width, index } = props;
    const originalValue = data[index]?.likes || 0;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#fff"
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {formatNumber(originalValue)}
      </text>
    );
  };

  return (
    <div>
      <div ref={chartRef} style={{ backgroundColor: '#000', padding: '24px', borderRadius: '12px' }}>
        <h3 className="chart-title">TikTok Likes</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={data} margin={{ left: 10, right: 10, top: 40, bottom: 80 }}>
            <XAxis
              dataKey="name"
              stroke="transparent"
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick />}
              interval={0}
              height={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="sqrtLikes"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              onClick={(data) => {
                if (data?.tiktokUrl) {
                  window.open(data.tiktokUrl, '_blank');
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <LabelList dataKey="sqrtLikes" content={renderLabel} />
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <button
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          className="copy-chart-btn"
        >
          {copyStatus === 'copying' && '📋 Copying...'}
          {copyStatus === 'copied' && '✓ Copied!'}
          {copyStatus === 'error' && '✗ Failed - Downloaded instead'}
          {copyStatus === 'idle' && '📋 Copy Graph'}
        </button>
      </div>
    </div>
  );
}
