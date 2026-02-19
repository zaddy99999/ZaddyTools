'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Tweet } from 'react-tweet';
import NavBar from '@/components/NavBar';
import ErrorBoundary from '@/components/ErrorBoundary';

// Format number to compact form (1.6M, 107K, etc.)
function formatCompact(num: number): string {
  if (num >= 1000000) {
    const val = num / 1000000;
    return val % 1 === 0 ? `${val}M` : `${val.toFixed(1)}M`;
  }
  if (num >= 1000) {
    const val = num / 1000;
    return val % 1 === 0 ? `${val}K` : `${val.toFixed(1)}K`;
  }
  return num.toString();
}

// 3D Animated Tier Card Component
interface TierCardProps {
  name: string;
  count: number;
  pct: string;
  className: string;
  subTiers?: { t1: number; t2: number; t3: number };
}

function TierCard({ name, count, pct, className, subTiers }: TierCardProps) {
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
            {subTiers && (subTiers.t1 > 0 || subTiers.t2 > 0 || subTiers.t3 > 0) && (
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginTop: '0.5rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.65rem',
              }}>
                {subTiers.t1 > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    T1: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{formatCompact(subTiers.t1)}</span>
                  </span>
                )}
                {subTiers.t2 > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    T2: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{formatCompact(subTiers.t2)}</span>
                  </span>
                )}
                {subTiers.t3 > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    T3: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{formatCompact(subTiers.t3)}</span>
                  </span>
                )}
              </div>
            )}
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
  floorPriceChange24h: number | null;
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

  const innerWidth = containerWidth - borderWidth * 2;
  const innerHeight = containerHeight - borderWidth * 2;

  // Memoize treemap calculation to avoid expensive recalculations on every render
  const rects = useMemo(() => {
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

    return createTreemap(treemapItems, innerWidth, innerHeight);
  }, [validCollections, scaleType, innerWidth, innerHeight]);

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
                    <foreignObject
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      clipPath={`url(#nft-tile-${index})`}
                    >
                      <img
                        src={collection.image}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </foreignObject>
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
                  {/* Tile border */}
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                    rx={6}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Text - top left aligned, clipped to tile bounds */}
                  <g clipPath={`url(#nft-tile-${index})`}>
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
                  </g>
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

  const innerWidth = containerWidth - borderWidth * 2;
  const innerHeight = containerHeight - borderWidth * 2;

  // Memoize treemap calculation to avoid expensive recalculations on every render
  const rects = useMemo(() => {
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

    return createTreemap(treemapItems, innerWidth, innerHeight);
  }, [validTokens, scaleType, innerWidth, innerHeight]);

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
                    fill={token.symbol.toUpperCase() === 'CHECK' ? '#000' : (hasImage ? '#1a1a2e' : `url(#${gradientId})`)}
                    rx={8}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Background image - CHAD gets centered smaller logo, others fill tile */}
                  {hasImage && token.symbol.toUpperCase() === 'CHECK' && (
                    <foreignObject
                      x={tileX + tileW * 0.2}
                      y={tileY + tileH * 0.1}
                      width={tileW * 0.6}
                      height={tileH * 0.5}
                    >
                      <img
                        src={token.image}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          cursor: 'pointer',
                          opacity: 0.9,
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </foreignObject>
                  )}
                  {hasImage && token.symbol.toUpperCase() !== 'CHECK' && (
                    <foreignObject
                      x={tileX}
                      y={tileY}
                      width={tileW}
                      height={tileH}
                      clipPath={`url(#token-tile-${index})`}
                    >
                      <img
                        src={token.image}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </foreignObject>
                  )}
                  {/* Light overlay for text readability */}
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill={token.symbol.toUpperCase() === 'CHECK' ? 'rgba(0,0,0,0.3)' : (hasImage ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)')}
                    rx={8}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Tile border */}
                  <rect
                    x={tileX}
                    y={tileY}
                    width={tileW}
                    height={tileH}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                    rx={8}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Token symbol and value - clipped to tile bounds */}
                  <g clipPath={`url(#token-tile-${index})`}>
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
                  </g>
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
const L2_CACHE_KEY = 'abstract-l2-cache';
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
  pfp?: string;
  txs?: number;
}

interface Person {
  handle: string;
  name?: string;
  category?: string;
  priority?: boolean;
}

interface Project {
  handle: string;
  name?: string;
  category?: string;
  priority?: boolean;
}

export default function AbstractDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState<NFTCollection[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeTab, setActiveTab] = useState<'nfts' | 'tokens'>('nfts');
  const [showCount, setShowCount] = useState<10 | 20>(20);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [clipsMuted, setClipsMuted] = useState(true);
  const [clipsVolume, setClipsVolume] = useState(0.5);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [videoViewMode, setVideoViewMode] = useState<'laptop' | 'fullscreen'>('laptop');

  // Weekly news recap videos - newest first
  const weeklyRecaps = [
    { week: 'Feb 8-14', video: '/MarcelloNews.mp4', xLink: 'https://x.com/marcellovtv/status/2023423444973400428' },
    { week: 'Feb 1-7', video: '/MarcelloVidFeb9.mp4', xLink: 'https://x.com/marcellovtv' },
  ];
  const [scaleType, setScaleType] = useState<ScaleType>('balanced');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recommendedTab, setRecommendedTab] = useState<'people' | 'projects'>('people');
  const [recommendedCount, setRecommendedCount] = useState<50 | 100>(50);
  const [suggestInput, setSuggestInput] = useState('');
  const [suggestStatus, setSuggestStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [showAllWalletsTooltip, setShowAllWalletsTooltip] = useState(false);
  const [followsSearchTerm, setFollowsSearchTerm] = useState('');
  const followsSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [l2Data, setL2Data] = useState<{
    // Activity
    dailyTxs: number;
    weeklyTxs: number;
    monthlyTxs: number;
    txChange24h: number;
    txChange7d: number;
    avgDailyTxs: number;
    peakDailyTxs: number;
    peakDate: string;
    // TVS
    tvsUsd: number;
    tvsEth: number;
    nativeTvl: number;
    canonicalTvl: number;
    externalTvl: number;
    tvlChange7d: number;
    // Chain Info
    stage: string;
    category: string;
    stack: string;
    dataAvailability: string;
    // Risks
    stateValidation: { value: string; sentiment: string };
    sequencerFailure: { value: string; sentiment: string };
    exitWindow: { value: string; sentiment: string };
    proposerFailure: { value: string; sentiment: string };
  } | null>(null);
  const [goatedTweets, setGoatedTweets] = useState<{ url: string; handle: string; text?: string; description?: string }[]>([]);
  const [expandedTweets, setExpandedTweets] = useState<Set<number>>(new Set());

  // All Wallets state (Silver+)
  const [allWallets, setAllWallets] = useState<EliteWallet[]>([]);
  const [allWalletsSearch, setAllWalletsSearch] = useState('');
  const [allWalletsPage, setAllWalletsPage] = useState(1);
  const [allWalletsTier, setAllWalletsTier] = useState<'all' | 'gold' | 'platinum' | 'diamond' | 'obsidian'>('all');
  const [allWalletsSort, setAllWalletsSort] = useState<'tier' | 'txs' | 'badges'>('tier');
  const [allWalletsStats, setAllWalletsStats] = useState<{ gold: number; platinum: number; diamond: number; obsidian: number; total: number } | null>(null);
  const [allWalletsTotalPages, setAllWalletsTotalPages] = useState(1);
  const [allWalletsLoading, setAllWalletsLoading] = useState(false);
  const allWalletsSearchTimeout = useRef<NodeJS.Timeout | null>(null);

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

    // Load cached L2 data for instant display
    try {
      const l2Cached = localStorage.getItem(L2_CACHE_KEY);
      if (l2Cached) {
        const cachedL2Data = JSON.parse(l2Cached);
        if (cachedL2Data.data) {
          setL2Data(cachedL2Data.data);
        }
      }
    } catch {
      // Ignore cache errors
    }

    fetchData();
    fetchAllWallets(); // Initial fetch of all wallets
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all wallets when filters change
  useEffect(() => {
    // Debounce search
    if (allWalletsSearchTimeout.current) {
      clearTimeout(allWalletsSearchTimeout.current);
    }
    allWalletsSearchTimeout.current = setTimeout(() => {
      fetchAllWallets();
    }, 300);
    return () => {
      if (allWalletsSearchTimeout.current) {
        clearTimeout(allWalletsSearchTimeout.current);
      }
    };
  }, [allWalletsSearch, allWalletsPage, allWalletsTier, allWalletsSort]);

  const fetchAllWallets = async () => {
    setAllWalletsLoading(true);
    try {
      const params = new URLSearchParams({
        tier: allWalletsTier,
        page: String(allWalletsPage),
        limit: '500',
        sort: allWalletsSort,
      });
      if (allWalletsSearch) {
        params.set('search', allWalletsSearch);
      }
      const res = await fetch(`/api/all-wallets?${params}`);
      if (res.ok) {
        const data = await res.json();
        const walletData = data.all || data[allWalletsTier] || [];
        setAllWallets(walletData);
        setAllWalletsStats(data.stats);
        if (data.pagination) {
          setAllWalletsTotalPages(data.pagination.totalPages);
        }
      }
    } catch (e) {
      console.error('Failed to fetch all wallets:', e);
    } finally {
      setAllWalletsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all APIs in parallel for better performance
      const [statsRes, peopleRes, projectsRes, activityRes, tweetsRes] = await Promise.all([
        fetch('/api/abstract-stats'),
        fetch('/api/recommended-people'),
        fetch('/api/tier-maker'),
        fetch('/api/abstract-l2beat'),
        fetch('/api/goated-tweets'),
      ]);

      // Process abstract-stats response
      if (statsRes.ok) {
        const data = await statsRes.json();
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
      } else {
        throw new Error(`HTTP ${statsRes.status}`);
      }

      // Process people response (already sorted by priority from API)
      if (peopleRes.ok) {
        const peopleData = await peopleRes.json();
        setPeople(Array.isArray(peopleData) ? peopleData : []);
      }

      // Process projects response
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      }

      // Process L2Beat data response
      if (activityRes.ok) {
        const l2beatData = await activityRes.json();
        if (!l2beatData.error) {
          setL2Data(l2beatData);
          // Cache L2 data for instant loading next time
          try {
            localStorage.setItem(L2_CACHE_KEY, JSON.stringify({
              data: l2beatData,
              timestamp: Date.now(),
            }));
          } catch {
            // Ignore storage errors
          }
        }
      }

      // Process goated tweets response
      if (tweetsRes.ok) {
        const tweetsData = await tweetsRes.json();
        setGoatedTweets(Array.isArray(tweetsData) ? tweetsData : []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Copy heatmap to clipboard
  const handleCopyHeatmap = useCallback(async () => {
    if (!heatmapRef.current || copyStatus === 'copying') return;

    setCopyStatus('copying');
    try {
      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: '#000',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopyStatus('copied');
          setTimeout(() => setCopyStatus('idle'), 2000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy heatmap:', err);
      setCopyStatus('idle');
    }
  }, [activeTab, copyStatus]);

  return (
    <ErrorBoundary>
      <main className="container">
        {/* Banner Header */}
        <div className="banner-header">
          <div className="banner-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Abstract Dashboard</p>
            </div>
            <NavBar />
          </div>
        </div>

      {/* Tier Stats Module */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2edb84', margin: 0 }}>Abstract Portal Users</h2>
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

        {/* Stats on left, Cards on right - stacks on mobile */}
        <div className="stats-cards-layout" style={{ display: 'flex', gap: '1.5rem' }}>
          {/* Left Stats Panel - 25% on desktop, full width on mobile */}
          <div className="stats-panel" style={{ width: '22%', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Total Users */}
            <a
              href="https://portal.abs.xyz"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(46, 219, 132, 0.1)',
                border: '1px solid rgba(46, 219, 132, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem',
                textDecoration: 'none',
                display: 'block',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Users</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)' }}>via Abstract Portal</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2edb84' }}>1.99M</div>
            </a>

            {/* Daily Transactions */}
            <a
              href="https://l2beat.com/scaling/projects/abstract"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem',
                textDecoration: 'none',
                display: 'block',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily Txs</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)' }}>via L2Beat</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
                  {l2Data ? `${(l2Data.dailyTxs / 1000).toFixed(0)}K` : '—'}
                </div>
                {l2Data && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: l2Data.txChange24h >= 0 ? '#2edb84' : '#ef4444',
                  }}>
                    {l2Data.txChange24h >= 0 ? '+' : ''}{l2Data.txChange24h.toFixed(1)}%
                  </span>
                )}
              </div>
            </a>

            {/* TVS (Total Value Secured) */}
            <a
              href="https://defillama.com/chain/Abstract"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem',
                textDecoration: 'none',
                display: 'block',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TVL</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)' }}>via DeFi Llama</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>
                  {l2Data ? `$${(l2Data.tvsUsd / 1000000).toFixed(1)}M` : '—'}
                </div>
                {l2Data && l2Data.tvlChange7d !== undefined && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: l2Data.tvlChange7d >= 0 ? '#2edb84' : '#ef4444',
                  }}>
                    {l2Data.tvlChange7d >= 0 ? '+' : ''}{l2Data.tvlChange7d.toFixed(1)}%
                  </span>
                )}
              </div>
            </a>

            {/* Weekly Transactions */}
            <a
              href="https://l2beat.com/scaling/projects/abstract"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem',
                textDecoration: 'none',
                display: 'block',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Txs</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)' }}>via L2Beat</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f97316' }}>
                {l2Data ? `${(l2Data.weeklyTxs / 1000000).toFixed(2)}M` : '—'}
              </div>
            </a>
          </div>

          {/* Right Cards Panel - 75% */}
          <div style={{ flex: 1 }}>
            {/* All tier cards in single grid - 3 cols desktop, 2 cols mobile */}
            <div className="tier-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { name: 'Bronze', count: 1797598, pct: '90.04', className: 'bronze', subTiers: { t1: 1624861, t2: 106962, t3: 65775 } },
                { name: 'Silver', count: 180782, pct: '9.06', className: 'silver', subTiers: { t1: 161908, t2: 14017, t3: 4857 } },
                { name: 'Gold', count: 16566, pct: '0.83', className: 'gold', subTiers: { t1: 13955, t2: 1906, t3: 705 } },
                { name: 'Platinum', count: 1332, pct: '0.07', className: 'platinum', subTiers: { t1: 988, t2: 243, t3: 101 } },
                { name: 'Diamond', count: 103, pct: '0.01', className: 'diamond', subTiers: { t1: 78, t2: 16, t3: 9 } },
                { name: 'Obsidian', count: 11, pct: '0.00', className: 'obsidian', subTiers: { t1: 11, t2: 0, t3: 0 } },
              ].map((tier) => (
                <TierCard key={tier.name} name={tier.name} count={tier.count} pct={tier.pct} className={tier.className} subTiers={tier.subTiers} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap + Video Row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'stretch' }}>
      {/* Heatmap */}
      <div className="card" style={{ flex: 1, minHeight: 400, padding: '1rem' }}>
        {/* Total Market Cap Header with Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexWrap: 'wrap',
          gap: '0.5rem',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Type Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', marginRight: '0.25rem' }}>Type:</span>
              <button
                onClick={() => setActiveTab('nfts')}
                style={{
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: activeTab === 'nfts' ? 'none' : '1px solid rgba(46, 219, 132, 0.3)',
                  background: activeTab === 'nfts' ? '#2edb84' : 'transparent',
                  color: activeTab === 'nfts' ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                }}
              >
                NFTs
              </button>
              <button
                onClick={() => setActiveTab('tokens')}
                style={{
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: activeTab === 'tokens' ? 'none' : '1px solid rgba(46, 219, 132, 0.3)',
                  background: activeTab === 'tokens' ? '#2edb84' : 'transparent',
                  color: activeTab === 'tokens' ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                }}
              >
                Tokens
              </button>
            </div>

            {/* Count Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', marginRight: '0.25rem' }}>Count:</span>
              <button
                onClick={() => setShowCount(10)}
                style={{
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: showCount === 10 ? 'none' : '1px solid rgba(46, 219, 132, 0.3)',
                  background: showCount === 10 ? '#2edb84' : 'transparent',
                  color: showCount === 10 ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                }}
              >
                10
              </button>
              <button
                onClick={() => setShowCount(20)}
                style={{
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: showCount === 20 ? 'none' : '1px solid rgba(46, 219, 132, 0.3)',
                  background: showCount === 20 ? '#2edb84' : 'transparent',
                  color: showCount === 20 ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                }}
              >
                20
              </button>
            </div>

            {/* Scale Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', marginRight: '0.25rem' }}>Scale:</span>
              <button
                onClick={() => setScaleType('equal')}
                style={{
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: scaleType === 'equal' ? 'none' : '1px solid rgba(46, 219, 132, 0.3)',
                  background: scaleType === 'equal' ? '#2edb84' : 'transparent',
                  color: scaleType === 'equal' ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                }}
              >
                =
              </button>
              <button
                onClick={() => setScaleType('balanced')}
                style={{
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: scaleType === 'balanced' ? 'none' : '1px solid rgba(46, 219, 132, 0.3)',
                  background: scaleType === 'balanced' ? '#2edb84' : 'transparent',
                  color: scaleType === 'balanced' ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                }}
              >
                √
              </button>
              <button
                onClick={() => setScaleType('proportional')}
                style={{
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: scaleType === 'proportional' ? 'none' : '1px solid rgba(46, 219, 132, 0.3)',
                  background: scaleType === 'proportional' ? '#2edb84' : 'transparent',
                  color: scaleType === 'proportional' ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                }}
              >
                %
              </button>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyHeatmap}
              disabled={copyStatus === 'copying'}
              title="Copy to clipboard"
              style={{
                padding: '0.4rem',
                borderRadius: '6px',
                border: '1px solid rgba(46, 219, 132, 0.4)',
                background: copyStatus === 'copied' ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                color: copyStatus === 'copied' ? '#000' : 'rgba(255,255,255,0.9)',
                cursor: copyStatus === 'copying' ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {copyStatus === 'copying' ? (
                <span style={{ fontSize: '0.9rem' }}>⏳</span>
              ) : copyStatus === 'copied' ? (
                <span style={{ fontSize: '0.9rem' }}>✓</span>
              ) : (
                <span style={{ fontSize: '0.9rem' }}>📋</span>
              )}
            </button>
          </div>
        </div>

        {/* Heatmap Container */}
        <div ref={heatmapRef} style={{ width: '100%' }}>
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
      </div>

      {/* Weekly News Recap - Original with Week Toggle */}
      <div style={{
        background: '#000',
        borderRadius: '12px',
        border: '1px solid rgba(46, 219, 132, 0.2)',
        padding: '1rem',
        width: '300px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2edb84', margin: 0 }}>Weekly News Recap</h2>
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', margin: '0.15rem 0 0 0' }}>by @marcellovtv</p>
          </div>
          <a
            href={weeklyRecaps[selectedWeek]?.xLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            View on X
          </a>
        </div>

        {/* Week Navigation with Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <button
            onClick={() => setSelectedWeek(prev => Math.max(0, prev - 1))}
            disabled={selectedWeek === 0}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: 'none',
              background: selectedWeek === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(46, 219, 132, 0.2)',
              color: selectedWeek === 0 ? 'rgba(255,255,255,0.3)' : '#2edb84',
              cursor: selectedWeek === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>
            {weeklyRecaps[selectedWeek]?.week}
          </span>
          <button
            onClick={() => setSelectedWeek(prev => Math.min(weeklyRecaps.length - 1, prev + 1))}
            disabled={selectedWeek === weeklyRecaps.length - 1}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: 'none',
              background: selectedWeek === weeklyRecaps.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(46, 219, 132, 0.2)',
              color: selectedWeek === weeklyRecaps.length - 1 ? 'rgba(255,255,255,0.3)' : '#2edb84',
              cursor: selectedWeek === weeklyRecaps.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            →
          </button>
        </div>

        {/* Video Player */}
        <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
          <video
            key={selectedWeek}
            autoPlay
            loop
            muted={videoMuted}
            playsInline
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '400px',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
            onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
            onPlay={() => setVideoPaused(false)}
            onPause={() => setVideoPaused(true)}
          >
            <source src={weeklyRecaps[selectedWeek]?.video} type="video/mp4" />
          </video>

          {/* Video Controls Overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0.5rem',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <button
              onClick={() => {
                const video = document.querySelector('video');
                if (video) {
                  if (video.paused) video.play();
                  else video.pause();
                }
              }}
              style={{
                padding: '0.3rem',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {videoPaused ? '▶' : '⏸'}
            </button>
            <div style={{
              flex: 1,
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${videoDuration ? (videoCurrentTime / videoDuration) * 100 : 0}%`,
                height: '100%',
                background: '#2edb84',
                transition: 'width 0.1s linear',
              }} />
            </div>
            <button
              onClick={() => setVideoMuted(!videoMuted)}
              style={{
                padding: '0.3rem',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {videoMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Leaderboard Section - Side by Side */}
      <div className="grid-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* NFT Leaderboard */}
        <div style={{ background: '#000', borderRadius: '12px', border: '1px solid rgba(46, 219, 132, 0.2)', padding: '1rem', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#2edb84' }}>Top Abstract NFTs</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingRight: '8px' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, minWidth: '380px' }}>
              <div style={{ width: '24px' }}>#</div>
              <div style={{ flex: 1, minWidth: '100px' }}>Collection</div>
              <div style={{ width: '70px', textAlign: 'right', paddingLeft: '16px' }}>Floor</div>
              <div style={{ width: '70px', textAlign: 'right', paddingLeft: '16px' }}>24h</div>
              <div style={{ width: '80px', textAlign: 'right', paddingLeft: '16px' }}>MCap</div>
            </div>
            {/* Data Rows */}
            {nfts.slice(0, 15).map((nft, index) => (
              <div
                key={nft.slug}
                onClick={() => window.open(`https://opensea.io/collection/${nft.slug}`, '_blank')}
                style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 0', cursor: 'pointer', fontSize: '0.75rem', minWidth: '380px' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '24px', color: 'rgba(255,255,255,0.5)' }}>{index + 1}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, minWidth: 0 }}>
                  <img src={nft.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(nft.name)}&background=1a1a1a&color=2edb84&size=44`} alt="" style={{ width: 22, height: 22, borderRadius: '4px', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nft.name)}&background=1a1a1a&color=2edb84&size=44`; }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nft.name}</span>
                </div>
                <div style={{ width: '70px', textAlign: 'right', paddingLeft: '16px' }}>{(nft.floorPrice ?? 0) > 0 ? (nft.floorPrice ?? 0).toFixed(3) : '-'}</div>
                <div style={{ width: '70px', textAlign: 'right', paddingLeft: '16px', color: nft.floorPriceChange24h === null ? 'rgba(255,255,255,0.4)' : (nft.floorPriceChange24h ?? 0) >= 0 ? '#2edb84' : '#ff6b6b' }}>
                  {nft.floorPriceChange24h === null ? '-' : `${(nft.floorPriceChange24h ?? 0) >= 0 ? '+' : ''}${(nft.floorPriceChange24h ?? 0).toFixed(1)}%`}
                </div>
                <div style={{ width: '80px', textAlign: 'right', paddingLeft: '16px' }}>{(nft.marketCap ?? 0) >= 1000000 ? `$${((nft.marketCap ?? 0) / 1000000).toFixed(1)}M` : (nft.marketCap ?? 0) >= 1000 ? `$${((nft.marketCap ?? 0) / 1000).toFixed(0)}K` : '-'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Token Leaderboard */}
        <div style={{ background: '#000', borderRadius: '12px', border: '1px solid rgba(46, 219, 132, 0.2)', padding: '1rem', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#2edb84' }}>Top Abstract Tokens</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingRight: '8px' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, minWidth: '400px' }}>
              <div style={{ width: '24px' }}>#</div>
              <div style={{ flex: 1, minWidth: '80px' }}>Token</div>
              <div style={{ width: '90px', textAlign: 'right', paddingLeft: '16px' }}>Price</div>
              <div style={{ width: '70px', textAlign: 'right', paddingLeft: '16px' }}>24h</div>
              <div style={{ width: '80px', textAlign: 'right', paddingLeft: '16px' }}>MCap</div>
            </div>
            {/* Data Rows */}
            {tokens.slice(0, 15).map((token, index) => (
              <div
                key={token.address}
                onClick={() => window.open(`https://dexscreener.com/abstract/${token.address}`, '_blank')}
                style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 0', cursor: 'pointer', fontSize: '0.75rem', minWidth: '400px' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '24px', color: 'rgba(255,255,255,0.5)' }}>{index + 1}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, minWidth: 0 }}>
                  <img src={token.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(token.symbol)}&background=1a1a1a&color=2edb84&size=44`} alt="" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(token.symbol)}&background=1a1a1a&color=2edb84&size=44`; }} />
                  <span>{token.symbol}</span>
                </div>
                <div style={{ width: '90px', textAlign: 'right', paddingLeft: '16px' }}>{(token.price ?? 0) < 0.01 ? `$${(token.price ?? 0).toFixed(5)}` : `$${(token.price ?? 0).toFixed(3)}`}</div>
                <div style={{ width: '70px', textAlign: 'right', paddingLeft: '16px', color: (token.priceChange24h ?? 0) >= 0 ? '#2edb84' : '#ff6b6b' }}>{(token.priceChange24h ?? 0) >= 0 ? '+' : ''}{(token.priceChange24h ?? 0).toFixed(1)}%</div>
                <div style={{ width: '80px', textAlign: 'right', paddingLeft: '16px' }}>{(token.marketCap ?? 0) >= 1000000 ? `$${((token.marketCap ?? 0) / 1000000).toFixed(1)}M` : (token.marketCap ?? 0) >= 1000 ? `$${((token.marketCap ?? 0) / 1000).toFixed(0)}K` : '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Follows + All Wallets Side by Side */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '1.5rem',
        flexWrap: 'wrap',
      }}>
      {/* Recommended Follows - Tiered Rows with Toggle */}
      <div style={{
        background: '#000',
        borderRadius: '12px',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        padding: '1rem',
        flex: '1 1 100%',
        minWidth: '0',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa', margin: 0 }}>
            Recommended Follows
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => setRecommendedTab('people')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: recommendedTab === 'people' ? 'none' : '1px solid rgba(139, 92, 246, 0.4)',
                  background: recommendedTab === 'people' ? '#a78bfa' : 'rgba(139, 92, 246, 0.1)',
                  color: recommendedTab === 'people' ? '#000' : 'rgba(255,255,255,0.9)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                }}
              >
                People
              </button>
              <button
                onClick={() => setRecommendedTab('projects')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: recommendedTab === 'projects' ? 'none' : '1px solid rgba(139, 92, 246, 0.4)',
                  background: recommendedTab === 'projects' ? '#a78bfa' : 'rgba(139, 92, 246, 0.1)',
                  color: recommendedTab === 'projects' ? '#000' : 'rgba(255,255,255,0.9)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                }}
              >
                Projects
              </button>
            </div>
            <div className="suggest-handle-input" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="text"
                placeholder="@handle"
                value={suggestInput}
                onChange={(e) => setSuggestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && suggestInput.trim()) {
                    setSuggestStatus('submitting');
                    fetch('/api/suggest-follow', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ handle: suggestInput, type: recommendedTab === 'people' ? 'person' : 'project' }),
                    })
                      .then(res => res.ok ? setSuggestStatus('success') : setSuggestStatus('error'))
                      .catch(() => setSuggestStatus('error'))
                      .finally(() => {
                        setTimeout(() => setSuggestStatus('idle'), 2000);
                        setSuggestInput('');
                      });
                  }
                }}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(46, 219, 132, 0.4)',
                  background: 'rgba(46, 219, 132, 0.1)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  width: '80px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  // Clear any existing timeout
                  if (followsSearchTimeout.current) {
                    clearTimeout(followsSearchTimeout.current);
                    followsSearchTimeout.current = null;
                  }

                  // If already searching, clear it (toggle off)
                  if (followsSearchTerm) {
                    setFollowsSearchTerm('');
                    return;
                  }

                  // Start new search
                  if (!suggestInput.trim()) return;
                  setFollowsSearchTerm(suggestInput.trim().toLowerCase().replace(/^@/, ''));
                  followsSearchTimeout.current = setTimeout(() => {
                    setFollowsSearchTerm('');
                    followsSearchTimeout.current = null;
                  }, 30000);
                }}
                title={followsSearchTerm ? 'Clear search' : 'Search for handle'}
                style={{
                  padding: '0.35rem',
                  borderRadius: '6px',
                  border: followsSearchTerm ? '1px solid #2edb84' : '1px solid rgba(167, 139, 250, 0.4)',
                  background: followsSearchTerm ? 'rgba(46, 219, 132, 0.3)' : 'rgba(167, 139, 250, 0.1)',
                  color: '#fff',
                  cursor: (suggestInput.trim() || followsSearchTerm) ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (suggestInput.trim() || followsSearchTerm) ? 1 : 0.5,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={followsSearchTerm ? '#2edb84' : 'rgba(167, 139, 250, 0.8)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
              <button
                onClick={() => {
                  if (!suggestInput.trim()) return;
                  setSuggestStatus('submitting');
                  fetch('/api/suggest-follow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ handle: suggestInput, type: recommendedTab === 'people' ? 'person' : 'project' }),
                  })
                    .then(res => res.ok ? setSuggestStatus('success') : setSuggestStatus('error'))
                    .catch(() => setSuggestStatus('error'))
                    .finally(() => {
                      setTimeout(() => setSuggestStatus('idle'), 2000);
                      setSuggestInput('');
                    });
                }}
                disabled={suggestStatus === 'submitting' || !suggestInput.trim()}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: suggestStatus === 'success' ? '#2edb84' : suggestStatus === 'error' ? '#ef4444' : 'rgba(46, 219, 132, 0.8)',
                  color: '#000',
                  fontWeight: 600,
                  cursor: suggestStatus === 'submitting' ? 'wait' : 'pointer',
                  fontSize: '0.6rem',
                  opacity: !suggestInput.trim() ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {suggestStatus === 'submitting' ? '...' : suggestStatus === 'success' ? 'Added!' : suggestStatus === 'error' ? 'Error' : 'Suggest Addition'}
              </button>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', height: '400px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', height: '100%', overflowY: 'auto', paddingRight: '0.5rem', paddingBottom: '2rem', scrollbarWidth: 'thin', scrollbarColor: 'rgba(167, 139, 250, 0.3) transparent' }}>
          {(() => {
            // Responsive grid layout
            const size = 50;
            const border = 2;

            let itemsToShow: { handle: string; name?: string; category?: string }[] = [];

            if (recommendedTab === 'people') {
              // Fixed top row for people - always these 5 in this order
              const topRowHandles = ['zaddyfi', 'marcellovtv', 'MindfulMarketOG', 'GMB_AOB', 'ProofOfEly'];
              const topRowPeople = topRowHandles
                .map(handle => people.find(p => p.handle.toLowerCase() === handle.toLowerCase()))
                .filter((p): p is Person => p !== undefined);
              const remainingPeople = people.filter(
                p => !topRowHandles.some(h => h.toLowerCase() === p.handle.toLowerCase())
              );
              itemsToShow = [...topRowPeople, ...remainingPeople];
            } else {
              // Projects tab - shows only projects from /api/tier-maker
              itemsToShow = projects;
            }

            // Render items - they wrap naturally with flexWrap
            return itemsToShow.map((item) => {
              const isMatch = followsSearchTerm && (
                item.handle.toLowerCase().includes(followsSearchTerm) ||
                (item.name && item.name.toLowerCase().includes(followsSearchTerm))
              );
              return (
              <a
                key={`${recommendedTab}-${item.handle}`}
                href={`https://x.com/${item.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`${item.name || item.handle} (@${item.handle})`}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: isMatch ? `${border + 1}px solid #2edb84` : `${border}px solid rgba(46, 219, 132, 0.5)`,
                  boxShadow: isMatch ? undefined : '0 2px 8px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  flexShrink: 0,
                  zIndex: isMatch ? 20 : 1,
                  animation: isMatch ? 'greenFire 0.8s ease-in-out infinite' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isMatch) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.zIndex = '10';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(46, 219, 132, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMatch) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '1';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                  }
                }}
              >
                <img
                  src={`/pfp/${item.handle}.jpg`}
                  alt={item.name || item.handle}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = '1';
                      target.src = `https://unavatar.io/twitter/${item.handle}`;
                    } else {
                      target.onerror = null;
                      target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${item.name || item.handle}`;
                    }
                  }}
                />
              </a>
              );
            });
          })()}
          {((recommendedTab === 'people' && people.length === 0) || (recommendedTab === 'projects' && projects.length === 0)) && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              No {recommendedTab} to show
            </div>
          )}
        </div>
        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: '0.5rem',
        }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(167, 139, 250, 0.6)', pointerEvents: 'auto' }}>
            ↓ scroll for more
          </span>
        </div>
        </div>
      </div>

      {/* All Wallets Section (Silver+) */}
      <div style={{
        background: '#000',
        borderRadius: '12px',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        padding: '1rem',
        flex: '1 1 400px',
        minWidth: '0',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffd700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            All Wallets
            <span
              style={{ position: 'relative', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={() => setShowAllWalletsTooltip(true)}
              onMouseLeave={() => setShowAllWalletsTooltip(false)}
              onClick={() => setShowAllWalletsTooltip(!showAllWalletsTooltip)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              {showAllWalletsTooltip && (
                <span style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '100%',
                  transform: 'translateX(-50%)',
                  marginBottom: '6px',
                  padding: '6px 10px',
                  background: '#1a1a1a',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.9)',
                  whiteSpace: 'nowrap',
                  zIndex: 1000,
                  pointerEvents: 'none',
                }}>
                  Bronze Wallets not included, ngmi
                </span>
              )}
            </span>
            {allWalletsStats && (
              <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: '0.5rem' }}>
                ({allWalletsStats.total.toLocaleString()} Silver+)
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search..."
              value={allWalletsSearch}
              onChange={(e) => {
                setAllWalletsSearch(e.target.value);
                setAllWalletsPage(1);
              }}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                fontSize: '0.7rem',
                width: '120px',
                outline: 'none',
              }}
            />
            {/* Tier Filter */}
            {(['all', 'obsidian', 'diamond', 'platinum', 'gold'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  setAllWalletsTier(tier);
                  setAllWalletsPage(1);
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: allWalletsTier === tier ? 'none' : '1px solid rgba(255, 215, 0, 0.3)',
                  background: allWalletsTier === tier ? '#ffd700' : 'rgba(255, 215, 0, 0.1)',
                  color: allWalletsTier === tier ? '#000' : 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  textTransform: 'capitalize',
                }}
              >
                {tier}
              </button>
            ))}
            {/* Sort */}
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginLeft: '0.5rem' }}>Sort:</span>
            {(['tier', 'txs', 'badges'] as const).map((sortType) => (
              <button
                key={sortType}
                onClick={() => { setAllWalletsSort(sortType); setAllWalletsPage(1); }}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: allWalletsSort === sortType ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  background: allWalletsSort === sortType ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  color: allWalletsSort === sortType ? '#fff' : 'rgba(255,255,255,0.6)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  textTransform: 'capitalize',
                }}
              >
                {sortType === 'txs' ? 'Txns' : sortType.charAt(0).toUpperCase() + sortType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tier Stats */}
        {allWalletsStats && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {([
              { key: 'obsidian', color: '#a0a0c0', bg: 'linear-gradient(135deg, #1a1a2e, #3a3a5a)' },
              { key: 'diamond', color: '#1a1a2e', bg: 'linear-gradient(135deg, #b9f2ff, #e0f7ff)' },
              { key: 'platinum', color: '#2a2a2a', bg: 'linear-gradient(135deg, #e5e4e2, #d4d4d2)' },
              { key: 'gold', color: '#2a2a2a', bg: 'linear-gradient(135deg, #ffd700, #ffec8b)' },
            ] as const).map(({ key, color, bg }) => (
              <div
                key={key}
                onClick={() => {
                  setAllWalletsTier(key);
                  setAllWalletsPage(1);
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  background: bg,
                  color,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: allWalletsTier === 'all' || allWalletsTier === key ? 1 : 0.5,
                  transition: 'opacity 0.2s',
                }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}: {allWalletsStats[key].toLocaleString()}
              </div>
            ))}
          </div>
        )}

        {/* Wallet List */}
        <div style={{ height: '400px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 215, 0, 0.3) transparent' }}>
          {allWalletsLoading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
          ) : allWallets.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>No wallets found</div>
          ) : (
            allWallets.map((wallet, index) => {
                const tierNames: Record<number, string> = { 6: 'Obsidian', 5: 'Diamond', 4: 'Platinum', 3: 'Gold' };
                const tierColors: Record<string, { bg: string; text: string }> = {
                  Obsidian: { bg: 'linear-gradient(135deg, #1a1a2e, #3a3a5a)', text: '#a0a0c0' },
                  Diamond: { bg: 'linear-gradient(135deg, #b9f2ff, #e0f7ff)', text: '#1a1a2e' },
                  Platinum: { bg: 'linear-gradient(135deg, #e5e4e2, #d4d4d2)', text: '#2a2a2a' },
                  Gold: { bg: 'linear-gradient(135deg, #ffd700, #ffec8b)', text: '#2a2a2a' },
                };
                const tierName = tierNames[wallet.tier] || 'Unknown';
                const colors = tierColors[tierName] || tierColors.Gold;
                const subTier = ((wallet.tierV2 - 1) % 3) + 1;
                const displayName = wallet.name.startsWith('0x') && wallet.name.length > 20
                  ? `${wallet.name.slice(0, 6)}...${wallet.name.slice(-4)}`
                  : wallet.name;
                const globalIndex = index + 1;

                return (
                  <a
                    key={wallet.id}
                    href={`https://portal.abs.xyz/profile/${wallet.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ width: '32px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                      {globalIndex}
                    </span>
                    <img
                      src={wallet.pfp || `https://api.dicebear.com/7.x/identicon/svg?seed=${wallet.wallet}`}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a2e', objectFit: 'cover' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${wallet.wallet}`;
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                          {displayName}
                        </span>
                        <span style={{
                          fontSize: '0.5rem',
                          fontWeight: 700,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          background: colors.bg,
                          color: colors.text,
                        }}>
                          {tierName} {subTier}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center', minWidth: '40px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2edb84' }}>{wallet.txs ? wallet.txs.toLocaleString() : '-'}</div>
                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>txns</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '30px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#a78bfa' }}>{wallet.badges}</div>
                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>badges</div>
                      </div>
                    </div>
                  </a>
                );
              })
          )}
        </div>

      </div>
      </div>{/* End of Recommended Follows + All Wallets wrapper */}

      {/* Goated Tweets Section */}
      {goatedTweets.length > 0 && (
        <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2edb84', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🐐</span> Goated Tweets
            </h2>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
              {goatedTweets.length} tweet{goatedTweets.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div
            className="goated-tweets-scroll"
            style={{
              display: 'flex',
              gap: '0.75rem',
              overflowX: 'auto',
              paddingBottom: '0.75rem',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(46, 219, 132, 0.3) transparent',
              scrollSnapType: 'x mandatory',
              alignItems: 'stretch',
            }}
          >
            {goatedTweets.map((tweet, idx) => {
              // Extract tweet ID from URL
              const tweetIdMatch = tweet.url.match(/status\/(\d+)/);
              const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

              if (!tweetId) return null;

              const isExpanded = expandedTweets.has(idx);
              return (
                <div
                  key={idx}
                  className="goated-tweet-card"
                  style={{
                    minWidth: '280px',
                    maxWidth: '280px',
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                  data-theme="dark"
                >
                  <div style={{
                    maxHeight: isExpanded ? 'none' : '200px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <Tweet id={tweetId} />
                    {!isExpanded && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '60px',
                        background: 'linear-gradient(transparent, #000)',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setExpandedTweets(prev => {
                        const newSet = new Set(prev);
                        if (isExpanded) {
                          newSet.delete(idx);
                        } else {
                          newSet.add(idx);
                        }
                        return newSet;
                      });
                    }}
                    style={{
                      padding: '0.4rem 0.6rem',
                      marginTop: '0.25rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(46, 219, 132, 0.15)',
                      color: '#2edb84',
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      width: '100%',
                    }}
                  >
                    {isExpanded ? '▲ Show Less' : '▼ Show More'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Computer Monitor Video Feed */}
      {(() => {
        const wideClips = [
          { title: 'Nirvy Clip', video: '/NirvyClip.mp4' },
          { title: 'GMB Clip', video: '/GMBClip.mp4' },
          { title: 'GMB Clip 2', video: '/GMBClip2.mp4' },
          { title: 'GMB Clip 3', video: '/GMBClip3.mp4' },
        ];

        // Setup intersection observer to pause videos when section goes off screen
        const setupObserver = (element: HTMLDivElement | null) => {
          if (!element) return;
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                const videos = document.querySelectorAll('#monitor-video-feed video') as NodeListOf<HTMLVideoElement>;
                if (!entry.isIntersecting) {
                  // Section is off screen - pause all videos
                  videos.forEach((video) => {
                    video.pause();
                  });
                } else {
                  // Section is on screen - play current video
                  videos.forEach((video, idx) => {
                    if (idx === currentClipIndex) {
                      video.play().catch(() => {});
                    }
                  });
                }
              });
            },
            { threshold: 0.1 }
          );
          observer.observe(element);
        };

        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
          const container = e.currentTarget;
          const videos = container.querySelectorAll('video');
          const scrollTop = container.scrollTop;
          const containerHeight = container.clientHeight;

          const newIndex = Math.round(scrollTop / containerHeight);
          if (newIndex !== currentClipIndex && newIndex >= 0 && newIndex < wideClips.length) {
            setCurrentClipIndex(newIndex);

            videos.forEach((video, idx) => {
              if (idx === newIndex) {
                video.currentTime = 0;
                video.play().catch(() => {});
              } else {
                video.pause();
                video.currentTime = 0;
              }
            });
          }
        };

        return (
          <div
            ref={setupObserver}
            style={{
              background: '#000',
              borderRadius: '12px',
              border: '1px solid rgba(46, 219, 132, 0.2)',
              padding: '1rem',
              marginTop: '1rem',
              marginLeft: 'auto',
              marginRight: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '90%',
              maxWidth: '1600px',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', width: '100%', maxWidth: '500px' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#2edb84', margin: 0 }}>Abstract TV</h2>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: '0.15rem 0 0 0' }}>Scroll to browse</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Volume Control Group */}
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <button
                    onClick={() => {
                      const videos = document.querySelectorAll('#monitor-video-feed video') as NodeListOf<HTMLVideoElement>;
                      videos.forEach(v => v.muted = !clipsMuted);
                      setClipsMuted(!clipsMuted);
                    }}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '8px 0 0 8px',
                      border: 'none',
                      background: clipsMuted ? 'rgba(46, 219, 132, 0.15)' : 'rgba(46, 219, 132, 0.4)',
                      color: '#2edb84',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                    title={clipsMuted ? 'Unmute' : 'Mute'}
                  >
                    {clipsMuted ? '🔇' : '🔊'}
                  </button>
                  <button
                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                    style={{
                      padding: '0.4rem 0.3rem',
                      borderRadius: '0 8px 8px 0',
                      border: 'none',
                      borderLeft: '1px solid rgba(46, 219, 132, 0.3)',
                      background: showVolumeSlider ? 'rgba(46, 219, 132, 0.4)' : 'rgba(46, 219, 132, 0.15)',
                      color: '#2edb84',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                    }}
                    title="Volume"
                  >
                    ▼
                  </button>
                  {showVolumeSlider && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '0.5rem',
                      background: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid rgba(46, 219, 132, 0.3)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      zIndex: 100,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <span style={{ fontSize: '0.7rem', color: '#2edb84' }}>🔈</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={clipsVolume}
                        onChange={(e) => {
                          const newVolume = parseFloat(e.target.value);
                          setClipsVolume(newVolume);
                          const videos = document.querySelectorAll('#monitor-video-feed video') as NodeListOf<HTMLVideoElement>;
                          videos.forEach(v => {
                            v.volume = newVolume;
                            if (newVolume > 0 && clipsMuted) {
                              v.muted = false;
                              setClipsMuted(false);
                            }
                          });
                        }}
                        className="volume-slider"
                        style={{
                          width: '80px',
                          height: '6px',
                          accentColor: '#2edb84',
                          cursor: 'pointer',
                          background: 'linear-gradient(to right, #2edb84 0%, #2edb84 ' + (clipsVolume * 100) + '%, rgba(255,255,255,0.2) ' + (clipsVolume * 100) + '%, rgba(255,255,255,0.2) 100%)',
                          borderRadius: '3px',
                          WebkitAppearance: 'none',
                          appearance: 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#2edb84' }}>🔊</span>
                    </div>
                  )}
                </div>
                <a
                  href={wideClips[currentClipIndex]?.video}
                  download
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '8px',
                    border: '1px solid #2edb84',
                    background: 'transparent',
                    color: '#2edb84',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Download clip"
                >
                  Save Clip
                </a>
                {/* View Mode Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(46, 219, 132, 0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setVideoViewMode('laptop')}
                    style={{
                      padding: '0.4rem 0.5rem',
                      border: 'none',
                      background: videoViewMode === 'laptop' ? 'rgba(46, 219, 132, 0.4)' : 'transparent',
                      color: '#2edb84',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Laptop View"
                  >
                    💻
                  </button>
                  <button
                    onClick={() => setVideoViewMode('fullscreen')}
                    style={{
                      padding: '0.4rem 0.5rem',
                      border: 'none',
                      borderLeft: '1px solid rgba(46, 219, 132, 0.3)',
                      background: videoViewMode === 'fullscreen' ? 'rgba(46, 219, 132, 0.4)' : 'transparent',
                      color: '#2edb84',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Fullscreen View"
                  >
                    📺
                  </button>
                </div>
              </div>
            </div>

            {/* Video Container - same wrapper for both modes */}
            <div style={{
              width: '100%',
              position: 'relative',
            }}>
              {/* GIF Frame - hidden in fullscreen but maintains spacing */}
              <img
                src="/zaddytools SCREEN.gif"
                alt="Screen Frame"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  visibility: videoViewMode === 'fullscreen' ? 'hidden' : 'visible',
                }}
              />
              {/* Video content area - position changes based on mode */}
              <div
                id="monitor-video-feed"
                onScroll={handleScroll}
                style={{
                  position: 'absolute',
                  top: videoViewMode === 'fullscreen' ? '0' : '25.5%',
                  left: videoViewMode === 'fullscreen' ? '0' : '23%',
                  right: videoViewMode === 'fullscreen' ? '0' : '23%',
                  bottom: videoViewMode === 'fullscreen' ? '0' : '11.5%',
                  background: '#000',
                  borderRadius: videoViewMode === 'fullscreen' ? '8px' : '0',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  scrollSnapType: 'y mandatory',
                  scrollBehavior: 'smooth',
                  overscrollBehavior: 'contain',
                  touchAction: 'pan-y',
                  display: 'flex',
                  flexDirection: 'column',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
                className="hide-scrollbar"
              >
                {wideClips.map((clip, index) => (
                  <div
                    key={index}
                    style={{
                      height: '100%',
                      minHeight: '100%',
                      scrollSnapAlign: 'start',
                      scrollSnapStop: 'always',
                      position: 'relative',
                      flexShrink: 0,
                      background: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <video
                      autoPlay
                      loop
                      muted={clipsMuted}
                      playsInline
                      preload="auto"
                      onLoadedData={(e) => {
                        const video = e.currentTarget;
                        video.play().catch(() => {});
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        background: '#000',
                      }}
                    >
                      <source src={clip.video} type="video/mp4" />
                    </video>
                  </div>
                ))}
              </div>
            </div>
            <a
              href="https://x.com/GMB_AOB"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.65rem',
                color: '#2edb84',
                marginTop: '0.75rem',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              idea by @GMB_AOB
            </a>
          </div>
        );
      })()}

      </main>
    </ErrorBoundary>
  );
}
