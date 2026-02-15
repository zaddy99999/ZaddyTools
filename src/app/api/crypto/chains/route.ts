import { NextResponse } from 'next/server';
import { apiCache, cacheKeys, cacheTTL } from '@/lib/cache';

const DEFILLAMA_API = 'https://api.llama.fi';

export async function GET() {
  const cacheKey = cacheKeys.cryptoChains();

  try {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const response = await fetch(`${DEFILLAMA_API}/v2/chains`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`DeFi Llama API error: ${response.status}`);
    }

    const chains = await response.json();

    // Sort by TVL and take top 15
    const topChains = chains
      .filter((c: { tvl: number }) => c.tvl && c.tvl > 0)
      .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
      .slice(0, 75)
      .map((c: {
        gecko_id: string;
        name: string;
        tvl: number;
        tokenSymbol: string;
        chainId: number;
      }) => ({
        id: c.gecko_id || c.name.toLowerCase(),
        name: c.name,
        tvl: c.tvl,
        symbol: c.tokenSymbol || '',
        chainId: c.chainId,
      }));

    apiCache.set(cacheKey, topChains, cacheTTL.LONG);
    return NextResponse.json(topChains);
  } catch (error) {
    console.error('Error fetching chain data:', error);
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      return NextResponse.json(staleCache);
    }
    return NextResponse.json({ error: 'Failed to fetch chain data' }, { status: 500 });
  }
}
