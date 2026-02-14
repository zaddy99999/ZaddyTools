'use client';

import { useState } from 'react';
import { formatCurrency, formatPercentage } from '@/lib/crypto/formatters';
import type { CoinMarketData } from '@/lib/crypto/types';

type TimePeriod = '1h' | '24h' | '7d' | '30d';

// Well-known coins that people actually care about
const KNOWN_COINS = new Set([
  'btc', 'eth', 'sol', 'bnb', 'xrp', 'ada', 'doge', 'avax', 'dot', 'matic',
  'link', 'shib', 'ltc', 'atom', 'uni', 'xlm', 'etc', 'near', 'apt', 'arb',
  'op', 'sui', 'sei', 'inj', 'tia', 'jup', 'stx', 'ren', 'fet', 'grt',
  'aave', 'mkr', 'snx', 'crv', 'ldo', 'rpl', 'comp', 'wld', 'blur', 'pendle',
  'fil', 'hbar', 'algo', 'vet', 'ftm', 'mana', 'sand', 'axs', 'ape', 'gala',
  'imx', 'ron', 'flow', 'egld', 'theta', 'xtz', 'eos', 'neo', 'zil', 'icp',
  'rune', 'kava', 'osmo', 'cake', 'gmx', 'dydx', 'sushi', '1inch', 'bal',
  'enj', 'chz', 'ens', 'woo', 'lrc', 'skl', 'celo', 'zrx', 'bnt', 'ocean',
  'pepe', 'floki', 'bonk', 'wif', 'meme', 'turbo', 'ladys', 'wojak',
  'render', 'rndr', 'ar', 'akt', 'agix', 'ondo', 'pyth', 'strk', 'manta', 'zk',
  'bome', 'brett', 'popcat', 'mog', 'neiro', 'goat', 'pnut', 'act', 'virtual'
]);

interface TopMoversProps {
  coins: CoinMarketData[];
  isLoading?: boolean;
  lastUpdated?: string | null;
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

export default function TopMovers({ coins, isLoading, lastUpdated }: TopMoversProps) {
  const [period, setPeriod] = useState<TimePeriod>('24h');

  // Filter to well-known coins and sort by absolute price change
  const knownCoins = (coins || []).filter((c) => c?.symbol && KNOWN_COINS.has(c.symbol.toLowerCase()));
  const sortedCoins = [...knownCoins].sort(
    (a, b) =>
      Math.abs(getPriceChange(b, period)) -
      Math.abs(getPriceChange(a, period))
  );

  const gainers = sortedCoins
    .filter((c) => getPriceChange(c, period) > 0)
    .slice(0, 15);
  const losers = sortedCoins
    .filter((c) => getPriceChange(c, period) < 0)
    .slice(0, 15);

  if (isLoading) {
    return (
      <div className="top-movers-card loading">
        <div className="skeleton skeleton-label" />
        <div className="movers-columns">
          <div className="mover-column">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
          <div className="mover-column">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="top-movers-card">
      <div className="movers-header">
        <p className="widget-label">Top Movers</p>
        <div className="movers-toggles">
          {(['1h', '24h', '7d', '30d'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              className={`movers-toggle ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="movers-columns">
        {/* Gainers */}
        <div className="mover-column">
          <p className="mover-section-label gainers">
            <span className="mover-icon">▲</span> GAINERS
          </p>
          <div className="mover-list">
            {gainers.map((coin) => (
              <a
                key={coin.id}
                href={`https://www.coingecko.com/en/coins/${coin.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mover-item"
              >
                <img src={coin.image || ''} alt={coin.name || ''} className="mover-icon-img" />
                <span className="mover-symbol">{coin.symbol?.toUpperCase() || ''}</span>
                <span className="mover-price">{formatCurrency(coin.current_price ?? 0)}</span>
                <span className="mover-change positive">
                  {formatPercentage(getPriceChange(coin, period))}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="mover-column">
          <p className="mover-section-label losers">
            <span className="mover-icon">▼</span> LOSERS
          </p>
          <div className="mover-list">
            {losers.map((coin) => (
              <a
                key={coin.id}
                href={`https://www.coingecko.com/en/coins/${coin.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mover-item"
              >
                <img src={coin.image || ''} alt={coin.name || ''} className="mover-icon-img" />
                <span className="mover-symbol">{coin.symbol?.toUpperCase() || ''}</span>
                <span className="mover-price">{formatCurrency(coin.current_price ?? 0)}</span>
                <span className="mover-change negative">
                  {formatPercentage(getPriceChange(coin, period))}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="movers-footer">
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
