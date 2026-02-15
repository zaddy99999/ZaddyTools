import { NextResponse } from 'next/server';
import { apiCache, cacheKeys, cacheTTL } from '@/lib/cache';

const DEFILLAMA_API = 'https://api.llama.fi';

interface Protocol {
  id: string;
  name: string;
  tvl: number;
  change_1d?: number;
  category: string;
}

interface CategoryData {
  name: string;
  tvl: number;
  change24h: number;
  protocolCount: number;
  topProtocols: string[];
  percentage: number;
}

// Priority categories to show (others will be grouped into "Other")
const PRIORITY_CATEGORIES = [
  'Lending',
  'Dexes',
  'Liquid Staking',
  'CDP',
  'Bridge',
  'Derivatives',
  'Yield',
  'RWA',
  'Restaking',
  'Services',
  'Yield Aggregator',
  'Leveraged Farming',
];

// Cache key for TVL categories
const tvlCategoriesCacheKey = () => 'crypto:tvl-categories';

export async function GET() {
  const cacheKey = tvlCategoriesCacheKey();

  try {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const response = await fetch(`${DEFILLAMA_API}/protocols`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`DeFi Llama API error: ${response.status}`);
    }

    const protocols: Protocol[] = await response.json();

    // Filter valid protocols and aggregate by category
    const categoryMap = new Map<string, {
      tvl: number;
      change24hWeighted: number;
      protocolCount: number;
      protocols: { name: string; tvl: number }[];
    }>();

    let totalTvl = 0;

    for (const protocol of protocols) {
      if (!protocol.tvl || protocol.tvl <= 0 || !protocol.category) continue;

      totalTvl += protocol.tvl;

      const category = protocol.category;
      const existing = categoryMap.get(category);

      if (existing) {
        existing.tvl += protocol.tvl;
        existing.protocolCount += 1;
        // Weight the change by TVL for accurate aggregate change
        if (protocol.change_1d !== undefined) {
          existing.change24hWeighted += protocol.change_1d * protocol.tvl;
        }
        existing.protocols.push({ name: protocol.name, tvl: protocol.tvl });
      } else {
        categoryMap.set(category, {
          tvl: protocol.tvl,
          change24hWeighted: protocol.change_1d !== undefined ? protocol.change_1d * protocol.tvl : 0,
          protocolCount: 1,
          protocols: [{ name: protocol.name, tvl: protocol.tvl }],
        });
      }
    }

    // Convert to array and calculate percentages
    const categories: CategoryData[] = [];
    let otherTvl = 0;
    let otherChange = 0;
    let otherCount = 0;
    const otherProtocols: { name: string; tvl: number }[] = [];

    categoryMap.forEach((data, name) => {
      if (PRIORITY_CATEGORIES.includes(name)) {
        // Sort protocols by TVL and take top 3
        const topProtocols = data.protocols
          .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
          .slice(0, 3)
          .map((p: { name: string }) => p.name);

        categories.push({
          name,
          tvl: data.tvl,
          change24h: data.tvl > 0 ? data.change24hWeighted / data.tvl : 0,
          protocolCount: data.protocolCount,
          topProtocols,
          percentage: totalTvl > 0 ? (data.tvl / totalTvl) * 100 : 0,
        });
      } else {
        // Aggregate into "Other"
        otherTvl += data.tvl;
        otherChange += data.change24hWeighted;
        otherCount += data.protocolCount;
        otherProtocols.push(...data.protocols);
      }
    });

    // Add "Other" category if there's data
    if (otherTvl > 0) {
      const topOtherProtocols = otherProtocols
        .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
        .slice(0, 3)
        .map((p: { name: string }) => p.name);

      categories.push({
        name: 'Other',
        tvl: otherTvl,
        change24h: otherTvl > 0 ? otherChange / otherTvl : 0,
        protocolCount: otherCount,
        topProtocols: topOtherProtocols,
        percentage: totalTvl > 0 ? (otherTvl / totalTvl) * 100 : 0,
      });
    }

    // Sort by TVL descending
    categories.sort((a, b) => b.tvl - a.tvl);

    const result = {
      categories,
      totalTvl,
      updatedAt: new Date().toISOString(),
    };

    apiCache.set(cacheKey, result, cacheTTL.LONG);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching TVL categories:', error);
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      return NextResponse.json(staleCache);
    }
    return NextResponse.json({ error: 'Failed to fetch TVL categories' }, { status: 500 });
  }
}
