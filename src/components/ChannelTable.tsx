'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ChannelDisplayData } from '@/lib/types';
import { getFavorites, toggleFavorite } from '@/lib/favorites';
import MiniSparkline from './crypto/MiniSparkline';

interface Props {
  channels: ChannelDisplayData[];
  compareChannels?: string[];
  onToggleCompare?: (channelUrl: string) => void;
  growthFilter?: 'all' | 'growing' | 'declining' | 'fastest';
  searchQuery?: string;
}

type SortField = 'rank' | 'channelName' | 'category' | 'totalViews' | 'delta1d' | 'avg7dDelta' | 'tiktokFollowers' | 'tiktokLikes' | 'youtubeSubscribers' | 'youtubeViews';
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

// Calculate if a channel is "trending" based on growth
function isTrending(channel: ChannelDisplayData): boolean {
  const dailyGrowth = channel.delta1d || 0;
  const avgGrowth = channel.avg7dDelta || 0;
  // Trending if daily growth is significantly higher than average OR if growth rate is very high
  return dailyGrowth > avgGrowth * 1.5 && dailyGrowth > 100000;
}

// Calculate trending score for ranking
function getTrendingScore(channel: ChannelDisplayData): number {
  const dailyGrowth = channel.delta1d || 0;
  const avgGrowth = channel.avg7dDelta || 1;
  const growthRate = dailyGrowth / avgGrowth;
  return growthRate * Math.log10(Math.max(dailyGrowth, 1));
}

export default function ChannelTable({ channels, compareChannels = [], onToggleCompare, growthFilter = 'all', searchQuery = '' }: Props) {
  const [sortField, setSortField] = useState<SortField>('totalViews');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Combine external and internal search
  const activeSearch = searchQuery || internalSearch;

  useEffect(() => {
    setMounted(true);
    setFavorites(getFavorites());

    // Keyboard shortcut for search focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFavoriteToggle = (channelUrl: string) => {
    const result = toggleFavorite(channelUrl);
    setFavorites(result.favorites);
  };

  // Generate mock sparkline data based on channel stats
  const generateSparklineData = (channel: ChannelDisplayData): number[] => {
    const base = channel.totalViews;
    const delta = channel.delta1d || 0;
    const avgDelta = channel.avg7dDelta || delta;

    // Generate 7 data points showing the trend
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * Math.abs(avgDelta) * 0.5;
      const dayValue = base - (i * avgDelta) + variance;
      data.push(Math.max(0, dayValue));
    }
    return data;
  };

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
      setSortDirection(field === 'rank' || field === 'channelName' || field === 'category' ? 'asc' : 'desc');
    }
  };

  // Filter by search query
  const searchFiltered = useMemo(() => {
    if (!activeSearch.trim()) return channels;
    const query = activeSearch.toLowerCase();
    return channels.filter(ch =>
      ch.channelName.toLowerCase().includes(query) ||
      ch.category.toLowerCase().includes(query)
    );
  }, [channels, activeSearch]);

  // Filter by growth rate
  const growthFiltered = useMemo(() => {
    switch (growthFilter) {
      case 'growing':
        return searchFiltered.filter(ch => (ch.delta1d || 0) > 0);
      case 'declining':
        return searchFiltered.filter(ch => (ch.delta1d || 0) < 0);
      case 'fastest':
        return [...searchFiltered]
          .filter(ch => (ch.delta1d || 0) > 0)
          .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
          .slice(0, 20);
      default:
        return searchFiltered;
    }
  }, [searchFiltered, growthFilter]);

  // Sort channels with favorites at top
  const sorted = useMemo(() => {
    const sortedChannels = [...growthFiltered].sort((a, b) => {
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
        case 'youtubeSubscribers':
          comparison = (a.youtubeSubscribers || 0) - (b.youtubeSubscribers || 0);
          break;
        case 'youtubeViews':
          comparison = (a.youtubeViews || 0) - (b.youtubeViews || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Move favorites to top
    if (mounted && favorites.length > 0) {
      const favoriteChannels = sortedChannels.filter(ch => favorites.includes(ch.channelUrl));
      const otherChannels = sortedChannels.filter(ch => !favorites.includes(ch.channelUrl));
      return [...favoriteChannels, ...otherChannels];
    }

    return sortedChannels;
  }, [growthFiltered, sortField, sortDirection, favorites, mounted]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="sort-icon inactive">&#8645;</span>;
    }
    return <span className="sort-icon active">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="table-container">
      {/* Search Bar */}
      <div className="table-search-bar">
        <div className="table-search-wrapper">
          <svg className="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="table-search-input input-animated"
            placeholder="Search channels... (Ctrl+F)"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
          />
          {internalSearch && (
            <button
              className="table-search-clear"
              onClick={() => setInternalSearch('')}
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="table-results-count">
          {growthFiltered.length} of {channels.length} channels
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: '40px' }}></th>
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
              Giphy Views <SortIcon field="totalViews" />
            </th>
            <th style={{ width: '70px' }}>Trend</th>
            <th onClick={() => handleSort('delta1d')} className="sortable">
              Daily <SortIcon field="delta1d" />
            </th>
            <th onClick={() => handleSort('avg7dDelta')} className="sortable">
              7d Avg <SortIcon field="avg7dDelta" />
            </th>
            <th onClick={() => handleSort('tiktokFollowers')} className="sortable">
              TikTok <SortIcon field="tiktokFollowers" />
            </th>
            <th onClick={() => handleSort('youtubeSubscribers')} className="sortable">
              YouTube <SortIcon field="youtubeSubscribers" />
            </th>
            {onToggleCompare && <th style={{ width: '40px' }}></th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((channel, index) => {
            const isFav = mounted && favorites.includes(channel.channelUrl);
            const trending = isTrending(channel);
            const isComparing = compareChannels.includes(channel.channelUrl);
            const sparklineData = generateSparklineData(channel);
            const isPositive = (channel.delta1d || 0) >= 0;

            return (
              <tr
                key={channel.channelUrl}
                className={`${isFav ? 'favorite-row' : ''} ${isComparing ? 'comparing-row' : ''}`}
              >
                <td>
                  <button
                    className={`favorite-btn ${isFav ? 'active' : ''}`}
                    onClick={() => handleFavoriteToggle(channel.channelUrl)}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </td>
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
                    {trending && (
                      <span className="trending-badge" title="Trending - High recent growth">
                        🔥
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`category-badge ${channel.category}`}>
                    {channel.category}
                  </span>
                </td>
                <td className="number">{formatNumber(channel.totalViews)}</td>
                <td>
                  <MiniSparkline
                    data={sparklineData}
                    isPositive={isPositive}
                    width={60}
                    height={24}
                  />
                </td>
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
                  {channel.youtubeSubscribers ? formatNumber(channel.youtubeSubscribers) : '-'}
                </td>
                {onToggleCompare && (
                  <td>
                    <button
                      className={`compare-btn ${isComparing ? 'active' : ''}`}
                      onClick={() => onToggleCompare(channel.channelUrl)}
                      disabled={!isComparing && compareChannels.length >= 3}
                      title={isComparing ? 'Remove from comparison' : 'Add to comparison'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="18" rx="1" />
                        <rect x="14" y="3" width="7" height="18" rx="1" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
