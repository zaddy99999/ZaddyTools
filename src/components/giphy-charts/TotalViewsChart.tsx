'use client';

import { useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  CartesianGrid,
} from 'recharts';
import { ChannelDisplayData } from '@/lib/types';
import {
  ChartProps,
  formatNumber,
  generateNiceTicks,
  getChartTitle,
  BAR_COLORS,
  copyChartToClipboard,
  CustomTooltip,
  CustomXAxisTick,
} from './chartUtils';

export function TotalViewsChart({ channels, scaleType = 'linear', timePeriod = 'alltime', count = 15 }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    setCopyStatus('copying');
    const success = await copyChartToClipboard(chartRef);
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // Get the appropriate value based on time period
  const getViewValue = (ch: ChannelDisplayData): number => {
    switch (timePeriod) {
      case 'daily':
        return ch.delta1d ?? 0;
      case 'weekly':
        return ch.avg7dDelta ? ch.avg7dDelta * 7 : 0;
      default:
        return ch.totalViews;
    }
  };

  const data = [...channels]
    .map((ch) => ({
      channel: ch,
      value: getViewValue(ch),
    }))
    .filter(d => d.value > 0) // Only show positive values for daily/weekly
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
    .map((d, idx) => ({
      name: `${d.channel.channelName}|||${d.channel.logoUrl || ''}|||${d.channel.channelUrl}`,
      fullName: d.channel.channelName,
      views: d.value,
      sqrtViews: Math.sqrt(d.value),
      // Use power scale (x^0.25) instead of log for better visual separation
      // log10(1M)=6, log10(6B)=9.78 -> too similar visually
      // 1M^0.25=31.6, 6B^0.25=278 -> much better visual difference
      logViews: d.value > 0 ? Math.pow(d.value, 0.25) : 0,
      logoUrl: d.channel.logoUrl,
      channelUrl: d.channel.channelUrl,
      rank: idx + 1,
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
  const maxPower = Math.max(...data.map(d => d.logViews));
  // Create ticks at nice values (1K, 10K, 100K, 1M, 10M, 100M, 1B, etc)
  const powerTickValues = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10].filter(v => v <= maxViews * 1.2);
  const powerTicks = powerTickValues.map(v => Math.pow(v, 0.25));

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
          domain: [0, maxPower * 1.1] as [number, number],
          ticks: powerTicks,
          tickFormatter: (value: number) => formatNumber(Math.round(Math.pow(value, 4))),
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
    const { x, y, width, index } = props;
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
      <div ref={chartRef} className="giphy-chart-wrapper" style={{ backgroundColor: '#000', padding: 'clamp(10px, 2.5vw, 16px)', borderRadius: '0' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', color: '#2edb84', fontWeight: 600, textAlign: 'center' }}>
          {getChartTitle(timePeriod, 'views')}
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ left: 0, right: 10, top: 20, bottom: 70 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="transparent"
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick />}
              interval={0}
              height={70}
            />
            <YAxis
              stroke="rgba(255,255,255,0.1)"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#444', fontSize: 10 }}
              tickFormatter={yAxisConfig.tickFormatter}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar
              dataKey={getDataKey()}
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
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
