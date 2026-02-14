'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import NavBar from '@/components/NavBar';
import ErrorBoundary, { CardErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalMetrics, FearGreedIndex, TopMovers, CoinRankings, ChainFlows, VCFunding, NetFlows, NFTLeaderboard } from '@/components/crypto';
import { useCryptoPrices, useGlobalMetrics, useChains } from '@/lib/crypto/hooks';

// Dynamically import DraggableDashboard to avoid SSR issues with dnd-kit
const DraggableDashboard = dynamic(() => import('@/components/DraggableDashboard'), { ssr: false });

// Dynamically import SectorPerformance separately as it contains complex rendering
const SectorPerformance = dynamic(() => import('@/components/crypto/SectorPerformance').then(mod => ({ default: mod.default })), { ssr: false });

export default function MarketAnalysisPage() {
  const { prices, isLoading: pricesLoading, lastUpdated: pricesUpdated } = useCryptoPrices();
  const { global, fearGreed, gas, isLoading: globalLoading, lastUpdated: globalUpdated } = useGlobalMetrics();
  const { chains, isLoading: chainsLoading } = useChains();

  const modules = useMemo(() => [
    { id: 'top-movers', component: <CardErrorBoundary><TopMovers coins={prices || []} isLoading={pricesLoading} lastUpdated={pricesUpdated} /></CardErrorBoundary> },
    { id: 'market-heatmap', component: <CardErrorBoundary><SectorPerformance coins={prices || []} isLoading={pricesLoading} /></CardErrorBoundary> },
    { id: 'nft-leaderboard', component: <CardErrorBoundary><NFTLeaderboard /></CardErrorBoundary> },
    { id: 'coin-rankings', component: <CardErrorBoundary><CoinRankings coins={prices || []} isLoading={pricesLoading} lastUpdated={pricesUpdated} /></CardErrorBoundary> },
    { id: 'chain-tvl', component: <CardErrorBoundary><ChainFlows chains={chains || []} isLoading={chainsLoading} /></CardErrorBoundary> },
    { id: 'net-flows', component: <CardErrorBoundary><NetFlows /></CardErrorBoundary> },
    { id: 'vc-funding', component: <CardErrorBoundary><VCFunding /></CardErrorBoundary> },
  ], [prices, pricesLoading, pricesUpdated, chains, chainsLoading]);

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
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Market Analysis</p>
              </div>
            </div>
            <NavBar />
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="crypto-dashboard">
          {/* Top row - key metrics side by side */}
          <div className="dashboard-top-section">
            <CardErrorBoundary><GlobalMetrics data={global} gas={gas} isLoading={globalLoading} lastUpdated={globalUpdated} /></CardErrorBoundary>
            <CardErrorBoundary><FearGreedIndex data={fearGreed} isLoading={globalLoading} /></CardErrorBoundary>
          </div>

          {/* Draggable modules */}
          <DraggableDashboard modules={modules} storageKey="zaddytools-market-analysis-order" />
        </div>
      </main>
    </ErrorBoundary>
  );
}
