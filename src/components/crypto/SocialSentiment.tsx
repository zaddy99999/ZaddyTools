'use client';

import useSWR from 'swr';

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  marketCapRank: number | null;
  priceChange24h?: number;
  score?: number;
}

interface SocialSentimentData {
  trending: TrendingCoin[];
  lastUpdated: string;
  source: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export default function SocialSentiment() {
  const { data, isLoading, error } = useSWR<SocialSentimentData>(
    '/api/crypto/social-sentiment',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: false,
    }
  );

  if (isLoading) {
    return (
      <div className="social-sentiment-card loading">
        <div className="skeleton skeleton-label" />
        <div className="social-trending-list">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  const trending = data?.trending || [];
  const hasData = trending.length > 0;

  return (
    <div className="social-sentiment-card">
      <div className="social-sentiment-header">
        <p className="widget-label">Trending Coins</p>
        {data?.source && data.source !== 'unavailable' && (
          <span className="social-source-badge">{data.source}</span>
        )}
      </div>

      {!hasData ? (
        <div className="social-empty">
          <p>{error ? 'Failed to load trending data' : 'Data unavailable'}</p>
        </div>
      ) : (
        <div className="social-trending-list">
          {trending.slice(0, 15).map((coin, index) => (
            <a
              key={coin.id}
              href={`https://www.coingecko.com/en/coins/${coin.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="social-trending-item"
            >
              <span className="social-rank">{coin.score ?? index + 1}</span>
              <img
                src={coin.thumb}
                alt={coin.name}
                className="social-coin-icon"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="social-coin-info">
                <span className="social-coin-symbol">{coin.symbol.toUpperCase()}</span>
                <span className="social-coin-name">{coin.name}</span>
              </div>
              {coin.priceChange24h !== undefined && (
                <span
                  className={`social-price-change ${
                    coin.priceChange24h >= 0 ? 'positive' : 'negative'
                  }`}
                >
                  {formatPercentage(coin.priceChange24h)}
                </span>
              )}
              {coin.marketCapRank && (
                <span className="social-mcap-rank">#{coin.marketCapRank}</span>
              )}
            </a>
          ))}
        </div>
      )}

      <div className="social-sentiment-footer">
        <a
          href="https://www.coingecko.com/en/highlights/trending"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          View on CoinGecko
        </a>
      </div>
      {data?.lastUpdated && (
        <span className="last-updated">
          Updated {new Date(data.lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
