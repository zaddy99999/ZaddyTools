import { NextRequest, NextResponse } from 'next/server';
import { apiCache, cacheKeys, cacheTTL } from '@/lib/cache';
import { checkRateLimit } from '@/lib/rateLimit';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface MemeCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 30 });
  if (rateLimitResponse) return rateLimitResponse;

  const cacheKey = 'crypto:memecoins';

  try {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch meme coins category from CoinGecko
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h,7d`,
      {
        next: { revalidate: 120 },
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: MemeCoin[] = await response.json();

    apiCache.set(cacheKey, data, cacheTTL.MEDIUM);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching memecoins:', error);

    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      return NextResponse.json(staleCache);
    }

    return NextResponse.json({ error: 'Failed to fetch memecoins' }, { status: 500 });
  }
}
