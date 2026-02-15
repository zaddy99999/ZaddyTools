import { NextResponse } from 'next/server';
import { apiCache, cacheTTL } from '@/lib/cache';

const DEFILLAMA_YIELDS_API = 'https://yields.llama.fi';

interface PoolData {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number;
  rewardTokens: string[] | null;
  il7d: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
  apyBaseInception: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  poolMeta: string | null;
  underlyingTokens: string[] | null;
  predictedClass: string | null;
  predictedProbability: number | null;
  binnedConfidence: number | null;
}

export interface DefiYieldPool {
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

const CACHE_KEY = 'crypto:defi-yields';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minTvl = Number(searchParams.get('minTvl')) || 1000000; // Default $1M min TVL
  const chain = searchParams.get('chain') || null;
  const maxApy = Number(searchParams.get('maxApy')) || 1000; // Filter out >1000% APYs
  const limit = Number(searchParams.get('limit')) || 50;

  try {
    const cacheKey = `${CACHE_KEY}:${minTvl}:${chain || 'all'}:${maxApy}:${limit}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const response = await fetch(`${DEFILLAMA_YIELDS_API}/pools`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`DeFi Llama Yields API error: ${response.status}`);
    }

    const result = await response.json();
    const pools: PoolData[] = result.data || [];

    // Filter and transform pools
    const filteredPools: DefiYieldPool[] = pools
      .filter((p: PoolData) => {
        // Filter by TVL
        if (p.tvlUsd < minTvl) return false;

        // Filter out unrealistic APYs (likely scams or temporary)
        if (p.apy > maxApy || p.apy <= 0) return false;

        // Filter by chain if specified
        if (chain && p.chain.toLowerCase() !== chain.toLowerCase()) return false;

        return true;
      })
      .sort((a: PoolData, b: PoolData) => b.apy - a.apy)
      .slice(0, limit)
      .map((p: PoolData): DefiYieldPool => ({
        id: p.pool,
        pool: p.poolMeta ? `${p.symbol} (${p.poolMeta})` : p.symbol,
        chain: p.chain,
        protocol: p.project,
        symbol: p.symbol,
        tvl: p.tvlUsd,
        apy: p.apy,
        apyBase: p.apyBase,
        apyReward: p.apyReward,
        stablecoin: p.stablecoin,
        ilRisk: p.ilRisk || 'unknown',
      }));

    apiCache.set(cacheKey, filteredPools, cacheTTL.LONG);
    return NextResponse.json(filteredPools);
  } catch (error) {
    console.error('Error fetching DeFi yields data:', error);
    const staleCache = apiCache.get(CACHE_KEY);
    if (staleCache) {
      return NextResponse.json(staleCache);
    }
    return NextResponse.json({ error: 'Failed to fetch DeFi yields data' }, { status: 500 });
  }
}
