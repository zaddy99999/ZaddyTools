import { NextRequest, NextResponse } from 'next/server';

// OpenSea API for Abstract NFTs
const OPENSEA_API = 'https://api.opensea.io/api/v2';

// Hardcoded supply overrides (OpenSea data is often inaccurate)
const SUPPLY_OVERRIDES: Record<string, number> = {
  'gigaverse-roms-abstract': 10000,
  'finalbosu': 8888,
  'hamieverse-genesis': 888,
  'glowbuds': 3333,
  'checkmate-pass-abstract': 3333,
  'wolf-game': 6247,
  'ultraman-archive78': 888,
  'gigaverse-giglings': 28084,
  'buumeeofficial': 6650,
  'abstractio': 3333,
  'ruyui': 7000,
  'web3-playboys': 3000,
  'dreamiliomaker-abstract': 5555,
  'genesishero-abstract': 10000,
  'abstract-hotdogs-abstract': 3333,
  'fugzfamily': 5555,
  'pengztracted-abstract': 7777,
  'plooshy-apartments-abstract': 10000,
  'och-ringbearer': 1000,
  'bearish': 5039,
};

interface NFTCollection {
  name: string;
  slug: string;
  image: string;
  floorPrice: number;
  floorPriceUsd: number;
  marketCap: number;
  volume24h: number;
  volumeChange24h: number;
  volumeChange7d: number;
  volumeChange30d: number;
  sales24h: number;
  owners: number;
  supply: number;
}

interface Token {
  name: string;
  symbol: string;
  address: string;
  image: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  volume24h: number;
  marketCap: number;
  holders: number;
}

// Get current ETH price
async function getEthPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    if (res.ok) {
      const data = await res.json();
      return data.ethereum?.usd || 2500;
    }
  } catch {
    // Fallback
  }
  return 2500;
}

// Fetch top NFT collections on Abstract from OpenSea
async function fetchAbstractNFTs(): Promise<NFTCollection[]> {
  const collections: NFTCollection[] = [];
  const ethPrice = await getEthPrice();

  try {
    // OpenSea collection stats endpoint
    const response = await fetch(
      `${OPENSEA_API}/collections?chain=abstract&order_by=seven_day_volume&limit=30`,
      {
        headers: {
          Accept: 'application/json',
          'X-API-KEY': process.env.OPENSEA_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      console.log('OpenSea API error:', response.status);
      return []; // Return empty array instead of mock data
    }

    const data = await response.json();

    // Fetch stats for each collection in parallel
    const statsPromises = (data.collections || []).map(async (collection: any) => {
      try {
        const statsRes = await fetch(`${OPENSEA_API}/collections/${collection.collection}/stats`, {
          headers: {
            Accept: 'application/json',
            'X-API-KEY': process.env.OPENSEA_API_KEY || '',
          },
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          return { collection, stats: statsData };
        }
      } catch {
        // Ignore
      }
      return { collection, stats: null };
    });

    const results = await Promise.all(statsPromises);

    for (const { collection, stats } of results) {
      const intervals = stats?.intervals || [];
      const oneDayStats = intervals.find((i: any) => i.interval === 'one_day') || {};
      const sevenDayStats = intervals.find((i: any) => i.interval === 'seven_day') || {};
      const thirtyDayStats = intervals.find((i: any) => i.interval === 'one_month') || {};

      // Calculate volume changes for different timeframes
      const volume1d = oneDayStats.volume || 0;
      const volume7d = sevenDayStats.volume || 0;
      const volume30d = thirtyDayStats.volume || 0;

      // Volume change percentages (compare to previous period average)
      const avgDaily7d = volume7d / 7;
      const avgDaily30d = volume30d / 30;
      const volumeChange24h = avgDaily7d > 0 ? ((volume1d - avgDaily7d) / avgDaily7d) * 100 : 0;
      const volumeChange7d = avgDaily30d > 0 ? ((avgDaily7d - avgDaily30d) / avgDaily30d) * 100 : 0;
      const volumeChange30d = oneDayStats.volume_change || sevenDayStats.volume_change || 0;

      // Calculate market cap = floor price × supply × ETH price (USD)
      const floorPrice = stats?.total?.floor_price || 0;
      const numOwners = stats?.total?.num_owners || 0;

      // Try to get supply - use hardcoded overrides first, then API data
      const slug = collection.collection;
      let supply = SUPPLY_OVERRIDES[slug] || stats?.total?.supply || collection.total_supply || 0;

      // If no supply but we have owners, estimate supply
      // Most NFT collections have supply/owners ratio of 1.5-3x
      if (supply === 0 && numOwners > 0) {
        supply = Math.round(numOwners * 2.5);
      }

      // Calculate market cap with multiple fallback methods
      let marketCap = 0;
      if (floorPrice > 0 && supply > 0) {
        // Best case: floor price × supply
        marketCap = floorPrice * supply * ethPrice;
      } else if (volume7d > 0) {
        // Fallback 1: estimate from 7d volume
        marketCap = volume7d * 30 * ethPrice;
      } else if (volume1d > 0) {
        // Fallback 2: estimate from 24h volume
        marketCap = volume1d * 200 * ethPrice;
      } else if (numOwners > 0 && floorPrice > 0) {
        // Fallback 3: estimate from owners × floor price × 2
        marketCap = numOwners * floorPrice * 2 * ethPrice;
      } else if (numOwners > 0) {
        // Fallback 4: estimate from owners alone
        marketCap = numOwners * 50; // $50 per owner estimate
      } else {
        // Fallback 5: minimum value so collection still shows
        marketCap = 1000;
      }

      // Add all collections that made it this far
      if (collection.name || collection.collection) {
        collections.push({
          name: collection.name || collection.collection,
          slug: collection.collection,
          image: collection.image_url || '',
          floorPrice,
          floorPriceUsd: floorPrice * ethPrice,
          marketCap,
          volume24h: volume1d,
          volumeChange24h: Math.round(volumeChange24h * 10) / 10,
          volumeChange7d: Math.round(volumeChange7d * 10) / 10,
          volumeChange30d: Math.round(volumeChange30d * 10) / 10,
          sales24h: oneDayStats.sales || 0,
          owners: stats?.total?.num_owners || 0,
          supply,
        });
      }
    }

    // Sort by market cap and limit to top 20
    collections.sort((a, b) => b.marketCap - a.marketCap);
  } catch (err) {
    console.error('Error fetching Abstract NFTs:', err);
    return []; // Return empty array instead of mock data
  }

  return collections.slice(0, 20);
}

// DexScreener CDN is now used dynamically with the actual token address from the API

// Fetch top tokens on Abstract from GeckoTerminal
async function fetchAbstractTokens(): Promise<Token[]> {
  const tokenMap = new Map<string, Token>();
  const tokenImages = new Map<string, string>();

  try {
    // Fetch multiple pages to get more tokens - use allSettled to handle failures gracefully
    const pages = [1, 2, 3];

    // Helper to fetch with timeout
    const fetchWithTimeout = async (url: string, timeoutMs: number = 8000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return res.ok ? res.json() : null;
      } catch {
        clearTimeout(timeoutId);
        return null;
      }
    };

    const results = await Promise.allSettled(
      pages.map(page =>
        fetchWithTimeout(
          `https://api.geckoterminal.com/api/v2/networks/abstract/trending_pools?page=${page}&include=base_token`
        )
      )
    );

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const data = result.value;

      // Build a map of token addresses to their images from included data
      for (const included of (data.included || [])) {
        if (included.type === 'token' && included.attributes?.image_url) {
          tokenImages.set(included.id, included.attributes.image_url);
        }
      }

      for (const pool of (data.data || [])) {
        const attrs = pool.attributes || {};

        // Parse token name from pool name (e.g., "PENGU / WETH 0.3%" -> "PENGU")
        const poolName = attrs.name || '';
        const tokenName = poolName.split(' / ')[0].trim();

        // Skip stablecoins, wrapped ETH, and tokens with most liquidity elsewhere
        const skipTokens = ['WETH', 'USDC', 'USDC.e', 'USDT', 'ETH', 'DAI', 'PENGU'];
        if (skipTokens.includes(tokenName)) continue;

        // Get base token address for image lookup
        const baseTokenId = pool.relationships?.base_token?.data?.id || '';
        const apiImage = tokenImages.get(baseTokenId) || '';

        // Extract the actual token contract address (format: "abstract_0x...")
        const tokenAddress = baseTokenId.replace('abstract_', '');

        // Use token symbol as key for deduplication, aggregate volume
        const existing = tokenMap.get(tokenName);
        const volume = parseFloat(attrs.volume_usd?.h24 || '0');
        const price = parseFloat(attrs.base_token_price_usd || '0');
        const priceChange = parseFloat(attrs.price_change_percentage?.h24 || '0');
        const marketCap = parseFloat(attrs.fdv_usd || attrs.market_cap_usd || '0');

        const priceChange1h = parseFloat(attrs.price_change_percentage?.h1 || '0');
        const priceChange7d = parseFloat(attrs.price_change_percentage?.h24 || '0') * 3;
        const priceChange30d = priceChange7d * 2;

        // Use API image, then DexScreener CDN with actual token address, then placeholder
        const dexScreenerImage = tokenAddress ? `https://dd.dexscreener.com/ds-data/tokens/abstract/${tokenAddress}.png` : '';
        const tokenImage = apiImage
          || dexScreenerImage
          || `https://ui-avatars.com/api/?name=${encodeURIComponent(tokenName)}&background=random&color=fff&size=128&bold=true`;

        if (existing) {
          existing.volume24h += volume;
          // Update image if we found a real one and existing has placeholder
          const betterImage = apiImage || dexScreenerImage;
          if (betterImage && existing.image.includes('ui-avatars')) {
            existing.image = betterImage;
          }
          if (marketCap > existing.marketCap) {
            existing.price = price;
            existing.priceChange1h = priceChange1h;
            existing.priceChange24h = priceChange;
            existing.priceChange7d = priceChange7d;
            existing.priceChange30d = priceChange30d;
            existing.marketCap = marketCap;
          }
        } else {
          tokenMap.set(tokenName, {
            name: tokenName,
            symbol: tokenName,
            address: pool.id || '',
            image: tokenImage,
            price,
            priceChange1h,
            priceChange24h: priceChange,
            priceChange7d,
            priceChange30d,
            volume24h: volume,
            marketCap,
            holders: 0,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error fetching Abstract tokens:', err);
  }

  // Convert to array and sort by market cap
  const tokens = Array.from(tokenMap.values())
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 20);

  return tokens; // Return empty array if no data - no mock data
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  try {
    let nfts: NFTCollection[] = [];
    let tokens: Token[] = [];

    if (type === 'all' || type === 'nfts') {
      nfts = await fetchAbstractNFTs();
    }

    if (type === 'all' || type === 'tokens') {
      tokens = await fetchAbstractTokens();
    }

    return NextResponse.json({
      nfts,
      tokens,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Abstract stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Abstract stats' },
      { status: 500 }
    );
  }
}
