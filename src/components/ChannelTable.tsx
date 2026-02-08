'use client';

import { useState } from 'react';
import { ChannelDisplayData } from '@/lib/types';
import { calculateViralityScores } from '@/lib/viralityScore';

interface Props {
  channels: ChannelDisplayData[];
}

type SortField = 'rank' | 'channelName' | 'category' | 'totalViews' | 'delta1d' | 'avg7dDelta' | 'tiktokFollowers' | 'tiktokLikes' | 'viralityScore';
type SortDirection = 'asc' | 'desc';

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

function formatDelta(num: number | null): string {
  if (num === null) return '-';
  const prefix = num > 0 ? '+' : '';
  return prefix + formatNumber(num);
}

export default function ChannelTable({ channels }: Props) {
  const [sortField, setSortField] = useState<SortField>('totalViews');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Calculate virality scores for all channels
  const viralityScores = calculateViralityScores(channels);

  if (channels.length === 0) {
    return (
      <div className="empty-state">
        <p>No channel data available yet.</p>
        <p>Click &quot;Run Now&quot; to start tracking.</p>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to descending for numeric values (highest first)
      setSortDirection(field === 'rank' || field === 'channelName' || field === 'category' ? 'asc' : 'desc');
    }
  };

  const sorted = [...channels].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'rank':
        comparison = a.rank - b.rank;
        break;
      case 'channelName':
        comparison = a.channelName.localeCompare(b.channelName);
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      case 'totalViews':
        comparison = a.totalViews - b.totalViews;
        break;
      case 'delta1d':
        comparison = (a.delta1d || 0) - (b.delta1d || 0);
        break;
      case 'avg7dDelta':
        comparison = (a.avg7dDelta || 0) - (b.avg7dDelta || 0);
        break;
      case 'tiktokFollowers':
        comparison = (a.tiktokFollowers || 0) - (b.tiktokFollowers || 0);
        break;
      case 'tiktokLikes':
        comparison = (a.tiktokLikes || 0) - (b.tiktokLikes || 0);
        break;
      case 'viralityScore':
        const scoreA = viralityScores.get(a.channelUrl)?.score || 0;
        const scoreB = viralityScores.get(b.channelUrl)?.score || 0;
        comparison = scoreA - scoreB;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="sort-icon inactive">⇅</span>;
    }
    return <span className="sort-icon active">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('rank')} className="sortable">
              # <SortIcon field="rank" />
            </th>
            <th onClick={() => handleSort('channelName')} className="sortable">
              Channel <SortIcon field="channelName" />
            </th>
            <th onClick={() => handleSort('category')} className="sortable">
              Category <SortIcon field="category" />
            </th>
            <th onClick={() => handleSort('totalViews')} className="sortable">
              Total Views <SortIcon field="totalViews" />
            </th>
            <th onClick={() => handleSort('delta1d')} className="sortable">
              Daily <SortIcon field="delta1d" />
            </th>
            <th onClick={() => handleSort('avg7dDelta')} className="sortable">
              7d Avg <SortIcon field="avg7dDelta" />
            </th>
            <th onClick={() => handleSort('tiktokFollowers')} className="sortable">
              TikTok Followers <SortIcon field="tiktokFollowers" />
            </th>
            <th onClick={() => handleSort('tiktokLikes')} className="sortable">
              TikTok Likes <SortIcon field="tiktokLikes" />
            </th>
            <th onClick={() => handleSort('viralityScore')} className="sortable">
              Virality <SortIcon field="viralityScore" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((channel, index) => (
            <tr key={channel.channelUrl}>
              <td className="number">#{index + 1}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {channel.logoUrl && (
                    <img
                      src={channel.logoUrl}
                      alt=""
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <a
                    href={channel.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {channel.channelName}
                  </a>
                </div>
              </td>
              <td>
                <span className={`category-badge ${channel.category}`}>
                  {channel.category}
                </span>
              </td>
              <td className="number">{formatNumber(channel.totalViews)}</td>
              <td
                className={`number ${
                  channel.delta1d !== null
                    ? channel.delta1d > 0
                      ? 'positive'
                      : channel.delta1d < 0
                      ? 'negative'
                      : ''
                    : ''
                }`}
              >
                {formatDelta(channel.delta1d)}
              </td>
              <td className="number">{formatDelta(channel.avg7dDelta)}</td>
              <td className="number">
                {channel.tiktokFollowers ? formatNumber(channel.tiktokFollowers) : '-'}
              </td>
              <td className="number">
                {channel.tiktokLikes ? formatNumber(channel.tiktokLikes) : '-'}
              </td>
              <td>
                {(() => {
                  const score = viralityScores.get(channel.channelUrl);
                  if (!score) return '-';
                  return (
                    <span
                      style={{
                        backgroundColor: score.color,
                        color: '#000',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-block',
                      }}
                    >
                      {score.grade}
                    </span>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
