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
import {
  ChartProps,
  formatNumber,
  BAR_COLORS,
  copyChartToClipboard,
  CustomTooltip,
  CustomXAxisTick,
} from './chartUtils';

export function GifCountChart({ channels, scaleType = 'linear', count = 15 }: ChartProps) {
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
      <div ref={chartRef} className="giphy-chart-wrapper" style={{ backgroundColor: '#000', padding: 'clamp(12px, 3vw, 24px)', borderRadius: '12px' }}>
        <h3 className="chart-title">GIPHY GIF Count</h3>
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
