'use client';

import { useState } from 'react';
import { ChannelDisplayData } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface Props {
  channels: ChannelDisplayData[];
  selectedChannels: string[];
  onClose: () => void;
  onRemoveChannel: (channelUrl: string) => void;
}

const COLORS = ['#00D4FF', '#FF3366', '#FFD700', '#00FF88', '#A855F7'];

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

export default function ComparisonView({ channels, selectedChannels, onClose, onRemoveChannel }: Props) {
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');

  const compareData = channels.filter(ch => selectedChannels.includes(ch.channelUrl));

  if (compareData.length === 0) {
    return (
      <div className="comparison-view">
        <div className="comparison-header">
          <h3>Compare Channels</h3>
          <button className="close-btn" onClick={onClose}>Close</button>
        </div>
        <div className="comparison-empty">
          <p>Select up to 3 channels to compare by clicking the compare icon in the table.</p>
        </div>
      </div>
    );
  }

  // Prepare bar chart data
  const barMetrics = [
    { name: 'GIPHY Views', key: 'totalViews' },
    { name: 'TikTok Followers', key: 'tiktokFollowers' },
    { name: 'TikTok Likes', key: 'tiktokLikes' },
    { name: 'YouTube Subs', key: 'youtubeSubscribers' },
    { name: 'YouTube Views', key: 'youtubeViews' },
    { name: 'Daily Growth', key: 'delta1d' },
  ];

  const barChartData = barMetrics.map(metric => {
    const dataPoint: Record<string, any> = { metric: metric.name };
    compareData.forEach((ch, idx) => {
      dataPoint[ch.channelName] = (ch as any)[metric.key] || 0;
      dataPoint[`color${idx}`] = COLORS[idx];
    });
    return dataPoint;
  });

  // Prepare radar chart data - normalize values to 0-100 for comparison
  const normalizeValue = (value: number, max: number): number => {
    return max > 0 ? (value / max) * 100 : 0;
  };

  const maxValues = {
    totalViews: Math.max(...compareData.map(ch => ch.totalViews)),
    tiktokFollowers: Math.max(...compareData.map(ch => ch.tiktokFollowers || 0)),
    tiktokLikes: Math.max(...compareData.map(ch => ch.tiktokLikes || 0)),
    youtubeSubscribers: Math.max(...compareData.map(ch => ch.youtubeSubscribers || 0)),
    delta1d: Math.max(...compareData.map(ch => Math.abs(ch.delta1d || 0))),
  };

  const radarChartData = [
    { metric: 'GIPHY Views', fullMark: 100 },
    { metric: 'TikTok Followers', fullMark: 100 },
    { metric: 'TikTok Likes', fullMark: 100 },
    { metric: 'YouTube Subs', fullMark: 100 },
    { metric: 'Growth Rate', fullMark: 100 },
  ].map(item => {
    const result: Record<string, any> = { ...item };
    compareData.forEach(ch => {
      switch (item.metric) {
        case 'GIPHY Views':
          result[ch.channelName] = normalizeValue(ch.totalViews, maxValues.totalViews);
          break;
        case 'TikTok Followers':
          result[ch.channelName] = normalizeValue(ch.tiktokFollowers || 0, maxValues.tiktokFollowers);
          break;
        case 'TikTok Likes':
          result[ch.channelName] = normalizeValue(ch.tiktokLikes || 0, maxValues.tiktokLikes);
          break;
        case 'YouTube Subs':
          result[ch.channelName] = normalizeValue(ch.youtubeSubscribers || 0, maxValues.youtubeSubscribers);
          break;
        case 'Growth Rate':
          result[ch.channelName] = normalizeValue(Math.abs(ch.delta1d || 0), maxValues.delta1d);
          break;
      }
    });
    return result;
  });

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <h3>Channel Comparison</h3>
        <div className="comparison-controls">
          <div className="toggle-group">
            <button
              className={`toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
            >
              Bar Chart
            </button>
            <button
              className={`toggle-btn ${chartType === 'radar' ? 'active' : ''}`}
              onClick={() => setChartType('radar')}
            >
              Radar Chart
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Selected Channels Pills */}
      <div className="comparison-channels">
        {compareData.map((ch, idx) => (
          <div
            key={ch.channelUrl}
            className="comparison-channel-pill"
            style={{ borderColor: COLORS[idx] }}
          >
            {ch.logoUrl && (
              <img src={ch.logoUrl} alt="" className="pill-logo" />
            )}
            <span style={{ color: COLORS[idx] }}>{ch.channelName}</span>
            <button
              className="pill-remove"
              onClick={() => onRemoveChannel(ch.channelUrl)}
              title="Remove from comparison"
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="comparison-chart">
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barChartData} layout="vertical" margin={{ left: 100, right: 20 }}>
              <XAxis type="number" tickFormatter={formatNumber} stroke="#666" />
              <YAxis type="category" dataKey="metric" stroke="#888" width={100} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10, 15, 25, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => formatNumber(value)}
              />
              <Legend />
              {compareData.map((ch, idx) => (
                <Bar key={ch.channelUrl} dataKey={ch.channelName} fill={COLORS[idx]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarChartData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="metric" stroke="#888" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#444" />
              {compareData.map((ch, idx) => (
                <Radar
                  key={ch.channelUrl}
                  name={ch.channelName}
                  dataKey={ch.channelName}
                  stroke={COLORS[idx]}
                  fill={COLORS[idx]}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats Table */}
      <div className="comparison-table">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              {compareData.map((ch, idx) => (
                <th key={ch.channelUrl} style={{ color: COLORS[idx] }}>
                  {ch.channelName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>GIPHY Views</td>
              {compareData.map(ch => (
                <td key={ch.channelUrl}>{formatNumber(ch.totalViews)}</td>
              ))}
            </tr>
            <tr>
              <td>Daily Growth</td>
              {compareData.map(ch => (
                <td
                  key={ch.channelUrl}
                  className={(ch.delta1d || 0) >= 0 ? 'positive' : 'negative'}
                >
                  {(ch.delta1d || 0) >= 0 ? '+' : ''}{formatNumber(ch.delta1d || 0)}
                </td>
              ))}
            </tr>
            <tr>
              <td>7d Avg Growth</td>
              {compareData.map(ch => (
                <td key={ch.channelUrl}>{formatNumber(ch.avg7dDelta || 0)}</td>
              ))}
            </tr>
            <tr>
              <td>TikTok Followers</td>
              {compareData.map(ch => (
                <td key={ch.channelUrl}>{ch.tiktokFollowers ? formatNumber(ch.tiktokFollowers) : '-'}</td>
              ))}
            </tr>
            <tr>
              <td>TikTok Likes</td>
              {compareData.map(ch => (
                <td key={ch.channelUrl}>{ch.tiktokLikes ? formatNumber(ch.tiktokLikes) : '-'}</td>
              ))}
            </tr>
            <tr>
              <td>YouTube Subs</td>
              {compareData.map(ch => (
                <td key={ch.channelUrl}>{ch.youtubeSubscribers ? formatNumber(ch.youtubeSubscribers) : '-'}</td>
              ))}
            </tr>
            <tr>
              <td>YouTube Views</td>
              {compareData.map(ch => (
                <td key={ch.channelUrl}>{ch.youtubeViews ? formatNumber(ch.youtubeViews) : '-'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
