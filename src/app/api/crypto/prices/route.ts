import { NextResponse } from 'next/server';
import { apiCache, cacheKeys, cacheTTL } from '@/lib/cache';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// CoinGecko API response type for /coins/markets endpoint
interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: { times: number; currency: string; percentage: number } | null;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_14d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
}

// Whitelist of popular, trusted tokens that are recognizable by most crypto people
// These are major L1s, established projects, and well-known tokens
const TRUSTED_TOKEN_IDS = new Set([
  // Top L1s
  'bitcoin', 'ethereum', 'solana', 'cardano', 'avalanche-2', 'polkadot',
  'near', 'cosmos', 'algorand', 'tron', 'toncoin', 'sui', 'aptos', 'sei-network',

  // L2s & Scaling
  'matic-network', 'arbitrum', 'optimism', 'starknet', 'immutable-x',

  // DeFi Blue Chips
  'uniswap', 'aave', 'chainlink', 'maker', 'lido-dao', 'the-graph',
  'compound-governance-token', 'curve-dao-token', 'convex-finance',
  'pancakeswap-token', 'sushiswap', 'balancer', 'yearn-finance', 'synthetix-network-token',
  '1inch', 'dydx', 'gmx', 'joe', 'raydium', 'jupiter-exchange-solana',

  // Major Tokens
  'binancecoin', 'ripple', 'dogecoin', 'shiba-inu', 'litecoin',
  'bitcoin-cash', 'stellar', 'monero', 'ethereum-classic', 'filecoin',
  'internet-computer', 'hedera-hashgraph', 'vechain', 'quant-network',
  'fantom', 'theta-token', 'render-token', 'injective-protocol', 'celestia',

  // Stablecoins (for reference)
  'tether', 'usd-coin', 'dai', 'frax', 'true-usd',

  // Gaming / Metaverse
  'the-sandbox', 'decentraland', 'axie-infinity', 'gala', 'enjincoin',
  'illuvium', 'stepn', 'magic',

  // AI / Computing
  'fetch-ai', 'ocean-protocol', 'singularitynet', 'akash-network',
  'bittensor', 'worldcoin-wld',

  // Infrastructure
  'arweave', 'helium', 'iotex', 'livepeer', 'mask-network',

  // Memes (established)
  'pepe', 'floki', 'bonk', 'dogwifcoin',
]);

export async function GET() {
  const cacheKey = cacheKeys.cryptoPrices();

  try {
    // Return cached data if fresh
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch top 100 coins with sparklines and multiple time periods
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=1h,24h,7d,14d,30d`,
      {
        next: { revalidate: 60 },
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const rawData: CoinGeckoCoin[] = await response.json();

    // Filter to only include whitelisted trusted tokens
    const data = rawData.filter((coin) => TRUSTED_TOKEN_IDS.has(coin.id));

    apiCache.set(cacheKey, data, cacheTTL.MEDIUM);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching prices:', error);

    // Return cached data if available, even if stale
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      return NextResponse.json(staleCache);
    }

    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
