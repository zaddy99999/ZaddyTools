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

type ViewMode = 'nft' | 'meme';
type TimePeriod = '24h' | '7d' | '30d';
type SizeMetric = 'marketCap' | 'volume';

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

// Whitelist of memecoins with local PFP fallbacks
const MEMECOIN_WHITELIST: Record<string, string> = {
  'dogecoin': '/memes/doge.png',
  'shiba-inu': '/memes/shib.png',
  'pepe': '/memes/pepe.png',
  'dogwifcoin': '/memes/wif.png',
  'bonk': '/memes/bonk.png',
  'floki': '/memes/floki.png',
  'brett': '/memes/brett.png',
  'popcat': '/memes/popcat.png',
  'mog-coin': '/memes/mog.png',
  'cat-in-a-dogs-world': '/memes/mew.png',
  'book-of-meme': '/memes/bome.png',
  'dogs-2': '/memes/dogs.png',
  'neiro-3': '/memes/neiro.png',
  'turbo': '/memes/turbo.png',
  'gigachad-2': '/memes/giga.png',
  'fartcoin': '/memes/fartcoin.png',
  'goatseus-maximus': '/memes/goat.png',
  'peanut-the-squirrel': '/memes/pnut.png',
  'ai16z': '/memes/ai16z.png',
  'spx6900': '/memes/spx.png',
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

export default function CryptoHeatmap() {
  const [viewMode, setViewMode] = useState<ViewMode>('nft');
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>('marketCap');

  const { data: nftCollections, isLoading: nftLoading } = useSWR<NFTCollection[]>(
    `/api/crypto/nfts?period=${period}`,
    fetcher,
    { refreshInterval: 300000 }
  );

  const { data: memecoins, isLoading: memeLoading } = useSWR<MemeCoin[]>(
    '/api/crypto/memecoins',
    fetcher,
    { refreshInterval: 120000 }
  );

  const containerHeight = 280;
  const padding = 2;
  const svgWidth = 600;
  const svgHeight = containerHeight;

  const isLoading = viewMode === 'nft' ? nftLoading : memeLoading;

  const nftRects = useMemo(() => {
    if (!nftCollections || nftCollections.length === 0) return [];
    const topNFTs = nftCollections.slice(0, 15);
    const items = topNFTs.map(nft => {
      const sizeValue = sizeMetric === 'marketCap' ? (nft.marketCap || 1) : (nft.volume || 1);
      return {
        value: Math.sqrt(sizeValue),
        data: {
          slug: nft.slug,
          name: nft.name,
          image: nft.image,
          volume: nft.volume,
          marketCap: nft.marketCap,
          change: nft.change ?? 0,
          floorPrice: nft.floorPrice,
          floorPriceSymbol: nft.floorPriceSymbol,
          url: nft.url,
        }
      };
    });
    return createTreemap(items, svgWidth, svgHeight);
  }, [nftCollections, sizeMetric]);

  const memeRects = useMemo(() => {
    if (!memecoins || memecoins.length === 0) return [];
    const topMemes = memecoins.slice(0, 15);
    const items = topMemes.map(coin => {
      const sizeValue = sizeMetric === 'marketCap' ? coin.market_cap : (coin.total_volume || 0);
      return {
        value: Math.sqrt(sizeValue),
        data: {
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          image: MEMECOIN_WHITELIST[coin.id] || coin.image,
          marketCap: coin.market_cap,
          volume: coin.total_volume || 0,
          change: coin.price_change_percentage_24h ?? 0,
        }
      };
    });
    return createTreemap(items, svgWidth, svgHeight);
  }, [memecoins, sizeMetric]);

  const hasData = viewMode === 'nft'
    ? nftCollections && nftCollections.length > 0
    : memecoins && memecoins.length > 0;

  if (isLoading) {
    return (
      <div className="widget-card">
        <div className="heatmap-header-row">
          <p className="widget-label" style={{ margin: 0 }}>NFT / Meme Heatmap</p>
        </div>
        <div className="skeleton" style={{ height: containerHeight }} />
      </div>
    );
  }

  return (
    <div className="widget-card">
      <div className="heatmap-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <p className="widget-label" style={{ margin: 0 }}>NFT / Meme Heatmap</p>
          <div className="heatmap-toggles">
            <button
              className={`heatmap-toggle ${viewMode === 'nft' ? 'active' : ''}`}
              onClick={() => setViewMode('nft')}
            >
              NFT
            </button>
            <button
              className={`heatmap-toggle ${viewMode === 'meme' ? 'active' : ''}`}
              onClick={() => setViewMode('meme')}
            >
              Meme
            </button>
          </div>
          <div className="heatmap-toggles">
            <button
              className={`heatmap-toggle ${sizeMetric === 'marketCap' ? 'active' : ''}`}
              onClick={() => setSizeMetric('marketCap')}
            >
              MCap
            </button>
            <button
              className={`heatmap-toggle ${sizeMetric === 'volume' ? 'active' : ''}`}
              onClick={() => setSizeMetric('volume')}
            >
              Volume
            </button>
          </div>
        </div>
        <div className="heatmap-toggles">
          {viewMode === 'nft' && (['24h', '7d', '30d'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              className={`heatmap-toggle ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
          {viewMode === 'meme' && (
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>24h change</span>
          )}
        </div>
      </div>

      {!hasData ? (
        <p className="widget-empty">No data available</p>
      ) : (
        <div style={{ width: '100%', height: containerHeight, position: 'relative' }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
            preserveAspectRatio="none"
          >
            <defs>
              {viewMode === 'nft' && nftRects.map((rect, idx) => (
                <clipPath key={`nft-clip-${idx}`} id={`nft-clip-${idx}`}>
                  <rect
                    x={rect.x + padding}
                    y={rect.y + padding}
                    width={Math.max(rect.width - padding * 2, 0)}
                    height={Math.max(rect.height - padding * 2, 0)}
                    rx={6}
                  />
                </clipPath>
              ))}
              {viewMode === 'meme' && memeRects.map((rect, idx) => (
                <clipPath key={`meme-clip-${idx}`} id={`meme-clip-${idx}`}>
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

            {viewMode === 'nft' && nftRects.map((rect, idx) => {
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
                    {/* Background with PFP */}
                    <rect
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      fill="#1a1a2e"
                      rx={6}
                    />
                    {nft.image && (
                      <image
                        href={nft.image}
                        x={tileX}
                        y={tileY}
                        width={tileW}
                        height={tileH}
                        clipPath={`url(#nft-clip-${idx})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    )}
                    {/* Color overlay based on change */}
                    <rect
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      fill={getChangeColor(nft.change)}
                      rx={6}
                      style={{ opacity: 0.7 }}
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
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
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
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      >
                        {formatCompactNumber(nft.volume)} ETH
                      </text>
                    )}
                  </g>
                </a>
              );
            })}

            {viewMode === 'meme' && memeRects.map((rect, idx) => {
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
                    {/* Background with PFP */}
                    <rect
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      fill="#1a1a2e"
                      rx={6}
                    />
                    {coin.image && (
                      <image
                        href={coin.image}
                        x={tileX}
                        y={tileY}
                        width={tileW}
                        height={tileH}
                        clipPath={`url(#meme-clip-${idx})`}
                        preserveAspectRatio="xMidYMid slice"
                        onError={(e) => {
                          // Fallback handled by whitelist
                          (e.target as SVGImageElement).style.display = 'none';
                        }}
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
            })}
          </svg>
        </div>
      )}

      <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
        <a
          href={viewMode === 'nft' ? 'https://opensea.io/rankings' : 'https://www.coingecko.com/en/categories/meme-token'}
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from {viewMode === 'nft' ? 'OpenSea' : 'CoinGecko'}
        </a>
      </div>
    </div>
  );
}
