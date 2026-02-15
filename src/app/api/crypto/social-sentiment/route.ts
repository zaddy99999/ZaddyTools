import { NextResponse } from 'next/server';

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  marketCapRank: number | null;
  priceChange24h?: number;
  score?: number;
}

export interface SocialSentimentData {
  trending: TrendingCoin[];
  lastUpdated: string;
  source: string;
}

let cache: { data: SocialSentimentData; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Return cached data if still valid
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    const trending: TrendingCoin[] = [];
    let source = 'unknown';

    // Try CoinGecko trending endpoint
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        source = 'CoinGecko';

        if (data.coins && Array.isArray(data.coins)) {
          for (const item of data.coins) {
            const coin = item.item;
            if (coin) {
              trending.push({
                id: coin.id || '',
                name: coin.name || '',
                symbol: coin.symbol || '',
                thumb: coin.thumb || coin.small || coin.large || '',
                marketCapRank: coin.market_cap_rank || null,
                priceChange24h: coin.data?.price_change_percentage_24h?.usd,
                score: coin.score !== undefined ? coin.score + 1 : undefined,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('CoinGecko trending error:', error);
    }

    // If CoinGecko fails, try alternative sources
    if (trending.length === 0) {
      // Try CoinGecko search for popular coins as fallback
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=15&page=1&sparkline=false', {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          source = 'CoinGecko (Top Volume)';

          if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
              const coin = data[i];
              trending.push({
                id: coin.id || '',
                name: coin.name || '',
                symbol: coin.symbol || '',
                thumb: coin.image || '',
                marketCapRank: coin.market_cap_rank || null,
                priceChange24h: coin.price_change_percentage_24h,
                score: i + 1,
              });
            }
          }
        }
      } catch (error) {
        console.error('CoinGecko markets fallback error:', error);
      }
    }

    const result: SocialSentimentData = {
      trending,
      lastUpdated: new Date().toISOString(),
      source,
    };

    // Cache the result
    cache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching social sentiment:', error);

    // Return cached data if available on error
    if (cache) {
      return NextResponse.json(cache.data);
    }

    // Return empty data on complete failure
    return NextResponse.json({
      trending: [],
      lastUpdated: new Date().toISOString(),
      source: 'unavailable',
    });
  }
}
