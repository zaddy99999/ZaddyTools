'use client';

import { useState, useEffect, useRef } from 'react';
import NavBar from '@/components/NavBar';
import ErrorBoundary from '@/components/ErrorBoundary';

// 3D Animated Tier Card Component
interface TierCardProps {
  name: string;
  count: number;
  pct: string;
  className: string;
}

function TierCard({ name, count, pct, className }: TierCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glint, setGlint] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    const x = (e.clientY - rect.top) / rect.height;
    const y = (e.clientX - rect.left) / rect.width;
    const multiplier = 15;

    setRotate({
      x: (x - 0.5) * multiplier * -1,
      y: (y - 0.5) * multiplier
    });

    setGlint({ x: y * 100, y: x * 100 });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlint({ x: 50, y: 50 });
  };

  return (
    <div className="tier-card-wrapper">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`tier-card ${className}`}
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        }}
      >
        <div
          className="tier-card-glint"
          style={{
            background: `radial-gradient(circle at ${glint.x}% ${glint.y}%, white 0%, transparent 60%)`
          }}
        />
        <div className="tier-card-content">
          <div className="tier-card-header">
            <div>
              <span className="tier-card-label">{name} Tier</span>
              <div className="tier-card-divider" />
            </div>
            <img
              src="/AbsLogoWhite.png"
              alt="Abstract"
              style={{
                width: '28px',
                height: '28px',
                opacity: className === 'obsidian' ? 0.7 : 0.4,
                filter: className === 'obsidian' ? 'none' : 'invert(1) brightness(0.3)',
              }}
            />
          </div>
          <div>
            <p className="tier-card-count">
              {count.toLocaleString()}
            </p>
            <div className="tier-card-footer">
              <div>
                <span className="tier-card-meta-label">Percentage</span>
                <span className="tier-card-meta-value">{pct}%</span>
              </div>
              <div className="tier-card-logo">
                <div className="tier-card-logo-circle" />
                <div className="tier-card-logo-circle" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
                          Floor: {(collection.floorPrice ?? 0).toFixed(4)} ETH
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
                  {/* Light overlay for text readability */}
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill={hasImage ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'}
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

interface EliteWallet {
  id: string;
  wallet: string;
  name: string;
  tier: number;
  tierV2: number;
  badges: number;
  streaming: boolean;
}

export default function AbstractDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState<NFTCollection[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeTab, setActiveTab] = useState<'nfts' | 'tokens'>('nfts');
  const [showCount, setShowCount] = useState<10 | 20>(20);
  const [scaleType, setScaleType] = useState<ScaleType>('balanced');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [eliteWallets, setEliteWallets] = useState<{ obsidian: EliteWallet[], diamond: EliteWallet[] }>({ obsidian: [], diamond: [] });
  const [eliteTab, setEliteTab] = useState<'obsidian' | 'diamond'>('obsidian');

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
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
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

  // Fetch elite wallets
  useEffect(() => {
    const fetchEliteWallets = async () => {
      try {
        const [obsidianRes, diamondRes] = await Promise.all([
          fetch('/data/wallets-obsidian.json'),
          fetch('/data/wallets-diamond.json'),
        ]);
        const obsidian = await obsidianRes.json();
        const diamond = await diamondRes.json();
        setEliteWallets({ obsidian, diamond });
      } catch (err) {
        console.error('Error fetching elite wallets:', err);
      }
    };
    fetchEliteWallets();
  }, []);

  return (
    <ErrorBoundary>
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

      {/* Tier Stats - 3D Credit Card Style */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2edb84', margin: 0 }}>Abstract Portal Users</h2>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>1,996,392 Total</span>
          </div>
          {/* Wallet Download Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
              style={{
                background: '#2edb84',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                color: '#000',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(46, 219, 132, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#25c576';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 219, 132, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2edb84';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(46, 219, 132, 0.3)';
              }}
            >
              Download Wallets
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: walletDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {walletDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                background: 'rgba(20, 20, 35, 0.98)',
                border: '1px solid rgba(46, 219, 132, 0.3)',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                zIndex: 100,
                minWidth: '160px',
              }}>
                {[
                  { label: 'Gold (16,566)', url: 'https://docs.google.com/spreadsheets/d/1nqhvjN318kdAnj2C1tbK97t3rQBCowJZhFosfzPrnso/edit#gid=310783987' },
                  { label: 'Platinum (1,332)', url: 'https://docs.google.com/spreadsheets/d/1nqhvjN318kdAnj2C1tbK97t3rQBCowJZhFosfzPrnso/edit#gid=282885419' },
                  { label: 'Diamond (103)', url: 'https://docs.google.com/spreadsheets/d/1nqhvjN318kdAnj2C1tbK97t3rQBCowJZhFosfzPrnso/edit#gid=428215115' },
                  { label: 'Obsidian (11)', url: 'https://docs.google.com/spreadsheets/d/1nqhvjN318kdAnj2C1tbK97t3rQBCowJZhFosfzPrnso/edit#gid=243590580' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      window.open(item.url, '_blank');
                      setWalletDropdownOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.65rem 1rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(46, 219, 132, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {[
            { name: 'Bronze', count: 1797598, pct: '90.04', className: 'bronze' },
            { name: 'Silver', count: 180782, pct: '9.06', className: 'silver' },
            { name: 'Gold', count: 16566, pct: '0.83', className: 'gold' },
            { name: 'Platinum', count: 1332, pct: '0.07', className: 'platinum' },
            { name: 'Diamond', count: 103, pct: '0.01', className: 'diamond' },
            { name: 'Obsidian', count: 11, pct: '0.00', className: 'obsidian' },
          ].map((tier) => (
            <TierCard
              key={tier.name}
              name={tier.name}
              count={tier.count}
              pct={tier.pct}
              className={tier.className}
            />
          ))}

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
                ? `$${(nfts.reduce((sum, n) => sum + (n.marketCap ?? 0), 0) / 1000000).toFixed(2)}M`
                : `$${(tokens.reduce((sum, t) => sum + (t.marketCap ?? 0), 0) / 1000000).toFixed(2)}M`
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
        <div className="abstract-heatmap-layout">
          {/* Heatmap Container */}
          <div className="abstract-heatmap-container">
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
          <div className="abstract-heatmap-controls">
            {/* Type Toggle */}
            <div>
              <span style={{ fontSize: '0.65rem', color: '#2edb84', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  onClick={() => setActiveTab('nfts')}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: activeTab === 'nfts' ? 'none' : '1px solid rgba(46, 219, 132, 0.4)',
                    background: activeTab === 'nfts' ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                    color: activeTab === 'nfts' ? '#000' : 'rgba(255,255,255,0.9)',
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
                    border: activeTab === 'tokens' ? 'none' : '1px solid rgba(46, 219, 132, 0.4)',
                    background: activeTab === 'tokens' ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                    color: activeTab === 'tokens' ? '#000' : 'rgba(255,255,255,0.9)',
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
              <span style={{ fontSize: '0.65rem', color: '#2edb84', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Count</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  onClick={() => setShowCount(10)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: showCount === 10 ? 'none' : '1px solid rgba(46, 219, 132, 0.4)',
                    background: showCount === 10 ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                    color: showCount === 10 ? '#000' : 'rgba(255,255,255,0.9)',
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
                    border: showCount === 20 ? 'none' : '1px solid rgba(46, 219, 132, 0.4)',
                    background: showCount === 20 ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                    color: showCount === 20 ? '#000' : 'rgba(255,255,255,0.9)',
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
              <span style={{ fontSize: '0.65rem', color: '#2edb84', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scale</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  onClick={() => setScaleType('equal')}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: scaleType === 'equal' ? 'none' : '1px solid rgba(46, 219, 132, 0.4)',
                    background: scaleType === 'equal' ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                    color: scaleType === 'equal' ? '#000' : 'rgba(255,255,255,0.9)',
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
                    border: scaleType === 'balanced' ? 'none' : '1px solid rgba(46, 219, 132, 0.4)',
                    background: scaleType === 'balanced' ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                    color: scaleType === 'balanced' ? '#000' : 'rgba(255,255,255,0.9)',
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
                    border: scaleType === 'proportional' ? 'none' : '1px solid rgba(46, 219, 132, 0.4)',
                    background: scaleType === 'proportional' ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                    color: scaleType === 'proportional' ? '#000' : 'rgba(255,255,255,0.9)',
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
      <div className="abstract-leaderboard-grid">
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
                      {(nft.floorPrice ?? 0) > 0 ? `${(nft.floorPrice ?? 0).toFixed(3)}` : '-'}
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', textAlign: 'right' }}>
                      {(nft.marketCap ?? 0) >= 1000000 ? `$${((nft.marketCap ?? 0) / 1000000).toFixed(1)}M` : (nft.marketCap ?? 0) >= 1000 ? `$${((nft.marketCap ?? 0) / 1000).toFixed(0)}K` : '-'}
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
                      {(token.price ?? 0) < 0.01 ? `$${(token.price ?? 0).toFixed(5)}` : `$${(token.price ?? 0).toFixed(3)}`}
                    </td>
                    <td style={{
                      padding: '0.5rem 0.25rem',
                      fontSize: '0.75rem',
                      textAlign: 'right',
                      color: (token.priceChange24h ?? 0) >= 0 ? '#2edb84' : '#ff6b6b',
                    }}>
                      {(token.priceChange24h ?? 0) >= 0 ? '+' : ''}{(token.priceChange24h ?? 0).toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', textAlign: 'right' }}>
                      {(token.marketCap ?? 0) >= 1000000 ? `$${((token.marketCap ?? 0) / 1000000).toFixed(1)}M` : (token.marketCap ?? 0) >= 1000 ? `$${((token.marketCap ?? 0) / 1000).toFixed(0)}K` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Elite Wallets Leaderboard - Combined */}
      <div style={{
        marginTop: '1.5rem',
        background: '#000',
        borderRadius: '12px',
        border: '1px solid rgba(46, 219, 132, 0.2)',
        padding: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2edb84', margin: 0 }}>
            Elite Portal Users
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            {eliteWallets.obsidian.length + eliteWallets.diamond.length} members
          </span>
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {[...eliteWallets.obsidian.map(w => ({ ...w, tierName: 'Obsidian' })), ...eliteWallets.diamond.map(w => ({ ...w, tierName: 'Diamond' }))].map((wallet, index) => (
            <a
              key={wallet.id}
              href={`https://portal.abs.xyz/profile/${wallet.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'background 0.15s',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: '28px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                {index + 1}
              </span>
              <img
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${wallet.wallet}`}
                alt=""
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1a2e' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wallet.name}
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: wallet.tierName === 'Obsidian' ? 'linear-gradient(135deg, #1a1a2e, #3a3a5a)' : 'linear-gradient(135deg, #b9f2ff, #e0f7ff)',
                    color: wallet.tierName === 'Obsidian' ? '#a0a0c0' : '#1a1a2e',
                  }}>
                    {wallet.tierName}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                  {wallet.wallet.slice(0, 6)}...{wallet.wallet.slice(-4)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2edb84' }}>{wallet.badges}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>badges</div>
              </div>
              <div style={{ width: '60px', textAlign: 'center' }}>
                {wallet.streaming ? (
                  <span style={{ fontSize: '0.7rem', color: '#2edb84', fontWeight: 500 }}>Streaming</span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>-</span>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>

      </main>
    </ErrorBoundary>
  );
}
