'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { formatCompactNumber } from '@/lib/crypto/formatters';
import type { CoinMarketData } from '@/lib/crypto/types';

type ViewType = 'sectors' | 'coins';

// Local coin image fallbacks (saved in /public/coins/)
const LOCAL_COIN_IMAGES: Record<string, string> = {
  'bitcoin': '/coins/bitcoin.png',
  'ethereum': '/coins/ethereum.png',
  'tether': '/coins/tether.png',
  'ripple': '/coins/ripple.png',
  'binancecoin': '/coins/binancecoin.png',
  'solana': '/coins/solana.png',
  'dogecoin': '/coins/dogecoin.png',
  'cardano': '/coins/cardano.png',
  'tron': '/coins/tron.png',
  'avalanche-2': '/coins/avalanche-2.png',
  'shiba-inu': '/coins/shiba-inu.png',
  'chainlink': '/coins/chainlink.png',
  'polkadot': '/coins/polkadot.png',
  'bitcoin-cash': '/coins/bitcoin-cash.png',
  'near': '/coins/near.png',
  'uniswap': '/coins/uniswap.png',
  'litecoin': '/coins/litecoin.png',
  'sui': '/coins/sui.png',
  'pepe': '/coins/pepe.png',
  'stellar': '/coins/stellar.png',
  'hedera-hashgraph': '/coins/hedera-hashgraph.png',
  'arbitrum': '/coins/arbitrum.png',
  'optimism': '/coins/optimism.png',
  'cosmos': '/coins/cosmos.png',
  'filecoin': '/coins/filecoin.png',
  'matic-network': '/coins/matic-network.png',
  'aave': '/coins/aave.png',
  'maker': '/coins/maker.png',
};

// Get image URL with fallback chain
function getCoinImage(coinId: string, originalUrl: string): string {
  // Try local image first if available
  if (LOCAL_COIN_IMAGES[coinId]) {
    return LOCAL_COIN_IMAGES[coinId];
  }
  // Fall back to original CoinGecko URL
  return originalUrl;
}

// Whitelist of approved coins (prevents scam tokens from showing)
const COIN_WHITELIST = new Set([
  // Top 50 by market cap
  'bitcoin', 'ethereum', 'tether', 'ripple', 'binancecoin', 'solana', 'usd-coin',
  'dogecoin', 'cardano', 'tron', 'avalanche-2', 'shiba-inu', 'chainlink',
  'wrapped-bitcoin', 'polkadot', 'bitcoin-cash', 'near', 'uniswap', 'litecoin',
  'sui', 'pepe', 'internet-computer', 'aptos', 'stellar', 'ethereum-classic',
  'hedera-hashgraph', 'render-token', 'cronos', 'filecoin', 'cosmos', 'mantle',
  'arbitrum', 'optimism', 'injective-protocol', 'immutable-x', 'vechain',
  'the-graph', 'fantom', 'theta-token', 'maker', 'aave', 'algorand',
  'matic-network', 'bittensor', 'celestia', 'sei-network', 'starknet', 'flow',
  'sandbox', 'decentraland', 'axie-infinity', 'eos', 'neo', 'kucoin-shares',
  // Additional trusted coins
  'lido-dao', 'rocket-pool-eth', 'wrapped-steth', 'frax', 'dai', 'true-usd',
  'paxos-standard', 'gemini-dollar', 'curve-dao-token', 'convex-finance',
  'compound-governance-token', 'yearn-finance', 'synthetix-network-token',
  '1inch', 'sushi', 'pancakeswap-token', 'thorchain', 'kava', 'osmosis',
  'fetch-ai', 'ocean-protocol', 'singularitynet', 'worldcoin-wld', 'bonk',
  'floki', 'brett', 'dogwifcoin', 'popcat', 'mog-coin', 'book-of-meme',
  'monero', 'zcash', 'dash', 'waves', 'zilliqa', 'enjincoin', 'gala',
  'stepn', 'blur', 'magic', 'looksrare', 'pendle', 'gmx', 'dydx',
  'jupiter-exchange-solana', 'raydium', 'orca', 'marinade', 'jito-governance-token',
  'pyth-network', 'wormhole', 'layerzero', 'eigenlayer', 'ethena',
]);

interface SectorPerformanceProps {
  coins?: CoinMarketData[];
  isLoading?: boolean;
}

interface Sector {
  id: string;
  name: string;
  marketCap: number;
  change24h: number;
  volume24h: number;
  topCoins: string[];
}

interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
  data: Sector;
}

interface CoinRect {
  x: number;
  y: number;
  width: number;
  height: number;
  data: {
    id: string;
    symbol: string;
    name: string;
    image: string;
    marketCap: number;
    volume: number;
    change: number;
  };
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Get color based on price change for coins view
const getChangeColor = (change: number): string => {
  if (change >= 10) return 'rgba(34, 197, 94, 0.9)';
  if (change >= 5) return 'rgba(34, 197, 94, 0.7)';
  if (change >= 2) return 'rgba(34, 197, 94, 0.5)';
  if (change >= 0) return 'rgba(34, 197, 94, 0.3)';
  if (change >= -2) return 'rgba(239, 68, 68, 0.3)';
  if (change >= -5) return 'rgba(239, 68, 68, 0.5)';
  if (change >= -10) return 'rgba(239, 68, 68, 0.7)';
  return 'rgba(239, 68, 68, 0.9)';
};

// Generate consistent colors based on sector name
function getSectorColor(name: string): string {
  const colors = [
    'rgba(46, 219, 132, 0.6)',   // Green
    'rgba(99, 102, 241, 0.6)',   // Indigo
    'rgba(236, 72, 153, 0.6)',   // Pink
    'rgba(245, 158, 11, 0.6)',   // Amber
    'rgba(14, 165, 233, 0.6)',   // Sky
    'rgba(168, 85, 247, 0.6)',   // Purple
    'rgba(34, 197, 94, 0.6)',    // Emerald
    'rgba(249, 115, 22, 0.6)',   // Orange
    'rgba(6, 182, 212, 0.6)',    // Cyan
    'rgba(139, 92, 246, 0.6)',   // Violet
    'rgba(16, 185, 129, 0.6)',   // Teal
    'rgba(244, 63, 94, 0.6)',    // Rose
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Generic squarified treemap algorithm
function createTreemap<T>(items: { value: number; data: T }[], width: number, height: number): { x: number; y: number; width: number; height: number; data: T }[] {
  const total = items.reduce((sum, item) => sum + Math.max(item.value, 0.001), 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items
    .map(item => ({ value: Math.max(item.value, 0.001) / total, data: item.data }))
    .sort((a, b) => b.value - a.value);

  const rects: { x: number; y: number; width: number; height: number; data: T }[] = [];

  function squarifyRecursive(
    items: typeof normalized,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    if (items.length === 0) return;
    if (items.length === 1) {
      rects.push({ x, y, width: w, height: h, data: items[0].data });
      return;
    }

    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    const isWide = w >= h;
    const side = isWide ? h : w;

    let bestRow: typeof normalized = [];
    let bestWorstAspect = Infinity;
    let bestRowValue = 0;
    let currentRow: typeof normalized = [];
    let currentRowValue = 0;

    for (let i = 0; i < items.length; i++) {
      currentRow.push(items[i]);
      currentRowValue += items[i].value;

      const stripSize = (currentRowValue / totalValue) * (isWide ? w : h);
      let worstAspect = 0;
      for (const item of currentRow) {
        const itemSize = (item.value / currentRowValue) * side;
        const aspect = Math.max(stripSize / itemSize, itemSize / stripSize);
        worstAspect = Math.max(worstAspect, aspect);
      }

      if (worstAspect <= bestWorstAspect) {
        bestWorstAspect = worstAspect;
        bestRow = [...currentRow];
        bestRowValue = currentRowValue;
      } else {
        break;
      }
    }

    const stripFraction = bestRowValue / totalValue;

    if (isWide) {
      const stripWidth = w * stripFraction;
      let itemY = y;
      for (const item of bestRow) {
        const itemHeight = side * (item.value / bestRowValue);
        rects.push({ x, y: itemY, width: stripWidth, height: itemHeight, data: item.data });
        itemY += itemHeight;
      }
      const remaining = items.slice(bestRow.length);
      if (remaining.length > 0) {
        squarifyRecursive(remaining, x + stripWidth, y, w - stripWidth, h);
      }
    } else {
      const stripHeight = h * stripFraction;
      let itemX = x;
      for (const item of bestRow) {
        const itemWidth = side * (item.value / bestRowValue);
        rects.push({ x: itemX, y, width: itemWidth, height: stripHeight, data: item.data });
        itemX += itemWidth;
      }
      const remaining = items.slice(bestRow.length);
      if (remaining.length > 0) {
        squarifyRecursive(remaining, x, y + stripHeight, w, h - stripHeight);
      }
    }
  }

  squarifyRecursive(normalized, 0, 0, width, height);
  return rects;
}

export default function SectorPerformance({ coins = [], isLoading: coinsLoading }: SectorPerformanceProps) {
  const [view, setView] = useState<ViewType>('coins');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((coinId: string) => {
    setFailedImages(prev => new Set(prev).add(coinId));
  }, []);

  const { data: sectors, isLoading: sectorsLoading } = useSWR<Sector[]>('/api/crypto/sectors', fetcher, {
    refreshInterval: 60000,
  });

  const containerHeight = 320; // pixels
  const padding = 2;
  const svgWidth = 600;
  const svgHeight = containerHeight;

  // Prepare coin data for treemap
  const coinRects = useMemo(() => {
    if (!coins || coins.length === 0) return [];
    // Filter by whitelist and take top 20
    const whitelistedCoins = coins.filter(coin => COIN_WHITELIST.has(coin.id));
    const topCoins = whitelistedCoins.slice(0, 20);
    const coinItems = topCoins.map(coin => ({
      value: Math.sqrt(coin.market_cap), // sqrt scale for balanced sizes
      data: {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        marketCap: coin.market_cap,
        volume: coin.total_volume || 0,
        change: coin.price_change_percentage_24h ?? 0, // 24h change for color
      }
    }));
    return createTreemap(coinItems, svgWidth, svgHeight);
  }, [coins]);

  // Prepare sector data for treemap
  const sectorRects = useMemo(() => {
    if (!sectors || sectors.length === 0) return [];
    const sorted = [...sectors].sort((a, b) => b.marketCap - a.marketCap).slice(0, 12);
    const sectorItems = sorted.map(s => ({ value: Math.sqrt(s.marketCap), data: s }));
    return createTreemap(sectorItems, svgWidth, svgHeight);
  }, [sectors]);

  const isLoading = view === 'coins' ? coinsLoading : sectorsLoading;

  if (isLoading) {
    return (
      <div className="widget-card">
        <div className="heatmap-header-row">
          <p className="widget-label" style={{ margin: 0 }}>Market Heatmap</p>
        </div>
        <div className="skeleton" style={{ height: containerHeight }} />
      </div>
    );
  }

  const isEmpty = view === 'coins' ? coins.length === 0 : (!sectors || sectors.length === 0);
  if (isEmpty) {
    return (
      <div className="widget-card">
        <div className="heatmap-header-row">
          <p className="widget-label" style={{ margin: 0 }}>Market Heatmap</p>
        </div>
        <p className="widget-empty">No data available</p>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <div className="heatmap-header-row">
        <p className="widget-label" style={{ margin: 0 }}>Market Heatmap</p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* View Toggle */}
          <div className="heatmap-toggles" role="group" aria-label="Heatmap view selector">
            <button
              className={`heatmap-toggle ${view === 'coins' ? 'active' : ''}`}
              onClick={() => setView('coins')}
              aria-pressed={view === 'coins'}
            >
              Coins
            </button>
            <button
              className={`heatmap-toggle ${view === 'sectors' ? 'active' : ''}`}
              onClick={() => setView('sectors')}
              aria-pressed={view === 'sectors'}
            >
              Sectors
            </button>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: containerHeight, position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
          preserveAspectRatio="none"
          role="img"
          aria-label={view === 'coins'
            ? 'Market heatmap showing top 20 cryptocurrencies by market cap. Colors indicate 24-hour price change: green for gains, red for losses.'
            : 'Market heatmap showing top 12 cryptocurrency sectors by market cap. Each sector is sized proportionally to its market capitalization.'}
        >
          <title>{view === 'coins' ? 'Cryptocurrency Market Heatmap by Coins' : 'Cryptocurrency Market Heatmap by Sectors'}</title>
          <defs>
            {view === 'coins' && coinRects.map((rect, idx) => (
              <clipPath key={`coin-clip-${idx}`} id={`coin-clip-${idx}`}>
                <rect
                  x={rect.x + padding}
                  y={rect.y + padding}
                  width={Math.max(rect.width - padding * 2, 0)}
                  height={Math.max(rect.height - padding * 2, 0)}
                  rx={6}
                />
              </clipPath>
            ))}
          </defs>
          {view === 'coins' ? (
            // Coins heatmap
            coinRects.map((rect, idx) => {
              const coin = rect.data;
              const tileX = rect.x + padding;
              const tileY = rect.y + padding;
              const tileW = Math.max(rect.width - padding * 2, 0);
              const tileH = Math.max(rect.height - padding * 2, 0);
              const minDim = Math.min(tileW, tileH);

              const showSymbol = minDim > 30;
              const showMcap = minDim > 45;

              const symbolFontSize = Math.min(Math.max(minDim / 4, 10), 18);
              const mcapFontSize = Math.min(Math.max(minDim / 5, 9), 14);

              const isPositive = coin.change >= 0;

              return (
                <a
                  key={coin.id}
                  href={`https://www.coingecko.com/en/coins/${coin.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <g style={{ cursor: 'pointer' }}>
                    {/* Base background */}
                    <rect
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      fill="#1a1a2e"
                      rx={6}
                    />
                    {/* Coin PFP image */}
                    {coin.image && !failedImages.has(coin.id) && (
                      <image
                        href={getCoinImage(coin.id, coin.image)}
                        x={tileX}
                        y={tileY}
                        width={tileW}
                        height={tileH}
                        clipPath={`url(#coin-clip-${idx})`}
                        preserveAspectRatio="xMidYMid slice"
                        onError={() => handleImageError(coin.id)}
                      />
                    )}
                    {/* Color overlay based on change */}
                    <rect
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      fill={getChangeColor(coin.change)}
                      rx={6}
                      style={{ opacity: 0.7 }}
                    />
                    {showSymbol && (
                      <text
                        x={tileX + tileW / 2}
                        y={tileY + tileH / 2 - (showMcap ? mcapFontSize / 2 : 0)}
                        fill="white"
                        fontSize={symbolFontSize}
                        fontWeight="700"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      >
                        {coin.symbol}
                      </text>
                    )}
                    {showMcap && (
                      <text
                        x={tileX + tileW / 2}
                        y={tileY + tileH / 2 + symbolFontSize / 2 + 4}
                        fill="white"
                        fontSize={mcapFontSize}
                        fontWeight="600"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      >
                        ${formatCompactNumber(coin.marketCap)}
                      </text>
                    )}
                  </g>
                </a>
              );
            })
          ) : (
            // Sectors heatmap
            sectorRects.map((rect) => {
              const sector = rect.data;
              const tileX = rect.x + padding;
              const tileY = rect.y + padding;
              const tileW = Math.max(rect.width - padding * 2, 0);
              const tileH = Math.max(rect.height - padding * 2, 0);
              const minDim = Math.min(tileW, tileH);

              const showName = minDim > 40;
              const showMcap = minDim > 70;

              const nameFontSize = Math.min(Math.max(minDim / 5, 11), 16);
              const mcapFontSize = Math.min(Math.max(minDim / 7, 9), 12);

              return (
                <g key={sector.id}>
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill={getSectorColor(sector.name)}
                    rx={6}
                    style={{ cursor: 'default' }}
                  />
                  {showName && (
                    <text
                      x={tileX + 8}
                      y={tileY + nameFontSize + 6}
                      fill="white"
                      fontSize={nameFontSize}
                      fontWeight="700"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {sector.name.length > Math.floor(tileW / 8)
                        ? sector.name.slice(0, Math.floor(tileW / 8)) + '…'
                        : sector.name}
                    </text>
                  )}
                  {showMcap && (
                    <text
                      x={tileX + 8}
                      y={tileY + nameFontSize + mcapFontSize + 10}
                      fill="rgba(255,255,255,0.9)"
                      fontSize={mcapFontSize}
                      fontWeight="600"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      ${formatCompactNumber(sector.marketCap)}
                    </text>
                  )}
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
}
