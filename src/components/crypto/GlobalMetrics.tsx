'use client';

import { formatCompactNumber, formatPercentage } from '@/lib/crypto/formatters';
import type { GlobalData } from '@/lib/crypto/types';

interface GasData {
  low: number;
  average: number;
  fast: number;
}

interface GlobalMetricsProps {
  data?: GlobalData;
  gas?: GasData;
  isLoading?: boolean;
  lastUpdated?: string | null;
}

export default function GlobalMetrics({ data, gas, isLoading, lastUpdated }: GlobalMetricsProps) {
  if (isLoading) {
    return (
      <div className="global-metrics-card loading">
        <div className="skeleton skeleton-label" />
        <div className="global-metrics-row">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 80, height: 40 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const change = data?.market_cap_change_percentage_24h_usd ?? 0;
  const isPositive = change >= 0;

  return (
    <div className="global-metrics-card">
      <p className="widget-label">Global Market</p>

      <div className="global-metrics-grid">
        <div className="global-metric">
          <span className="global-metric-label">Market Cap</span>
          <span className="global-metric-value">{formatCompactNumber(data?.total_market_cap?.usd ?? 0, true)}</span>
        </div>

        <div className="global-metric">
          <span className="global-metric-label">24h Volume</span>
          <span className="global-metric-value">{formatCompactNumber(data?.total_volume?.usd ?? 0, true)}</span>
        </div>

        <div className="global-metric">
          <span className="global-metric-label">24h Change</span>
          <span className={`global-metric-value ${isPositive ? 'positive' : 'negative'}`}>
            {formatPercentage(change)}
          </span>
        </div>

        <div className="global-metric">
          <span className="global-metric-label">BTC Dom</span>
          <span className="global-metric-value">{(data?.market_cap_percentage?.btc ?? 0).toFixed(1)}%</span>
        </div>

        <div className="global-metric">
          <span className="global-metric-label">ETH Dom</span>
          <span className="global-metric-value">{(data?.market_cap_percentage?.eth ?? 0).toFixed(1)}%</span>
        </div>

        <div className="global-metric">
          <span className="global-metric-label">Active Coins</span>
          <span className="global-metric-value">{formatCompactNumber(data?.active_cryptocurrencies ?? 0)}</span>
        </div>
      </div>

      <div className="global-metrics-footer">
        {gas && gas.average > 0 && (
          <span className="gas-indicator">
            <span className="gas-icon">⛽</span>
            <span className="gas-value">{gas.average} gwei</span>
          </span>
        )}
        <a
          href="https://www.coingecko.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from CoinGecko
        </a>
      </div>
      {lastUpdated && (
        <span className="last-updated">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
