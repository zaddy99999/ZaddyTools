'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatCompactNumber, formatPercentage } from '@/lib/crypto/formatters';

interface DefiYieldPool {
  id: string;
  pool: string;
  chain: string;
  protocol: string;
  symbol: string;
  tvl: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  stablecoin: boolean;
  ilRisk: string;
}

const CHAINS = [
  { value: '', label: 'All Chains' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bsc', label: 'BNB Chain' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'avalanche', label: 'Avalanche' },
  { value: 'base', label: 'Base' },
  { value: 'solana', label: 'Solana' },
];

const MIN_TVL_OPTIONS = [
  { value: 100000, label: '$100K+' },
  { value: 1000000, label: '$1M+' },
  { value: 10000000, label: '$10M+' },
  { value: 100000000, label: '$100M+' },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(data.error);
  }
  return data;
};

interface DefiYieldsProps {
  className?: string;
}

export default function DefiYields({ className = '' }: DefiYieldsProps) {
  const [chain, setChain] = useState('');
  const [minTvl, setMinTvl] = useState(1000000);
  const [showStableOnly, setShowStableOnly] = useState(false);

  const queryParams = new URLSearchParams({
    minTvl: minTvl.toString(),
    ...(chain && { chain }),
    limit: '50',
  });

  const { data: pools, error, isLoading } = useSWR<DefiYieldPool[]>(
    `/api/crypto/defi-yields?${queryParams.toString()}`,
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  const displayPools = showStableOnly
    ? (pools || []).filter(p => p.stablecoin)
    : (pools || []);

  const getChainColor = (chainName: string): string => {
    const colors: Record<string, string> = {
      ethereum: '#627EEA',
      bsc: '#F3BA2F',
      polygon: '#8247E5',
      arbitrum: '#28A0F0',
      optimism: '#FF0420',
      avalanche: '#E84142',
      base: '#0052FF',
      solana: '#9945FF',
      fantom: '#1969FF',
      gnosis: '#04795B',
    };
    return colors[chainName.toLowerCase()] || '#888';
  };

  const getIlRiskBadge = (ilRisk: string) => {
    const riskColors: Record<string, string> = {
      no: 'il-risk-none',
      yes: 'il-risk-high',
      unknown: 'il-risk-unknown',
    };
    const riskLabels: Record<string, string> = {
      no: 'No IL',
      yes: 'IL Risk',
      unknown: 'Unknown',
    };
    return {
      className: riskColors[ilRisk] || 'il-risk-unknown',
      label: riskLabels[ilRisk] || ilRisk,
    };
  };

  if (isLoading) {
    return (
      <div className={`defi-yields-card loading ${className}`}>
        <div className="skeleton skeleton-header" />
        <div className="defi-yields-list">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`defi-yields-card ${className}`}>
        <div className="defi-yields-header">
          <p className="widget-label">DeFi Yields Leaderboard</p>
        </div>
        <div className="defi-yields-error">
          <p>Failed to load yield data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`defi-yields-card ${className}`}>
      <div className="defi-yields-header">
        <p className="widget-label">DeFi Yields Leaderboard</p>
        <div className="defi-yields-filters">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="defi-yields-select"
          >
            {CHAINS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={minTvl}
            onChange={(e) => setMinTvl(Number(e.target.value))}
            className="defi-yields-select"
          >
            {MIN_TVL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowStableOnly(!showStableOnly)}
            className={`defi-yields-toggle ${showStableOnly ? 'active' : ''}`}
          >
            Stables
          </button>
        </div>
      </div>

      <div className="defi-yields-columns-header">
        <span className="col-rank">#</span>
        <span className="col-pool">Pool</span>
        <span className="col-protocol">Protocol</span>
        <span className="col-chain">Chain</span>
        <span className="col-tvl">TVL</span>
        <span className="col-apy">APY</span>
      </div>

      <div className="defi-yields-list">
        {displayPools.length === 0 ? (
          <div className="defi-yields-empty">
            <p>No pools found matching criteria</p>
          </div>
        ) : (
          displayPools.map((pool, index) => {
            const ilRiskBadge = getIlRiskBadge(pool.ilRisk);
            return (
              <div key={pool.id} className="defi-yields-row">
                <span className="col-rank">{index + 1}</span>
                <div className="col-pool">
                  <span className="pool-name">{pool.pool}</span>
                  <div className="pool-badges">
                    {pool.stablecoin && (
                      <span className="pool-badge stable-badge">Stable</span>
                    )}
                    <span className={`pool-badge ${ilRiskBadge.className}`}>
                      {ilRiskBadge.label}
                    </span>
                  </div>
                </div>
                <span className="col-protocol">{pool.protocol}</span>
                <span
                  className="col-chain"
                  style={{ color: getChainColor(pool.chain) }}
                >
                  {pool.chain}
                </span>
                <span className="col-tvl">{formatCompactNumber(pool.tvl, true)}</span>
                <div className="col-apy">
                  <span className="apy-total">{formatPercentage(pool.apy)}</span>
                  {(pool.apyBase !== null || pool.apyReward !== null) && (
                    <span className="apy-breakdown">
                      {pool.apyBase !== null && pool.apyBase > 0 && (
                        <span className="apy-base">Base: {formatPercentage(pool.apyBase)}</span>
                      )}
                      {pool.apyReward !== null && pool.apyReward > 0 && (
                        <span className="apy-reward">Reward: {formatPercentage(pool.apyReward)}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="defi-yields-footer">
        <a
          href="https://defillama.com/yields"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from DeFiLlama Yields
        </a>
      </div>
    </div>
  );
}
