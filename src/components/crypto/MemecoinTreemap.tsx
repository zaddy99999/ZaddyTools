'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { formatCompactNumber } from '@/lib/crypto/formatters';

interface MemeCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getChangeColor = (change: number): string => {
  if (change >= 20) return 'rgba(34, 197, 94, 0.9)';
  if (change >= 10) return 'rgba(34, 197, 94, 0.7)';
  if (change >= 5) return 'rgba(34, 197, 94, 0.5)';
  if (change >= 0) return 'rgba(34, 197, 94, 0.3)';
  if (change >= -5) return 'rgba(239, 68, 68, 0.3)';
  if (change >= -10) return 'rgba(239, 68, 68, 0.5)';
  if (change >= -20) return 'rgba(239, 68, 68, 0.7)';
  return 'rgba(239, 68, 68, 0.9)';
};

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

export default function MemecoinTreemap() {
  const { data: memecoins, isLoading } = useSWR<MemeCoin[]>(
    '/api/crypto/memecoins',
    fetcher,
    { refreshInterval: 120000 }
  );

  const containerHeight = 280;
  const padding = 2;
  const svgWidth = 600;
  const svgHeight = containerHeight;

  const memeRects = useMemo(() => {
    if (!memecoins || memecoins.length === 0) return [];
    const topMemes = memecoins.slice(0, 15);
    const items = topMemes.map(coin => ({
      value: Math.sqrt(coin.market_cap),
      data: {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        marketCap: coin.market_cap,
        change: coin.price_change_percentage_24h ?? 0,
      }
    }));
    return createTreemap(items, svgWidth, svgHeight);
  }, [memecoins]);

  if (isLoading) {
    return (
      <div className="widget-card">
        <div className="heatmap-header-row">
          <p className="widget-label" style={{ margin: 0 }}>Memecoin Heatmap</p>
        </div>
        <div className="skeleton" style={{ height: containerHeight }} />
      </div>
    );
  }

  if (!memecoins || memecoins.length === 0) {
    return (
      <div className="widget-card">
        <div className="heatmap-header-row">
          <p className="widget-label" style={{ margin: 0 }}>Memecoin Heatmap</p>
        </div>
        <p className="widget-empty">No data available</p>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <div className="heatmap-header-row">
        <p className="widget-label" style={{ margin: 0 }}>Memecoin Heatmap</p>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>24h change</span>
      </div>

      <div style={{ width: '100%', height: containerHeight, position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
          preserveAspectRatio="none"
        >
          {memeRects.map((rect) => {
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

            return (
              <a
                key={coin.id}
                href={`https://www.coingecko.com/en/coins/${coin.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <g style={{ cursor: 'pointer' }}>
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill={getChangeColor(coin.change)}
                    rx={6}
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
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
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
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      ${formatCompactNumber(coin.marketCap)}
                    </text>
                  )}
                </g>
              </a>
            );
          })}
        </svg>
      </div>

      <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
        <a
          href="https://www.coingecko.com/en/categories/meme-token"
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
