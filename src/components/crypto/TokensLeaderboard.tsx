'use client';

import { useState } from 'react';
import { formatCompactNumber, formatCurrency, formatPercentage } from '@/lib/crypto/formatters';
import type { CoinMarketData } from '@/lib/crypto/types';

type TimePeriod = '1h' | '24h' | '7d' | '30d';
type SortBy = 'market_cap' | 'volume' | 'change';

interface TokensLeaderboardProps {
  coins: CoinMarketData[];
  isLoading?: boolean;
}

const getPriceChange = (coin: CoinMarketData, period: TimePeriod): number => {
  switch (period) {
    case '1h':
      return coin.price_change_percentage_1h_in_currency ?? 0;
    case '24h':
      return coin.price_change_percentage_24h ?? 0;
    case '7d':
      return coin.price_change_percentage_7d_in_currency ?? 0;
    case '30d':
      return coin.price_change_percentage_30d_in_currency ?? 0;
    default:
      return coin.price_change_percentage_24h ?? 0;
  }
};

export default function TokensLeaderboard({ coins, isLoading }: TokensLeaderboardProps) {
  const [period, setPeriod] = useState<TimePeriod>('24h');
  const [sortBy, setSortBy] = useState<SortBy>('market_cap');
  const [showCount, setShowCount] = useState(25);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading || !coins) {
    return (
      <div className="tokens-leaderboard-card loading">
        <div className="skeleton skeleton-label" />
        <div className="tokens-list">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  // Sort coins
  const sortedCoins = [...coins].sort((a, b) => {
    if (sortBy === 'market_cap') {
      return (b.market_cap ?? 0) - (a.market_cap ?? 0);
    } else if (sortBy === 'volume') {
      return (b.total_volume ?? 0) - (a.total_volume ?? 0);
    } else {
      return Math.abs(getPriceChange(b, period)) - Math.abs(getPriceChange(a, period));
    }
  });

  const displayCoins = sortedCoins.slice(0, showCount);

  return (
    <div className={`tokens-leaderboard-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="tokens-header">
        <p className="widget-label">Top Tokens</p>
        <div className="tokens-controls">
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '⊖' : '⊕'}
          </button>
          <div className="tokens-toggles">
            {(['1h', '24h', '7d', '30d'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                className={`tokens-toggle ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="tokens-select"
          >
            <option value="market_cap">Market Cap</option>
            <option value="volume">Volume</option>
            <option value="change">% Change</option>
          </select>
        </div>
      </div>

      <div className="tokens-table-header">
        <span className="tokens-col-rank">#</span>
        <span className="tokens-col-name">Token</span>
        <span className="tokens-col-price">Price</span>
        <span className="tokens-col-change">{period}</span>
        <span className="tokens-col-mcap">MCap</span>
        <span className="tokens-col-volume">Vol 24h</span>
      </div>

      <div className="tokens-list">
        {displayCoins.map((coin, idx) => {
          const change = getPriceChange(coin, period);
          const isPositive = change >= 0;
          return (
            <a
              key={coin.id}
              href={`https://www.coingecko.com/en/coins/${coin.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tokens-row"
            >
              <span className="tokens-col-rank">{idx + 1}</span>
              <span className="tokens-col-name">
                <img src={coin.image} alt={coin.name} className="tokens-icon" />
                <span className="tokens-symbol">{coin.symbol?.toUpperCase()}</span>
              </span>
              <span className="tokens-col-price">{formatCurrency(coin.current_price)}</span>
              <span className={`tokens-col-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="tokens-col-mcap">{formatCompactNumber(coin.market_cap, true)}</span>
              <span className="tokens-col-volume">{formatCompactNumber(coin.total_volume, true)}</span>
            </a>
          );
        })}
      </div>

      <div className="tokens-footer">
        <div className="tokens-show-controls">
          {[25, 50, 100].map((count) => (
            <button
              key={count}
              className={`tokens-count-btn ${showCount === count ? 'active' : ''}`}
              onClick={() => setShowCount(count)}
            >
              {count}
            </button>
          ))}
        </div>
        <a
          href="https://www.coingecko.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from CoinGecko
        </a>
      </div>
    </div>
  );
}
