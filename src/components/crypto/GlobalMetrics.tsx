'use client';

import { formatCompactNumber, formatPercentage, formatCurrency } from '@/lib/crypto/formatters';
import type { GlobalData, CoinMarketData } from '@/lib/crypto/types';

interface GlobalMetricsProps {
  data?: GlobalData;
  prices?: CoinMarketData[];
  isLoading?: boolean;
}

const MAJOR_COINS = ['bitcoin', 'ethereum', 'solana'];
const COIN_COLORS: Record<string, string> = {
  bitcoin: '#f7931a',
  ethereum: '#627eea',
  solana: '#9945ff',
};

export default function GlobalMetrics({ data, prices, isLoading }: GlobalMetricsProps) {
  if (isLoading || !data) {
    return <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, height: 80 }} />;
  }

  const change = data?.market_cap_change_percentage_24h_usd ?? 0;
  const isPositive = change >= 0;
  const btcDom = data?.market_cap_percentage?.btc ?? 0;
  const ethDom = data?.market_cap_percentage?.eth ?? 0;

  const majorCoins = prices?.filter(p => MAJOR_COINS.includes(p.id)) || [];

  return (
    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Top row: Global stats + Major coins */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        {/* Left: Global label + change */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Global</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isPositive ? '#2edb84' : '#ef4444' }}>
            {isPositive ? '▲' : '▼'} {formatPercentage(Math.abs(change))}
          </span>
        </div>

        {/* Center: Major coin prices */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {MAJOR_COINS.map(coinId => {
            const coin = majorCoins.find(p => p.id === coinId);
            if (!coin) return null;
            const coinChange = coin.price_change_percentage_24h ?? 0;
            const coinPositive = coinChange >= 0;
            return (
              <a
                key={coinId}
                href={`https://www.coingecko.com/en/coins/${coinId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  textDecoration: 'none',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <img src={coin.image} alt={coin.symbol} style={{ width: 16, height: 16, borderRadius: '50%' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: COIN_COLORS[coinId] || '#fff' }}>
                  {formatCurrency(coin.current_price)}
                </span>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: coinPositive ? '#2edb84' : '#ef4444' }}>
                  {coinPositive ? '+' : ''}{coinChange.toFixed(1)}%
                </span>
              </a>
            );
          })}
        </div>

        {/* Right: MCap + Volume */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2edb84' }}>{formatCompactNumber(data?.total_market_cap?.usd ?? 0, true)}</div>
            <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>MCap</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>{formatCompactNumber(data?.total_volume?.usd ?? 0, true)}</div>
            <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>Vol 24h</div>
          </div>
        </div>
      </div>

      {/* Dominance Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', minWidth: 30 }}>Dom</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ width: `${btcDom}%`, background: '#f7931a' }} title={`BTC ${btcDom.toFixed(1)}%`} />
          <div style={{ width: `${ethDom}%`, background: '#627eea' }} title={`ETH ${ethDom.toFixed(1)}%`} />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)' }}>
          <span style={{ color: '#f7931a' }}>BTC {btcDom.toFixed(0)}%</span>
          <span style={{ color: '#627eea' }}>ETH {ethDom.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
