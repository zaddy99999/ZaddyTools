'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

interface NFTCollection {
  name: string;
  slug: string;
  image: string;
  floorPrice: number;
  floorPriceUsd: number;
  marketCap: number;
  volume24h: number;
  volumeChange24h: number;
  volumeChange7d: number;
  volumeChange30d: number;
  sales24h: number;
  owners: number;
  supply: number;
}

interface Token {
  name: string;
  symbol: string;
  address: string;
  image: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  volume24h: number;
  marketCap: number;
  holders: number;
}


// Squarified Treemap Algorithm
interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
  data: any;
}

function squarify(
  items: { value: number; data: any }[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, width, height, data: items[0].data }];
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return [];

  const results: TreemapRect[] = [];
  let currentRow: { value: number; data: any }[] = [];
  let currentX = x;
  let currentY = y;
  let remainingWidth = width;
  let remainingHeight = height;

  // Sort by value descending
  const sorted = [...items].sort((a, b) => b.value - a.value);

  for (const item of sorted) {
    currentRow.push(item);

    const rowTotal = currentRow.reduce((sum, i) => sum + i.value, 0);
    const remainingTotal = total - (results.length > 0 ? results.reduce((sum, r) => {
      const itemVal = sorted.find(s => s.data === r.data)?.value || 0;
      return sum + itemVal;
    }, 0) : 0);

    // Decide layout direction based on aspect ratio
    const isHorizontal = remainingWidth >= remainingHeight;

    if (currentRow.length >= 2 || item === sorted[sorted.length - 1]) {
      // Layout this row
      const rowFraction = rowTotal / (remainingTotal || 1);

      if (isHorizontal) {
        const rowWidth = remainingWidth * Math.min(rowFraction, 1);
        let itemY = currentY;

        for (const rowItem of currentRow) {
          const itemFraction = rowItem.value / rowTotal;
          const itemHeight = remainingHeight * itemFraction;
          results.push({
            x: currentX,
            y: itemY,
            width: rowWidth,
            height: itemHeight,
            data: rowItem.data,
          });
          itemY += itemHeight;
        }
        currentX += rowWidth;
        remainingWidth -= rowWidth;
      } else {
        const rowHeight = remainingHeight * Math.min(rowFraction, 1);
        let itemX = currentX;

        for (const rowItem of currentRow) {
          const itemFraction = rowItem.value / rowTotal;
          const itemWidth = remainingWidth * itemFraction;
          results.push({
            x: itemX,
            y: currentY,
            width: itemWidth,
            height: rowHeight,
            data: rowItem.data,
          });
          itemX += itemWidth;
        }
        currentY += rowHeight;
        remainingHeight -= rowHeight;
      }
      currentRow = [];
    }
  }

  return results;
}

// Squarified treemap algorithm - optimizes for square-ish tiles
function createTreemap(
  items: { value: number; data: any }[],
  containerWidth: number,
  containerHeight: number
): TreemapRect[] {
  const total = items.reduce((sum, item) => sum + Math.max(item.value, 0.001), 0);
  if (total === 0 || items.length === 0) return [];

  // Normalize and sort by value descending
  const normalized = items
    .map(item => ({
      value: Math.max(item.value, 0.001) / total,
      data: item.data,
    }))
    .sort((a, b) => b.value - a.value);

  const rects: TreemapRect[] = [];

  // Recursive squarify
  function squarifyRecursive(
    items: typeof normalized,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (items.length === 0) return;
    if (items.length === 1) {
      rects.push({ x, y, width, height, data: items[0].data });
      return;
    }

    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    const isWide = width >= height;
    const side = isWide ? height : width;

    // Find the best row that minimizes worst aspect ratio
    let bestRow: typeof normalized = [];
    let bestWorstAspect = Infinity;
    let bestRowValue = 0;

    let currentRow: typeof normalized = [];
    let currentRowValue = 0;

    for (let i = 0; i < items.length; i++) {
      currentRow.push(items[i]);
      currentRowValue += items[i].value;

      // Calculate the strip size for this row
      const stripSize = (currentRowValue / totalValue) * (isWide ? width : height);

      // Calculate aspect ratios for all items in this row
      let worstAspect = 0;
      for (const item of currentRow) {
        const itemSize = (item.value / currentRowValue) * side;
        const aspect = Math.max(stripSize / itemSize, itemSize / stripSize);
        worstAspect = Math.max(worstAspect, aspect);
      }

      // If this is better or equal, keep it
      if (worstAspect <= bestWorstAspect) {
        bestWorstAspect = worstAspect;
        bestRow = [...currentRow];
        bestRowValue = currentRowValue;
      } else {
        // Getting worse, stop adding to row
        break;
      }
    }

    // Layout the best row
    const stripFraction = bestRowValue / totalValue;

    if (isWide) {
      const stripWidth = width * stripFraction;
      let itemY = y;

      for (const item of bestRow) {
        const itemHeight = side * (item.value / bestRowValue);
        rects.push({ x, y: itemY, width: stripWidth, height: itemHeight, data: item.data });
        itemY += itemHeight;
      }

      // Recurse with remaining items
      const remaining = items.slice(bestRow.length);
      if (remaining.length > 0) {
        squarifyRecursive(remaining, x + stripWidth, y, width - stripWidth, height);
      }
    } else {
      const stripHeight = height * stripFraction;
      let itemX = x;

      for (const item of bestRow) {
        const itemWidth = side * (item.value / bestRowValue);
        rects.push({ x: itemX, y, width: itemWidth, height: stripHeight, data: item.data });
        itemX += itemWidth;
      }

      // Recurse with remaining items
      const remaining = items.slice(bestRow.length);
      if (remaining.length > 0) {
        squarifyRecursive(remaining, x, y + stripHeight, width, height - stripHeight);
      }
    }
  }

  squarifyRecursive(normalized, 0, 0, containerWidth, containerHeight);
  return rects;
}

// Heatmap component for NFTs
function NFTHeatmap({ collections, scaleType = 'balanced' }: { collections: NFTCollection[]; scaleType?: 'equal' | 'balanced' | 'proportional' }) {
  const containerWidth = 900;
  const containerHeight = 500;
  const padding = 3; // Gap between tiles
  const borderWidth = 8; // Frame border

  if (collections.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>Loading NFT data...</div>;
  }

  // Filter out collections with no meaningful market cap
  const validCollections = collections.filter(c => c.marketCap > 1000);

  if (validCollections.length === 0) {
    return <div style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>No NFT data available</div>;
  }

  // Create treemap data based on scale type
  const treemapItems = validCollections.map(c => {
    let value: number;
    switch (scaleType) {
      case 'equal':
        value = 1; // All tiles same size
        break;
      case 'proportional':
        value = Math.max(c.marketCap, 1000); // Linear - direct proportion
        break;
      case 'balanced':
      default:
        value = Math.sqrt(Math.max(c.marketCap, 1000)); // Sqrt - middle ground
        break;
    }
    return { value, data: c };
  });

  const innerWidth = containerWidth - borderWidth * 2;
  const innerHeight = containerHeight - borderWidth * 2;
  const rects = createTreemap(treemapItems, innerWidth, innerHeight);

  // Format USD value for market cap
  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: containerWidth,
      margin: '0 auto',
      aspectRatio: `${containerWidth} / ${containerHeight}`,
      background: '#5b7fb5', // Blue frame like reference
      borderRadius: '16px',
      padding: borderWidth,
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        background: '#e8eef5',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <svg
          viewBox={`0 0 ${innerWidth} ${innerHeight}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            {rects.map((rect, index) => (
              <clipPath key={`nft-clip-${index}`} id={`nft-tile-${index}`}>
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
          {rects.map((rect, index) => {
            const collection = rect.data as NFTCollection;
            const hasImage = collection.image;

            const tileX = rect.x + padding;
            const tileY = rect.y + padding;
            const tileW = Math.max(rect.width - padding * 2, 0);
            const tileH = Math.max(rect.height - padding * 2, 0);
            const minDim = Math.min(tileW, tileH);

            const showName = minDim > 50;
            const showValue = minDim > 60;

            const nameFontSize = Math.min(Math.max(minDim / 6, 10), 16);
            const valueFontSize = Math.min(Math.max(minDim / 8, 9), 14);

            return (
              <g key={collection.slug}>
                <a
                  href={`https://opensea.io/collection/${collection.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* Base tile */}
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill="#1a1a2e"
                    rx={6}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Background image - fills whole tile */}
                  {hasImage && (
                    <image
                      href={collection.image}
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      clipPath={`url(#nft-tile-${index})`}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  {/* Dark overlay for text readability */}
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill="rgba(0,0,0,0.4)"
                    rx={6}
                    style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.setAttribute('fill', 'rgba(0,0,0,0.2)')}
                    onMouseLeave={(e) => e.currentTarget.setAttribute('fill', 'rgba(0,0,0,0.4)')}
                  />
                  {/* Text - top left aligned */}
                  {showName && (
                    <text
                      x={tileX + 8}
                      y={tileY + nameFontSize + 6}
                      textAnchor="start"
                      fill="white"
                      fontSize={nameFontSize}
                      fontWeight="700"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                    >
                      {collection.name.length > Math.floor(tileW / 8)
                        ? collection.name.slice(0, Math.floor(tileW / 8)) + '…'
                        : collection.name}
                    </text>
                  )}
                  {showValue && (
                    <>
                      <text
                        x={tileX + 8}
                        y={tileY + nameFontSize + valueFontSize + 10}
                        textAnchor="start"
                        fill="rgba(255,255,255,0.9)"
                        fontSize={valueFontSize}
                        fontWeight="600"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {formatUsd(collection.marketCap)}
                      </text>
                      {collection.floorPrice > 0 && minDim > 80 && (
                        <text
                          x={tileX + 8}
                          y={tileY + nameFontSize + valueFontSize * 2 + 14}
                          textAnchor="start"
                          fill="rgba(46, 219, 132, 0.9)"
                          fontSize={valueFontSize * 0.9}
                          fontWeight="500"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          Floor: {collection.floorPrice.toFixed(4)} ETH
                        </text>
                      )}
                    </>
                  )}
                </a>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="heatmap-watermark">Powered by ZaddyTools</div>
    </div>
  );
}

// Heatmap component for Tokens
function TokenHeatmap({ tokens, scaleType = 'balanced' }: { tokens: Token[]; scaleType?: 'equal' | 'balanced' | 'proportional' }) {
  const containerWidth = 900;
  const containerHeight = 500;
  const padding = 3; // Gap between tiles
  const borderWidth = 8; // Frame border

  if (tokens.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>Loading token data...</div>;
  }

  // Filter out tokens with no meaningful market cap
  const validTokens = tokens.filter(t => t.marketCap > 1000);

  if (validTokens.length === 0) {
    return <div style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>No token data available</div>;
  }

  // Create treemap data based on scale type
  const treemapItems = validTokens.map(t => {
    let value: number;
    switch (scaleType) {
      case 'equal':
        value = 1; // All tiles same size
        break;
      case 'proportional':
        value = Math.max(t.marketCap, 1000); // Linear - direct proportion
        break;
      case 'balanced':
      default:
        value = Math.sqrt(Math.max(t.marketCap, 1000)); // Sqrt - middle ground
        break;
    }
    return { value, data: t };
  });

  const innerWidth = containerWidth - borderWidth * 2;
  const innerHeight = containerHeight - borderWidth * 2;
  const rects = createTreemap(treemapItems, innerWidth, innerHeight);

  // Format USD value
  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: containerWidth,
      margin: '0 auto',
      aspectRatio: `${containerWidth} / ${containerHeight}`,
      background: '#d4a574', // Warm beige/peach frame like reference
      borderRadius: '16px',
      padding: borderWidth,
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        background: '#f5e6d3',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <svg
          viewBox={`0 0 ${innerWidth} ${innerHeight}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            {rects.map((rect, index) => (
              <clipPath key={`clip-${index}`} id={`token-tile-${index}`}>
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
          {rects.map((rect, index) => {
            const token = rect.data as Token;
            const hasImage = token.image && token.image.length > 0;

            const tileX = rect.x + padding;
            const tileY = rect.y + padding;
            const tileW = Math.max(rect.width - padding * 2, 0);
            const tileH = Math.max(rect.height - padding * 2, 0);
            const minDim = Math.min(tileW, tileH);

            const showName = minDim > 40;
            const showValue = minDim > 55;

            const nameFontSize = Math.min(Math.max(minDim / 5, 12), 20);
            const valueFontSize = Math.min(Math.max(minDim / 7, 10), 14);

            // Generate gradient colors based on token name
            const hue = token.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
            const gradientId = `token-gradient-${index}`;

            return (
              <g key={token.address + index}>
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={`hsl(${hue}, 60%, 35%)`} />
                    <stop offset="100%" stopColor={`hsl(${(hue + 30) % 360}, 50%, 20%)`} />
                  </linearGradient>
                </defs>
                <a
                  href={`https://dexscreener.com/abstract/${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* Base tile with gradient */}
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill={hasImage ? '#1a1a2e' : `url(#${gradientId})`}
                    rx={8}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Background image if available */}
                  {hasImage && (
                    <image
                      href={token.image}
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      clipPath={`url(#token-tile-${index})`}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  {/* Gradient overlay for text readability - darker at top left */}
                  <defs>
                    <linearGradient id={`overlay-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(0,0,0,0.7)" />
                      <stop offset="50%" stopColor="rgba(0,0,0,0.2)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
                    </linearGradient>
                  </defs>
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill={hasImage ? `url(#overlay-${index})` : 'rgba(0,0,0,0.15)'}
                    rx={8}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Token symbol - top left */}
                  {showName && (
                    <text
                      x={tileX + 8}
                      y={tileY + nameFontSize + 4}
                      textAnchor="start"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={nameFontSize}
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                    >
                      {token.symbol}
                    </text>
                  )}
                  {showValue && (
                    <text
                      x={tileX + 8}
                      y={tileY + nameFontSize + valueFontSize + 8}
                      textAnchor="start"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.9)"
                      fontSize={valueFontSize}
                      fontWeight="600"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                    >
                      {formatUsd(token.marketCap)}
                    </text>
                  )}
                </a>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="heatmap-watermark">Powered by ZaddyTools</div>
    </div>
  );
}

const CACHE_KEY = 'abstract-dashboard-cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

type ScaleType = 'equal' | 'balanced' | 'proportional';

export default function AbstractDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState<NFTCollection[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeTab, setActiveTab] = useState<'nfts' | 'tokens'>('nfts');
  const [showCount, setShowCount] = useState<10 | 20>(20);
  const [scaleType, setScaleType] = useState<ScaleType>('balanced');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    // Try to load cached data first for instant display
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { nfts: cachedNfts, tokens: cachedTokens, timestamp } = JSON.parse(cached);
        if (cachedNfts?.length > 0 || cachedTokens?.length > 0) {
          setNfts(cachedNfts || []);
          setTokens(cachedTokens || []);
          setLastUpdated(new Date(timestamp).toLocaleTimeString() + ' (cached)');
          setLoading(false);
        }
      }
    } catch {
      // Ignore cache errors
    }

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/abstract-stats');
      const data = await response.json();
      setNfts(data.nfts || []);
      setTokens(data.tokens || []);
      setLastUpdated(new Date().toLocaleTimeString());

      // Cache the data for instant loading next time
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          nfts: data.nfts || [],
          tokens: data.tokens || [],
          timestamp: Date.now(),
        }));
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      {/* Banner Header */}
      <div className="banner-header">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/ZaddyPFP.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
            <div>
              <h1 style={{ marginBottom: 0 }}>ZaddyTools</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Abstract Dashboard</p>
            </div>
          </div>
          <NavBar />
        </div>
      </div>

      {/* Heatmap */}
      <div className="card" style={{ marginBottom: '1rem', minHeight: 400, padding: '1rem' }}>
        {/* Total Market Cap Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
              {activeTab === 'nfts' ? 'Abstract NFT' : 'Abstract Token'} Total Market Cap
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2edb84' }}>
              {activeTab === 'nfts'
                ? `$${(nfts.reduce((sum, n) => sum + n.marketCap, 0) / 1000000).toFixed(2)}M`
                : `$${(tokens.reduce((sum, t) => sum + t.marketCap, 0) / 1000000).toFixed(2)}M`
              }
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
              {activeTab === 'nfts' ? 'Collections' : 'Tokens'}
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>
              {activeTab === 'nfts' ? nfts.length : tokens.length}
            </div>
          </div>
        </div>

        {/* Heatmap + All Controls on Right */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {/* Heatmap Container */}
          <div style={{ flex: 1 }}>
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300,
                color: 'rgba(255,255,255,0.5)',
              }}>
                Loading heatmap data...
              </div>
            ) : activeTab === 'nfts' ? (
              <NFTHeatmap collections={nfts.slice(0, showCount)} scaleType={scaleType} />
            ) : (
              <TokenHeatmap tokens={tokens.slice(0, showCount)} scaleType={scaleType} />
            )}
          </div>

          {/* All Controls - Right Side */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            paddingTop: '0.25rem',
          }}>
            {/* Type Toggle */}
            <div>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>Type</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  onClick={() => setActiveTab('nfts')}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: activeTab === 'nfts' ? '#2edb84' : 'rgba(0,0,0,0.6)',
                    color: activeTab === 'nfts' ? '#000' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  NFTs
                </button>
                <button
                  onClick={() => setActiveTab('tokens')}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: activeTab === 'tokens' ? '#2edb84' : 'rgba(0,0,0,0.6)',
                    color: activeTab === 'tokens' ? '#000' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tokens
                </button>
              </div>
            </div>

            {/* Count Toggle */}
            <div>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>Count</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  onClick={() => setShowCount(10)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: showCount === 10 ? '#2edb84' : 'rgba(0,0,0,0.6)',
                    color: showCount === 10 ? '#000' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.7rem',
                  }}
                >
                  10
                </button>
                <button
                  onClick={() => setShowCount(20)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: showCount === 20 ? '#2edb84' : 'rgba(0,0,0,0.6)',
                    color: showCount === 20 ? '#000' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.7rem',
                  }}
                >
                  20
                </button>
              </div>
            </div>

            {/* Scale Controls */}
            <div>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>Scale</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  onClick={() => setScaleType('equal')}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: scaleType === 'equal' ? '#2edb84' : 'rgba(0,0,0,0.6)',
                    color: scaleType === 'equal' ? '#000' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Equal
                </button>
                <button
                  onClick={() => setScaleType('balanced')}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: scaleType === 'balanced' ? '#2edb84' : 'rgba(0,0,0,0.6)',
                    color: scaleType === 'balanced' ? '#000' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Balanced
                </button>
                <button
                  onClick={() => setScaleType('proportional')}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: scaleType === 'proportional' ? '#2edb84' : 'rgba(0,0,0,0.6)',
                    color: scaleType === 'proportional' ? '#000' : 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Proportional
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Section - Side by Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginTop: '1.5rem',
      }}>
        {/* NFT Leaderboard */}
        <div style={{
          background: '#000',
          borderRadius: '12px',
          border: '1px solid rgba(46, 219, 132, 0.2)',
          padding: '1rem',
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            color: '#2edb84',
          }}>
            Top Abstract NFTs
          </h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Collection</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Floor</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>MCap</th>
                </tr>
              </thead>
              <tbody>
                {nfts.slice(0, 15).map((nft, index) => (
                  <tr
                    key={nft.slug}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(`https://opensea.io/collection/${nft.slug}`, '_blank')}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{index + 1}</td>
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <img
                          src={nft.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(nft.name)}&background=1a1a1a&color=2edb84&size=44`}
                          alt={nft.name}
                          style={{ width: 22, height: 22, borderRadius: '4px' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nft.name)}&background=1a1a1a&color=2edb84&size=44`;
                          }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{nft.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', textAlign: 'right' }}>
                      {nft.floorPrice > 0 ? `${nft.floorPrice.toFixed(3)}` : '-'}
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', textAlign: 'right' }}>
                      {nft.marketCap >= 1000000 ? `$${(nft.marketCap / 1000000).toFixed(1)}M` : nft.marketCap >= 1000 ? `$${(nft.marketCap / 1000).toFixed(0)}K` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Token Leaderboard */}
        <div style={{
          background: '#000',
          borderRadius: '12px',
          border: '1px solid rgba(46, 219, 132, 0.2)',
          padding: '1rem',
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            color: '#2edb84',
          }}>
            Top Abstract Tokens
          </h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Token</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>24h</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>MCap</th>
                </tr>
              </thead>
              <tbody>
                {tokens.slice(0, 15).map((token, index) => (
                  <tr
                    key={token.address}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(`https://dexscreener.com/abstract/${token.address}`, '_blank')}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{index + 1}</td>
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <img
                          src={token.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(token.symbol)}&background=1a1a1a&color=2edb84&size=44`}
                          alt={token.name}
                          style={{ width: 22, height: 22, borderRadius: '50%' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(token.symbol)}&background=1a1a1a&color=2edb84&size=44`;
                          }}
                        />
                        <span>{token.symbol}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', textAlign: 'right' }}>
                      {token.price < 0.01 ? `$${token.price.toFixed(5)}` : `$${token.price.toFixed(3)}`}
                    </td>
                    <td style={{
                      padding: '0.5rem 0.25rem',
                      fontSize: '0.75rem',
                      textAlign: 'right',
                      color: token.priceChange24h >= 0 ? '#2edb84' : '#ff6b6b',
                    }}>
                      {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', textAlign: 'right' }}>
                      {token.marketCap >= 1000000 ? `$${(token.marketCap / 1000000).toFixed(1)}M` : token.marketCap >= 1000 ? `$${(token.marketCap / 1000).toFixed(0)}K` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </main>
  );
}
