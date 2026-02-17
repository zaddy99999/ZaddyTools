'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { formatCompactNumber } from '@/lib/crypto/formatters';

interface NFTCollection {
  slug: string;
  name: string;
  image: string;
  floorPrice: number;
  floorPriceSymbol: string;
  change: number;
  volume: number;
  marketCap: number;
  url: string;
}

type TimePeriod = '24h' | '7d' | '30d';

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

export default function NFTTreemap() {
  const [period, setPeriod] = useState<TimePeriod>('7d');

  const { data: collections, isLoading } = useSWR<NFTCollection[]>(
    `/api/crypto/nfts?period=${period}`,
    fetcher,
    { refreshInterval: 300000 }
  );

  const containerHeight = 280;
  const padding = 2;
  const svgWidth = 600;
  const svgHeight = containerHeight;

  const nftRects = useMemo(() => {
    if (!collections || collections.length === 0) return [];
    const topNFTs = collections.slice(0, 15);
    const items = topNFTs.map(nft => ({
      value: Math.sqrt(nft.volume || 1),
      data: {
        slug: nft.slug,
        name: nft.name,
        image: nft.image,
        volume: nft.volume,
        change: nft.change ?? 0,
        floorPrice: nft.floorPrice,
        floorPriceSymbol: nft.floorPriceSymbol,
        url: nft.url,
      }
    }));
    return createTreemap(items, svgWidth, svgHeight);
  }, [collections]);

  if (isLoading) {
    return (
      <div className="widget-card">
        <div className="heatmap-header-row">
          <p className="widget-label" style={{ margin: 0 }}>NFT Heatmap</p>
        </div>
        <div className="skeleton" style={{ height: containerHeight }} />
      </div>
    );
  }

  if (!collections || collections.length === 0) {
    return (
      <div className="widget-card">
        <div className="heatmap-header-row">
          <p className="widget-label" style={{ margin: 0 }}>NFT Heatmap</p>
        </div>
        <p className="widget-empty">No data available</p>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <div className="heatmap-header-row">
        <p className="widget-label" style={{ margin: 0 }}>NFT Heatmap</p>
        <div className="heatmap-toggles">
          {(['24h', '7d', '30d'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              className={`heatmap-toggle ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: containerHeight, position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
          preserveAspectRatio="none"
        >
          {nftRects.map((rect) => {
            const nft = rect.data;
            const tileX = rect.x + padding;
            const tileY = rect.y + padding;
            const tileW = Math.max(rect.width - padding * 2, 0);
            const tileH = Math.max(rect.height - padding * 2, 0);
            const minDim = Math.min(tileW, tileH);

            const showName = minDim > 35;
            const showVolume = minDim > 50;

            const nameFontSize = Math.min(Math.max(minDim / 5, 9), 14);
            const volumeFontSize = Math.min(Math.max(minDim / 6, 8), 12);

            // Truncate name to fit
            const maxChars = Math.floor(tileW / (nameFontSize * 0.6));
            const displayName = nft.name.length > maxChars ? nft.name.slice(0, maxChars - 1) + '...' : nft.name;

            return (
              <a
                key={nft.slug}
                href={nft.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <g style={{ cursor: 'pointer' }}>
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill={getChangeColor(nft.change)}
                    rx={6}
                  />
                  {showName && (
                    <text
                      x={tileX + tileW / 2}
                      y={tileY + tileH / 2 - (showVolume ? volumeFontSize / 2 : 0)}
                      fill="white"
                      fontSize={nameFontSize}
                      fontWeight="700"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {displayName}
                    </text>
                  )}
                  {showVolume && (
                    <text
                      x={tileX + tileW / 2}
                      y={tileY + tileH / 2 + nameFontSize / 2 + 4}
                      fill="white"
                      fontSize={volumeFontSize}
                      fontWeight="600"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {formatCompactNumber(nft.volume)} ETH
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
          href="https://opensea.io/rankings"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from OpenSea
        </a>
      </div>
    </div>
  );
}
