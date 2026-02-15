import { NextResponse } from 'next/server';
import { apiCache, cacheKeys, cacheTTL } from '@/lib/cache';

const DEFILLAMA_API = 'https://api.llama.fi';

export interface DexVolumeData {
  name: string;
  displayName: string;
  logo: string;
  total24h: number;
  total7d: number;
  total30d: number;
  change_1d: number;
  change_7d: number;
  change_1m: number;
  totalAllTime: number;
  chains: string[];
  protocolType: string;
}

export async function GET() {
  const cacheKey = 'crypto:dexVolume';

  try {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const response = await fetch(`${DEFILLAMA_API}/overview/dexs`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`DeFi Llama API error: ${response.status}`);
    }

    const data = await response.json();

    // Sort by 24h volume and take top 20
    const topDexes: DexVolumeData[] = (data.protocols || [])
      .filter((p: { total24h?: number }) => p.total24h && p.total24h > 0)
      .sort((a: { total24h: number }, b: { total24h: number }) => b.total24h - a.total24h)
      .slice(0, 20)
      .map((p: {
        name: string;
        displayName?: string;
        logo?: string;
        total24h?: number;
        total7d?: number;
        total30d?: number;
        change_1d?: number;
        change_7d?: number;
        change_1m?: number;
        totalAllTime?: number;
        chains?: string[];
        protocolType?: string;
      }) => ({
        name: p.name,
        displayName: p.displayName || p.name,
        logo: p.logo || '',
        total24h: p.total24h || 0,
        total7d: p.total7d || 0,
        total30d: p.total30d || 0,
        change_1d: p.change_1d || 0,
        change_7d: p.change_7d || 0,
        change_1m: p.change_1m || 0,
        totalAllTime: p.totalAllTime || 0,
        chains: p.chains || [],
        protocolType: p.protocolType || 'dex',
      }));

    // Calculate total 24h volume across all DEXs
    const totalVolume24h = topDexes.reduce((sum, dex) => sum + dex.total24h, 0);

    const result = {
      dexes: topDexes,
      totalVolume24h,
      totalVolume7d: data.total7d || 0,
      totalVolume30d: data.total30d || 0,
      change24h: data.change_1d || 0,
    };

    apiCache.set(cacheKey, result, cacheTTL.LONG);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching DEX volume data:', error);
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      return NextResponse.json(staleCache);
    }
    return NextResponse.json({ error: 'Failed to fetch DEX volume data' }, { status: 500 });
  }
}
