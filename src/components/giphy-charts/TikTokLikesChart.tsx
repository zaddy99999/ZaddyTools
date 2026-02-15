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
  formatNumber,
  BAR_COLORS,
  copyChartToClipboard,
  CustomTooltip,
  CustomXAxisTick,
  ScaleType,
} from './chartUtils';

interface TikTokLikesChartProps {
  channels: ChannelDisplayData[];
  count?: number;
  scaleType?: ScaleType;
}

export function TikTokLikesChart({ channels, count = 15, scaleType = 'sqrt' }: TikTokLikesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    setCopyStatus('copying');
    const success = await copyChartToClipboard(chartRef);
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const data = [...channels]
    .filter((ch) => ch.tiktokLikes && ch.tiktokLikes > 0)
    .sort((a, b) => (b.tiktokLikes || 0) - (a.tiktokLikes || 0))
    .slice(0, count)
    .map((ch, idx) => {
      const likes = ch.tiktokLikes || 0;
      return {
        name: `${ch.channelName}|||${ch.logoUrl || ''}|||${ch.tiktokUrl || ''}`,
        fullName: ch.channelName,
        likes,
        sqrtLikes: Math.sqrt(likes),
        logLikes: likes > 0 ? Math.log10(likes) : 0,
        logoUrl: ch.logoUrl,
        tiktokUrl: ch.tiktokUrl,
        rank: idx + 1,
      };
    });

  const getDataKey = () => {
    switch (scaleType) {
      case 'sqrt': return 'sqrtLikes';
      case 'log': return 'logLikes';
      default: return 'likes';
    }
  };

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
      <div ref={chartRef} className="giphy-chart-wrapper" style={{ backgroundColor: '#000', padding: 'clamp(10px, 2.5vw, 16px)', borderRadius: '0' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', color: '#2edb84', fontWeight: 600, textAlign: 'center' }}>
          TikTok Likes
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
              tickFormatter={formatNumber}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar
              dataKey={getDataKey()}
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
              onClick={(data) => {
                if (data?.tiktokUrl) {
                  window.open(data.tiktokUrl, '_blank');
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
