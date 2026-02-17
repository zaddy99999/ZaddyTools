import { NextResponse } from 'next/server';

const OPENSEA_API = 'https://api.opensea.io/api/v2';

interface OpenSeaCollection {
  collection: string;
  name: string;
  description: string;
  image_url: string;
  banner_image_url: string;
  owner: string;
  safelist_status: string;
  category: string;
  is_disabled: boolean;
  is_nsfw: boolean;
  trait_offers_enabled: boolean;
  opensea_url: string;
  contracts: Array<{
    address: string;
    chain: string;
  }>;
}

interface CollectionStats {
  total: {
    volume: number;
    sales: number;
    average_price: number;
    num_owners: number;
    market_cap: number;
    floor_price: number;
    floor_price_symbol: string;
  };
  intervals: Array<{
    interval: string;
    volume: number;
    volume_diff: number;
    volume_change: number;
    sales: number;
    sales_diff: number;
    average_price: number;
  }>;
}

// Map period param to OpenSea interval name
const periodToInterval: Record<string, string> = {
  '24h': 'one_day',
  '7d': 'seven_day',
  '30d': 'thirty_day',
};

// Separate cache per period with size limit to prevent memory leaks
const MAX_CACHE_ENTRIES = 50;
const caches: Record<string, { data: unknown; timestamp: number }> = {};
const cacheInsertOrder: string[] = []; // Track insertion order for LRU eviction
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

// Helper to add cache entry with eviction
function setCacheEntry(key: string, data: unknown) {
  // If key already exists, remove it from order tracking
  const existingIndex = cacheInsertOrder.indexOf(key);
  if (existingIndex !== -1) {
    cacheInsertOrder.splice(existingIndex, 1);
  }

  // Evict oldest entries if we're at the limit
  while (cacheInsertOrder.length >= MAX_CACHE_ENTRIES) {
    const oldestKey = cacheInsertOrder.shift();
    if (oldestKey) {
      delete caches[oldestKey];
    }
  }

  // Add new entry
  caches[key] = { data, timestamp: Date.now() };
  cacheInsertOrder.push(key);
}

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch stats with retry
async function fetchCollectionStats(
  collection: OpenSeaCollection,
  apiKey: string,
  intervalName: string
): Promise<{
  slug: string;
  name: string;
  image: string;
  floorPrice: number;
  floorPriceSymbol: string;
  change: number;
  volume: number;
  owners: number;
  marketCap: number;
  url: string;
  chain: string;
} | null> {
  try {
    const statsResponse = await fetch(
      `${OPENSEA_API}/collections/${collection.collection}/stats`,
      {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': apiKey,
        },
      }
    );

    if (statsResponse.ok) {
      const stats: CollectionStats = await statsResponse.json();

      // Get interval data for the requested period
      const intervalData = stats.intervals?.find(i => i.interval === intervalName);

      // Calculate volume change as a percentage
      let volumeChange = 0;
      const volume = intervalData?.volume ?? 0;
      const apiVolumeChange = intervalData?.volume_change;

      // Use volume_change from API if available and reasonable
      if (apiVolumeChange !== undefined && apiVolumeChange !== null && !isNaN(apiVolumeChange) && isFinite(apiVolumeChange)) {
        // API typically returns as decimal (0.15 = 15%)
        const asPercentage = apiVolumeChange * 100;
        // Only use if it's in a reasonable range (-99% to +500%)
        if (asPercentage >= -99 && asPercentage <= 500) {
          volumeChange = asPercentage;
        }
      }
      // If no valid change data, default to 0 (neutral)

      // Get the primary chain from the collection's contracts
      const primaryChain = collection.contracts?.[0]?.chain || 'ethereum';

      return {
        slug: collection.collection,
        name: collection.name,
        image: collection.image_url,
        floorPrice: stats.total?.floor_price ?? 0,
        floorPriceSymbol: stats.total?.floor_price_symbol || 'ETH',
        change: volumeChange,
        volume: volume,
        owners: stats.total?.num_owners ?? 0,
        marketCap: stats.total?.market_cap ?? 0,
        url: collection.opensea_url,
        chain: primaryChain,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';
    const chain = searchParams.get('chain') || 'all';
    const intervalName = periodToInterval[period] || 'one_day';
    const cacheKey = `${period}-${chain}`;

    const apiKey = process.env.OPENSEA_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'NFT service not configured' }, { status: 500 });
    }

    // Return cached data if fresh
    if (caches[cacheKey] && Date.now() - caches[cacheKey].timestamp < CACHE_DURATION) {
      return NextResponse.json(caches[cacheKey].data);
    }

    // Build API URL with optional chain filter
    let apiUrl = `${OPENSEA_API}/collections?order_by=market_cap&limit=100`;
    if (chain !== 'all') {
      apiUrl += `&chain=${chain}`;
    }

    // Fetch top collections ordered by market cap
    const collectionsResponse = await fetch(
      apiUrl,
      {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': apiKey,
        },
      }
    );

    if (!collectionsResponse.ok) {
      throw new Error(`OpenSea API error: ${collectionsResponse.status}`);
    }

    const collectionsData = await collectionsResponse.json();
    const collections: OpenSeaCollection[] = collectionsData.collections || [];

    // Fetch stats in smaller batches to avoid rate limiting
    const results: Array<{
      slug: string;
      name: string;
      image: string;
      floorPrice: number;
      floorPriceSymbol: string;
      change: number;
      volume: number;
      owners: number;
      marketCap: number;
      url: string;
      chain: string;
    } | null> = [];

    const batchSize = 10;
    for (let i = 0; i < collections.length; i += batchSize) {
      const batch = collections.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(collection => fetchCollectionStats(collection, apiKey, intervalName))
      );
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < collections.length) {
        await delay(100);
      }
    }

    // Filter out low value collections and sort by volume (more relevant than market cap)
    const validCollections = results
      .filter((item): item is NonNullable<typeof item> =>
        item !== null &&
        item.floorPrice >= 0.01 && // Min 0.01 ETH floor
        item.volume > 0 // Has some volume
      )
      .sort((a, b) => (b.volume || 0) - (a.volume || 0));

    setCacheEntry(cacheKey, validCollections);

    return NextResponse.json(validCollections);
  } catch (error) {
    console.error('Error fetching NFTs:', error);

    // Return any cached data if available
    const anyCachedData = Object.values(caches)[0]?.data;
    if (anyCachedData) {
      return NextResponse.json(anyCachedData);
    }

    return NextResponse.json({ error: 'Failed to fetch NFTs' }, { status: 500 });
  }
}
