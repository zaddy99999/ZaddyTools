'use client';

import { useState } from 'react';
import { useChains } from '@/lib/crypto/hooks';
import { formatCompactNumber } from '@/lib/crypto/formatters';

const CHAIN_ICONS: Record<string, string> = {
  ethereum: '⟠',
  solana: '◎',
  bsc: '🔶',
  bitcoin: '₿',
  tron: '⚡',
  base: '🔵',
  arbitrum: '🔷',
  polygon: '🟣',
  avalanche: '🔺',
  optimism: '🔴',
};

export default function TvlByChain() {
  const { chains, isLoading, isError } = useChains();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="tvl-card">
        <p className="widget-label">TVL by Chain</p>
        <div className="tvl-list">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" style={{ height: 40, marginBottom: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !chains || chains.length === 0) {
    return (
      <div className="tvl-card">
        <p className="widget-label">TVL by Chain</p>
        <p className="widget-empty">Failed to load chain TVL data</p>
      </div>
    );
  }

  const allChains = chains.slice(0, 75);
  const displayedChains = showAll ? allChains : allChains.slice(0, 20);
  const totalTvl = chains.reduce((sum, chain) => sum + (chain.tvl || 0), 0);
  const hasMore = allChains.length > 20;

  return (
    <div className="tvl-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p className="widget-label" style={{ margin: 0 }}>TVL by Chain</p>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
          Total: {formatCompactNumber(totalTvl, true)}
        </span>
      </div>

      <div className="tvl-list" style={{ maxHeight: showAll ? 600 : 400, overflowY: 'auto' }}>
        {displayedChains.map((chain, index) => {
          const percentage = ((chain.tvl || 0) / totalTvl) * 100;
          const icon = CHAIN_ICONS[chain.id] || CHAIN_ICONS[chain.name?.toLowerCase()] || '🔗';

          return (
            <div key={chain.id} className="tvl-item" style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="tvl-rank" style={{ width: 24, color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{index + 1}</span>
              <span style={{ fontSize: '1.1rem', marginRight: '0.5rem' }}>{icon}</span>
              <div className="tvl-info" style={{ flex: 1 }}>
                <p className="tvl-name" style={{ margin: 0, fontWeight: 600, fontSize: '0.8rem' }}>{chain.name}</p>
                <div style={{
                  height: 3,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  marginTop: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(percentage, 100)}%`,
                    background: '#2edb84',
                    borderRadius: 2,
                  }} />
                </div>
              </div>
              <div className="tvl-stats" style={{ textAlign: 'right' }}>
                <p className="tvl-value" style={{ margin: 0, fontWeight: 700, fontSize: '0.8rem', color: '#2edb84' }}>
                  {formatCompactNumber(chain.tvl, true)}
                </p>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginTop: '0.75rem',
            background: 'rgba(46, 219, 132, 0.1)',
            border: '1px solid rgba(46, 219, 132, 0.3)',
            borderRadius: '6px',
            color: '#2edb84',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(46, 219, 132, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)';
          }}
        >
          {showAll ? 'Show Less' : `Show All ${allChains.length} Chains`}
        </button>
      )}

      <div className="tvl-footer" style={{ marginTop: '0.75rem' }}>
        <a
          href="https://defillama.com/chains"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from DeFiLlama
        </a>
      </div>
    </div>
  );
}
