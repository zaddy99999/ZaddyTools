'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import NavBar from '@/components/NavBar';
import ErrorBoundary, { CardErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalMetrics, FearGreedIndex, VCFunding, NetFlows, NFTLeaderboard, DexVolume, EconomicCalendar, ETFFlows, GoogleTrends, ProjectRevenue, TvlByChain, TokensLeaderboard } from '@/components/crypto';
import { useCryptoPrices, useGlobalMetrics } from '@/lib/crypto/hooks';
import { formatPercentage } from '@/lib/crypto/formatters';

// Dynamically import DraggableDashboard to avoid SSR issues with dnd-kit
const DraggableDashboard = dynamic(() => import('@/components/DraggableDashboard'), { ssr: false });

// Dynamically import SectorPerformance separately as it contains complex rendering
const SectorPerformance = dynamic(() => import('@/components/crypto/SectorPerformance').then(mod => ({ default: mod.default })), { ssr: false });

export default function MarketAnalysisPage() {
  const { prices, isLoading: pricesLoading } = useCryptoPrices();
  const { global, fearGreed, isLoading: globalLoading } = useGlobalMetrics();

  // Ordered by data volatility: most frequently changing at top, stable data at bottom
  const modules = useMemo(() => [
    // High volatility - changes constantly
    { id: 'market-heatmap', component: <CardErrorBoundary><SectorPerformance coins={prices || []} isLoading={pricesLoading} /></CardErrorBoundary> },
    { id: 'tokens-leaderboard', component: <CardErrorBoundary><TokensLeaderboard coins={prices || []} isLoading={pricesLoading} /></CardErrorBoundary> },
    { id: 'nft-leaderboard', component: <CardErrorBoundary><NFTLeaderboard /></CardErrorBoundary> },
    // Medium volatility - changes daily/weekly
    { id: 'net-flows', component: <CardErrorBoundary><NetFlows /></CardErrorBoundary> },
    { id: 'dex-volume', component: <CardErrorBoundary><DexVolume /></CardErrorBoundary> },
    { id: 'etf-flows', component: <CardErrorBoundary><ETFFlows /></CardErrorBoundary> },
    { id: 'protocol-revenue', component: <CardErrorBoundary><ProjectRevenue /></CardErrorBoundary> },
    { id: 'economic-calendar', component: <CardErrorBoundary><EconomicCalendar /></CardErrorBoundary> },
    // Low volatility - changes slowly
    { id: 'google-trends', component: <CardErrorBoundary><GoogleTrends /></CardErrorBoundary> },
    { id: 'vc-funding', component: <CardErrorBoundary><VCFunding /></CardErrorBoundary> },
    { id: 'tvl-by-chain', component: <CardErrorBoundary><TvlByChain /></CardErrorBoundary> },
  ], [prices, pricesLoading]);

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
          {/* Top row - key metrics side by side (includes BTC/ETH/SOL prices) */}
          <div className="dashboard-top-section">
            <CardErrorBoundary><GlobalMetrics data={global} prices={prices} isLoading={globalLoading || pricesLoading} /></CardErrorBoundary>
            <CardErrorBoundary><FearGreedIndex data={fearGreed} isLoading={globalLoading} /></CardErrorBoundary>
          </div>

          {/* Draggable modules */}
          <DraggableDashboard modules={modules} storageKey="zaddytools-market-analysis-order" />
        </div>
      </main>
    </ErrorBoundary>
  );
}
