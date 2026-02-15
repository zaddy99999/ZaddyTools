'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatCompactNumber, formatPercentage } from '@/lib/crypto/formatters';

interface DexData {
  name: string;
  displayName: string;
  logo: string;
  total24h: number;
  total7d: number;
  total30d: number;
  change_1d: number;
  change_7d: number;
  change_1m: number;
  totalAllTime: number;
  chains: string[];
  protocolType: string;
}

interface DexVolumeResponse {
  dexes: DexData[];
  totalVolume24h: number;
  totalVolume7d: number;
  totalVolume30d: number;
  change24h: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

type TimePeriod = '24h' | '7d' | '30d';

export default function DexVolume() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'bar'>('table');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24h');

  const { data, error, isLoading } = useSWR<DexVolumeResponse>(
    '/api/crypto/dex-volume',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  // Get volume for selected time period
  const getVolume = (dex: DexData) => {
    switch (timePeriod) {
      case '7d': return dex.total7d;
      case '30d': return dex.total30d;
      default: return dex.total24h;
    }
  };

  // Get change for selected time period
  const getChange = (dex: DexData) => {
    switch (timePeriod) {
      case '7d': return dex.change_7d;
      case '30d': return dex.change_1m;
      default: return dex.change_1d;
    }
  };

  // Sort dexes by selected time period volume
  const sortedDexes = [...(data?.dexes || [])].sort((a, b) => getVolume(b) - getVolume(a));
  const displayedDexes = showAll ? sortedDexes : sortedDexes.slice(0, 10);
  const maxVolume = sortedDexes.length > 0 ? getVolume(sortedDexes[0]) : 0;

  // Get total volume for selected period
  const getTotalVolume = () => {
    if (!data) return 0;
    switch (timePeriod) {
      case '7d': return data.totalVolume7d;
      case '30d': return data.totalVolume30d;
      default: return data.totalVolume24h;
    }
  };

  if (isLoading) {
    return (
      <div className="dex-volume-card loading">
        <div className="skeleton skeleton-label" />
        <div className="dex-volume-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dex-volume-card error">
        <p className="widget-label">DEX Volume</p>
        <p className="error-message">Failed to load DEX data</p>
      </div>
    );
  }

  return (
    <div className={`dex-volume-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="dex-volume-header">
        <div className="dex-volume-title-row">
          <p className="widget-label">DEX Volume ({timePeriod})</p>
          {data && (
            <span className="dex-total-volume">
              {formatCompactNumber(getTotalVolume(), true)}
            </span>
          )}
        </div>
        <div className="dex-volume-controls">
          <div className="dex-period-toggle">
            {(['24h', '7d', '30d'] as const).map((period) => (
              <button
                key={period}
                className={`dex-period-btn ${timePeriod === period ? 'active' : ''}`}
                onClick={() => setTimePeriod(period)}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="dex-view-toggle">
            <button
              className={`dex-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <span className="view-icon">&#9776;</span>
            </button>
            <button
              className={`dex-view-btn ${viewMode === 'bar' ? 'active' : ''}`}
              onClick={() => setViewMode('bar')}
              title="Bar chart view"
            >
              <span className="view-icon">&#9621;</span>
            </button>
          </div>
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '\u2296' : '\u2295'}
          </button>
        </div>
      </div>

      <div className={`dex-volume-list scrollable ${isExpanded ? 'expanded' : ''}`}>
        {viewMode === 'table' ? (
          <div className="dex-table">
            <div className="dex-table-header">
              <span className="dex-col-rank">#</span>
              <span className="dex-col-name">DEX</span>
              <span className="dex-col-volume">{timePeriod} Volume</span>
              <span className="dex-col-change">Change</span>
            </div>
            {displayedDexes.map((dex, index) => (
              <div key={dex.name} className="dex-table-row">
                <span className="dex-col-rank">{index + 1}</span>
                <div className="dex-col-name">
                  {dex.logo && (
                    <img
                      src={dex.logo}
                      alt={dex.displayName}
                      className="dex-logo"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="dex-name">{dex.displayName}</span>
                </div>
                <span className="dex-col-volume">
                  {formatCompactNumber(getVolume(dex), true)}
                </span>
                <span className={`dex-col-change ${getChange(dex) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentage(getChange(dex))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="dex-bar-chart">
            {displayedDexes.map((dex, index) => {
              const barWidth = maxVolume > 0 ? (getVolume(dex) / maxVolume) * 100 : 0;
              return (
                <div key={dex.name} className="dex-bar-item">
                  <div className="dex-bar-label">
                    <span className="dex-bar-rank">{index + 1}</span>
                    {dex.logo && (
                      <img
                        src={dex.logo}
                        alt={dex.displayName}
                        className="dex-logo-small"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <span className="dex-bar-name">{dex.displayName}</span>
                  </div>
                  <div className="dex-bar-container">
                    <div
                      className="dex-bar"
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="dex-bar-value">
                      {formatCompactNumber(getVolume(dex), true)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dex-footer">
        {sortedDexes.length > 10 && (
          <button
            className="show-more-btn"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : `Show All ${sortedDexes.length}`}
          </button>
        )}
        <a
          href="https://defillama.com/dexs"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from DeFiLlama
        </a>
      </div>
    </div>
  );
}
