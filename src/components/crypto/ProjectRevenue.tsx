'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface ProtocolRevenue {
  name: string;
  logo: string;
  chain: string;
  category: string;
  total24h: number;
  total7d: number;
  total30d: number;
  totalAllTime: number;
}

interface RevenueData {
  protocols: ProtocolRevenue[];
  lastUpdated: string;
}

type TimePeriod = '24h' | '7d' | '30d' | 'allTime';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ProjectRevenue() {
  const [period, setPeriod] = useState<TimePeriod>('24h');
  const [showCount, setShowCount] = useState(10);

  const { data, isLoading, error } = useSWR<RevenueData>(
    '/api/crypto/protocol-revenue',
    fetcher,
    { refreshInterval: 300000 }
  );

  if (isLoading) {
    return (
      <div className="widget-card">
        <div className="widget-header">
          <p className="widget-label">Top Protocol Revenue</p>
        </div>
        <div className="skeleton-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" style={{ height: '40px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="widget-card">
        <p className="widget-label">Top Protocol Revenue</p>
        <p className="widget-empty">Unable to load revenue data</p>
      </div>
    );
  }

  const getRevenueForPeriod = (protocol: ProtocolRevenue) => {
    switch (period) {
      case '24h': return protocol.total24h;
      case '7d': return protocol.total7d;
      case '30d': return protocol.total30d;
      case 'allTime': return protocol.totalAllTime;
    }
  };

  const formatRevenue = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const sortedProtocols = [...data.protocols]
    .sort((a, b) => getRevenueForPeriod(b) - getRevenueForPeriod(a))
    .slice(0, showCount);

  const maxRevenue = Math.max(...sortedProtocols.map(p => getRevenueForPeriod(p)));

  return (
    <div className="widget-card protocol-revenue-card">
      <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <p className="widget-label">Top Protocol Revenue</p>
        <div className="revenue-controls">
          <div className="period-toggles">
            {(['24h', '7d', '30d', 'allTime'] as const).map((p) => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === 'allTime' ? 'All' : p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="revenue-list">
        {sortedProtocols.map((protocol, index) => {
          const revenue = getRevenueForPeriod(protocol);
          const barWidth = (revenue / maxRevenue) * 100;

          return (
            <div key={protocol.name} className="revenue-row">
              <div className="revenue-rank">{index + 1}</div>
              <img
                src={protocol.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(protocol.name)}&background=2edb84&color=000&size=32`}
                alt={protocol.name}
                className="revenue-logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(protocol.name)}&background=2edb84&color=000&size=32`;
                }}
              />
              <div className="revenue-info">
                <div className="revenue-name-row">
                  <span className="revenue-name">{protocol.name}</span>
                  <span className="revenue-chain">{protocol.chain}</span>
                </div>
                <div className="revenue-bar-container">
                  <div
                    className="revenue-bar"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              <div className="revenue-amount">{formatRevenue(revenue)}</div>
            </div>
          );
        })}
      </div>

      {data.protocols.length > showCount && (
        <button
          className="show-more-btn"
          onClick={() => setShowCount(prev => Math.min(prev + 10, data.protocols.length))}
        >
          Show More
        </button>
      )}

      <div className="widget-footer">
        <span className="data-source">Data from DefiLlama</span>
      </div>
    </div>
  );
}
