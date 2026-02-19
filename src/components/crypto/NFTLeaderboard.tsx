'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatCompactNumber } from '@/lib/crypto/formatters';

interface NFTCollection {
  slug: string;
  name: string;
  image: string;
  floorPrice: number;
  floorPriceSymbol: string;
  change: number;
  floorPriceChange?: number;
  volume: number;
  owners: number;
  marketCap: number;
  url: string;
  chain: string;
}

type TimePeriod = '24h' | '7d' | '30d';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NFTLeaderboard() {
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [showCount, setShowCount] = useState(25);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: collections, isLoading, isValidating } = useSWR<NFTCollection[]>(
    `/api/crypto/nfts?period=${period}`,
    fetcher,
    { refreshInterval: 300000, keepPreviousData: true } // 5 minutes, keep old data while loading new
  );

  // Only show full skeleton on initial load (no data yet)
  if (isLoading && !collections) {
    return (
      <div className="nft-leaderboard-card loading">
        <div className="skeleton skeleton-label" />
        <div className="nft-list">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (!collections || collections.length === 0) {
    return (
      <div className="nft-leaderboard-card">
        <p className="widget-label">NFT Leaderboard</p>
        <p style={{ color: '#666', fontSize: '0.8rem' }}>Unable to load NFT data</p>
      </div>
    );
  }

  // Slice to show count (filtering done by API)
  const displayCollections = collections.slice(0, showCount);

  return (
    <div className={`nft-leaderboard-card ${isExpanded ? 'expanded' : ''} ${isValidating ? 'updating' : ''}`}>
      <div className="nft-header">
        <p className="widget-label">NFT Leaderboard {isValidating && <span className="loading-indicator">⟳</span>}</p>
        <div className="nft-controls">
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand for screenshot'}
          >
            {isExpanded ? '⊖' : '⊕'}
          </button>
          <div className="nft-toggles">
            {(['24h', '7d', '30d'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                className={`nft-toggle ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            value={showCount}
            onChange={(e) => setShowCount(Number(e.target.value))}
            className="nft-select"
          >
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>
      </div>

      <div className={`nft-list ${isExpanded ? 'expanded' : ''}`}>
        {displayCollections.map((nft, index) => {
          const volumeChange = nft.change ?? 0;
          const isVolumePositive = volumeChange >= 0;
          const volumeChangeDisplay = isNaN(volumeChange) ? '0.0' : volumeChange.toFixed(1);

          const floorChange = nft.floorPriceChange ?? 0;
          const isFloorPositive = floorChange >= 0;
          const floorChangeDisplay = isNaN(floorChange) ? '0.0' : Math.abs(floorChange).toFixed(1);

          return (
            <a
              key={nft.slug}
              href={nft.url}
              target="_blank"
              rel="noopener noreferrer"
              className="nft-item"
            >
              <span className="nft-rank">{index + 1}</span>
              <img
                src={nft.image}
                alt={nft.name}
                className="nft-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="nft-info">
                <p className="nft-name">{nft.name}</p>
                <p className="nft-floor">
                  Floor: {(nft.floorPrice ?? 0).toFixed(3)} {nft.floorPriceSymbol || 'ETH'}
                  {floorChange !== 0 && (
                    <span className={`floor-change ${isFloorPositive ? 'positive' : 'negative'}`}>
                      {' '}{isFloorPositive ? '↑' : '↓'}{floorChangeDisplay}%
                    </span>
                  )}
                </p>
              </div>
              <div className="nft-stats">
                {volumeChange !== 0 ? (
                  <p className={`nft-change ${isVolumePositive ? 'positive' : 'negative'}`}>
                    {isVolumePositive ? '+' : ''}{volumeChangeDisplay}%
                  </p>
                ) : (
                  <p className="nft-change" style={{ color: 'rgba(255,255,255,0.3)' }}>-</p>
                )}
                <p className="nft-volume">{formatCompactNumber(nft.volume || 0)} ETH {period}</p>
              </div>
            </a>
          );
        })}
      </div>

      <div className="nft-footer">
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
