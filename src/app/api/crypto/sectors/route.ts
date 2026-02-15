import { NextResponse } from 'next/server';
import { apiCache, cacheKeys, cacheTTL } from '@/lib/cache';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface CoinGeckoCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  volume_24h: number;
  top_3_coins: string[];
}

// Priority sectors with clean display names
const prioritySectors: Record<string, string> = {
  'layer-1': 'Layer 1',
  'layer-2': 'Layer 2',
  'decentralized-finance-defi': 'DeFi',
  'meme-token': 'Memecoins',
  'stablecoins': 'Stablecoins',
  'non-fungible-tokens-nft': 'NFTs',
  'gaming': 'Gaming',
  'artificial-intelligence': 'AI',
  'real-world-assets-rwa': 'RWA',
  'decentralized-exchange': 'DEX',
  'lending-borrowing': 'Lending',
  'liquid-staking-tokens': 'Liquid Staking',
  'oracle': 'Oracles',
  'privacy-coins': 'Privacy',
  'infrastructure': 'Infrastructure',
  'storage': 'Storage',
  'bridge': 'Bridges',
  'governance': 'Governance',
  'metaverse': 'Metaverse',
  'yield-farming': 'Yield',
};

export async function GET() {
  const cacheKey = cacheKeys.cryptoSectors();

  try {
    // Return cached data if fresh
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const response = await fetch(
      `${COINGECKO_API}/coins/categories?order=market_cap_desc`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const categories: CoinGeckoCategory[] = await response.json();

    // Filter to priority sectors and map to clean names
    const priorityIds = Object.keys(prioritySectors);
    const filteredCategories = categories.filter(cat =>
      priorityIds.includes(cat.id) && cat.market_cap && cat.market_cap > 0
    );

    // Sort by market cap and take top 15
    const sectors = filteredCategories
      .sort((a, b) => b.market_cap - a.market_cap)
      .slice(0, 15)
      .map(cat => ({
        id: cat.id,
        name: prioritySectors[cat.id] || cat.name,
        marketCap: cat.market_cap,
        change24h: cat.market_cap_change_24h || 0,
        volume24h: cat.volume_24h || 0,
        topCoins: cat.top_3_coins || [],
      }));

    apiCache.set(cacheKey, sectors, cacheTTL.LONG);

    return NextResponse.json(sectors);
  } catch (error) {
    console.error('Error fetching sectors:', error);

    // Return cached data if available, even if stale
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      return NextResponse.json(staleCache);
    }

    return NextResponse.json({ error: 'Failed to fetch sectors' }, { status: 500 });
  }
}
