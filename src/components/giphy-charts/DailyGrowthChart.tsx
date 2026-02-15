'use client';

import { useRef, useState } from 'react';
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
import {
  ChartProps,
  formatNumber,
  getChartTitle,
  copyChartToClipboard,
  CustomTooltip,
  CustomXAxisTick,
} from './chartUtils';

export function DailyGrowthChart({ channels, scaleType = 'linear', timePeriod = 'alltime', count = 15 }: ChartProps) {
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
      <div ref={chartRef} className="giphy-chart-wrapper" style={{ backgroundColor: '#000', padding: 'clamp(12px, 3vw, 24px)', borderRadius: '12px' }}>
        <h3 className="chart-title">{getChartTitle(timePeriod, 'growth')}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ left: 10, right: 10, top: 30, bottom: 60 }}>
            <XAxis
              dataKey="name"
              stroke="transparent"
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick />}
              interval={0}
              height={60}
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
        <div className="chart-watermark">ZaddyTools</div>
      </div>
      <div className="copy-btn-wrapper">
        <button
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          className="copy-chart-btn"
        >
          {copyStatus === 'copying' && 'Copying...'}
          {copyStatus === 'copied' && 'Copied!'}
          {copyStatus === 'error' && 'Failed - Downloaded instead'}
          {copyStatus === 'idle' && 'Copy Graph'}
        </button>
      </div>
    </div>
  );
}
