import { NextResponse } from 'next/server';
import { apiCache, cacheKeys, cacheTTL } from '@/lib/cache';

const DEFILLAMA_API = 'https://api.llama.fi';

export async function GET() {
  const cacheKey = cacheKeys.cryptoTvl();

  try {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch chains for total TVL - simpler and more reliable
    const chainsRes = await fetch(`${DEFILLAMA_API}/v2/chains`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });

    if (!chainsRes.ok) {
      throw new Error(`DeFi Llama API error: ${chainsRes.status}`);
    }

    const chains = await chainsRes.json();

    // Calculate total TVL from all chains
    const totalTvl = Array.isArray(chains)
      ? chains.reduce((sum: number, chain: { tvl?: number }) => sum + (chain.tvl || 0), 0)
      : 0;

    const result = { totalTvl };

    apiCache.set(cacheKey, result, cacheTTL.LONG);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching TVL data:', error);
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      return NextResponse.json(staleCache);
    }
    // Return a fallback value so the UI doesn't break
    return NextResponse.json({ totalTvl: 0, error: 'Failed to fetch' });
  }
}
