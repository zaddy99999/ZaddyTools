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

interface YouTubeViewsChartProps {
  channels: ChannelDisplayData[];
  count?: number;
  scaleType?: ScaleType;
}

export function YouTubeViewsChart({ channels, count = 15, scaleType = 'sqrt' }: YouTubeViewsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    setCopyStatus('copying');
    const success = await copyChartToClipboard(chartRef);
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // Helper to get local YouTube PFP path
  const getYouTubePfp = (channelName: string) => {
    const filename = channelName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '.jpg';
    return `/youtube-pfp/${filename}`;
  };

  const data = [...channels]
    .filter((ch) => ch.youtubeViews && ch.youtubeViews > 0)
    .sort((a, b) => (b.youtubeViews || 0) - (a.youtubeViews || 0))
    .slice(0, count)
    .map((ch, idx) => {
      const views = ch.youtubeViews || 0;
      // Use local YouTube PFP, fallback to GIPHY logo, then to initials avatar
      const localPfp = getYouTubePfp(ch.channelName);
      const fallbackLogo = ch.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(ch.channelName)}&background=ff0000&color=fff&size=64`;
      return {
        name: `${ch.channelName}|||${localPfp}|||${ch.youtubeUrl || ''}|||${fallbackLogo}`,
        fullName: ch.channelName,
        views,
        sqrtViews: Math.sqrt(views),
        logViews: views > 0 ? Math.log10(views) : 0,
        logoUrl: localPfp,
        fallbackLogo,
        youtubeUrl: ch.youtubeUrl,
        rank: idx + 1,
      };
    });

  const getDataKey = () => {
    switch (scaleType) {
      case 'sqrt': return 'sqrtViews';
      case 'log': return 'logViews';
      default: return 'views';
    }
  };

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p>No YouTube views data available</p>
      </div>
    );
  }

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
          YouTube Total Views
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
                if (data?.youtubeUrl) {
                  window.open(data.youtubeUrl, '_blank');
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
