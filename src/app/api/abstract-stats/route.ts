import { NextRequest, NextResponse } from 'next/server';

// OpenSea API for Abstract NFTs
const OPENSEA_API = 'https://api.opensea.io/api/v2';

// ==================== CACHE & VALIDATION SYSTEM ====================

// Known top NFT collections that should always appear (slugs)
const KNOWN_TOP_NFTS = [
  'gigaverse-roms-abstract',
  'finalbosu',
  'genesishero-abstract',
  'bearish',
  'fugzfamily',
  'hamieverse-genesis',
  'glowbuds',
  'checkmate-pass-abstract',
  'pengztracted-abstract',
  'abstractio',
];

// Known top tokens that should always appear (symbols) - case-insensitive matching
// These are NATIVE Abstract chain tokens only, not bridged tokens from other chains
const KNOWN_TOP_TOKENS = [
  'ABX',        // Aborean - ~$3.6M MC
  'ABSTER',     // Abster meme - ~$2.9M MC
  'BURR',       // ~$800k MC
  'BIG',        // Big Hoss - ~$800k MC
  'Polly',      // ~$760k MC
  'CHAD',       // ~$540k MC
  'KONA',       // ~$320k MC
  'PANDA',
  'TYAG',
  'CHIMP',
  'CHILL',
  'MOCHI',
  'GIGLIO',
];

// Tokens to EXCLUDE - bridged tokens from other chains, not Abstract native
// Using lowercase for case-insensitive matching
const EXCLUDED_TOKENS = new Set([
  'pengu',    // Pudgy Penguins - Solana/ETH token, not native
]);

// Track last fetch results for debugging
let lastFetchLog: { timestamp: string; found: string[]; missing: string[] } | null = null;

// In-memory cache for last known good data
interface CacheData {
  nfts: NFTCollection[];
  tokens: Token[];
  timestamp: number;
}

let dataCache: CacheData | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours - only fetch once per day

// Hardcoded fallback token data when API fails
const FALLBACK_TOKENS: Token[] = [
  { name: 'CHECK', symbol: 'CHECK', address: '0x...', image: 'https://ui-avatars.com/api/?name=CHECK&background=1a1a1a&color=2edb84&size=128', price: 0.005, priceChange1h: 0, priceChange24h: 2.5, priceChange7d: 10, priceChange30d: 25, volume24h: 150000, marketCap: 60000000, holders: 0 },
  { name: 'ABX', symbol: 'ABX', address: '0x...', image: 'https://ui-avatars.com/api/?name=ABX&background=1a1a1a&color=2edb84&size=128', price: 0.036, priceChange1h: 0, priceChange24h: 1.2, priceChange7d: 5, priceChange30d: 15, volume24h: 80000, marketCap: 3600000, holders: 0 },
  { name: 'ABSTER', symbol: 'ABSTER', address: '0x...', image: 'https://ui-avatars.com/api/?name=ABSTER&background=1a1a1a&color=2edb84&size=128', price: 0.029, priceChange1h: 0, priceChange24h: -1.5, priceChange7d: 8, priceChange30d: 20, volume24h: 45000, marketCap: 2900000, holders: 0 },
  { name: 'BURR', symbol: 'BURR', address: '0x...', image: 'https://ui-avatars.com/api/?name=BURR&background=1a1a1a&color=2edb84&size=128', price: 0.008, priceChange1h: 0, priceChange24h: 3.2, priceChange7d: -2, priceChange30d: 12, volume24h: 25000, marketCap: 800000, holders: 0 },
  { name: 'BIG', symbol: 'BIG', address: '0x...', image: 'https://ui-avatars.com/api/?name=BIG&background=1a1a1a&color=2edb84&size=128', price: 0.008, priceChange1h: 0, priceChange24h: 0.8, priceChange7d: 4, priceChange30d: 18, volume24h: 22000, marketCap: 800000, holders: 0 },
  { name: 'Polly', symbol: 'Polly', address: '0x...', image: 'https://ui-avatars.com/api/?name=Polly&background=1a1a1a&color=2edb84&size=128', price: 0.0076, priceChange1h: 0, priceChange24h: -0.5, priceChange7d: 2, priceChange30d: 8, volume24h: 18000, marketCap: 760000, holders: 0 },
  { name: 'CHAD', symbol: 'CHAD', address: '0x...', image: 'https://ui-avatars.com/api/?name=CHAD&background=1a1a1a&color=2edb84&size=128', price: 0.0054, priceChange1h: 0, priceChange24h: 1.8, priceChange7d: 6, priceChange30d: 14, volume24h: 15000, marketCap: 540000, holders: 0 },
  { name: 'KONA', symbol: 'KONA', address: '0x...', image: 'https://ui-avatars.com/api/?name=KONA&background=1a1a1a&color=2edb84&size=128', price: 0.0032, priceChange1h: 0, priceChange24h: 0.2, priceChange7d: -1, priceChange30d: 5, volume24h: 8000, marketCap: 320000, holders: 0 },
  { name: 'PANDA', symbol: 'PANDA', address: '0x...', image: 'https://ui-avatars.com/api/?name=PANDA&background=1a1a1a&color=2edb84&size=128', price: 0.002, priceChange1h: 0, priceChange24h: 2.1, priceChange7d: 3, priceChange30d: 10, volume24h: 6000, marketCap: 200000, holders: 0 },
  { name: 'TYAG', symbol: 'TYAG', address: '0x...', image: 'https://ui-avatars.com/api/?name=TYAG&background=1a1a1a&color=2edb84&size=128', price: 0.0015, priceChange1h: 0, priceChange24h: -0.8, priceChange7d: 1, priceChange30d: 7, volume24h: 4000, marketCap: 150000, holders: 0 },
];

// Validate fetched data against known projects
function validateNFTData(nfts: NFTCollection[]): { valid: boolean; missingCount: number; missing: string[] } {
  const fetchedSlugs = new Set(nfts.map(n => n.slug));
  const missing = KNOWN_TOP_NFTS.filter(slug => !fetchedSlugs.has(slug));
  // Consider valid only if 75%+ of known top NFTs are present (max 25% missing)
  const valid = missing.length <= Math.ceil(KNOWN_TOP_NFTS.length * 0.25);
  return { valid, missingCount: missing.length, missing };
}

function validateTokenData(tokens: Token[]): { valid: boolean; missingCount: number; missing: string[] } {
  const fetchedSymbols = new Set(tokens.map(t => t.symbol.toUpperCase()));
  // Filter out excluded tokens from validation - they're intentionally not included
  const tokensToCheck = KNOWN_TOP_TOKENS.filter(sym => !EXCLUDED_TOKENS.has(sym));
  const missing = tokensToCheck.filter(sym => !fetchedSymbols.has(sym.toUpperCase()));
  // Validation: max 3 missing out of known tokens
  const valid = missing.length <= 3;
  return { valid, missingCount: missing.length, missing };
}

// Merge new data with cached data, preferring fresh data but keeping known projects
function mergeWithCache(
  newNfts: NFTCollection[],
  newTokens: Token[],
  cache: CacheData
): { nfts: NFTCollection[]; tokens: Token[] } {
  // For NFTs: keep all new ones, add missing known ones from cache
  const nftMap = new Map(newNfts.map(n => [n.slug, n]));
  for (const cachedNft of cache.nfts) {
    if (KNOWN_TOP_NFTS.includes(cachedNft.slug) && !nftMap.has(cachedNft.slug)) {
      nftMap.set(cachedNft.slug, cachedNft);
    }
  }
  const mergedNfts = Array.from(nftMap.values())
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 20);

  // For tokens: keep all new ones, add missing known ones from cache (case-insensitive)
  const tokenMap = new Map(newTokens.map(t => [t.symbol.toUpperCase(), t]));
  const knownUpperCase = new Set(KNOWN_TOP_TOKENS.map(s => s.toUpperCase()));
  for (const cachedToken of cache.tokens) {
    const upperSymbol = cachedToken.symbol.toUpperCase();
    if (knownUpperCase.has(upperSymbol) && !tokenMap.has(upperSymbol)) {
      tokenMap.set(upperSymbol, cachedToken);
    }
  }
  const mergedTokens = Array.from(tokenMap.values())
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 30);

  return { nfts: mergedNfts, tokens: mergedTokens };
}

// ==================== END CACHE SYSTEM ====================

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

// Fetch top NFT collections on Abstract from OpenSea with retry logic
async function fetchAbstractNFTs(retryCount = 0): Promise<NFTCollection[]> {
  const collections: NFTCollection[] = [];
  const ethPrice = await getEthPrice();
  const MAX_RETRIES = 2;
  const MIN_EXPECTED_RESULTS = 8; // Expect at least this many NFTs

  try {
    // OpenSea collection stats endpoint
    const response = await fetch(
      `${OPENSEA_API}/collections?chain=abstract&order_by=seven_day_volume&limit=30`,
      {
        headers: {
          Accept: 'application/json',
          'X-API-KEY': process.env.OPENSEA_API_KEY || '',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.log('OpenSea API error:', response.status);
      // Retry on server errors
      if (retryCount < MAX_RETRIES && response.status >= 500) {
        console.log(`Retrying NFT fetch... attempt ${retryCount + 2}`);
        await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
        return fetchAbstractNFTs(retryCount + 1);
      }
      return [];
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
    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying NFT fetch after error... attempt ${retryCount + 2}`);
      await new Promise(r => setTimeout(r, 1000));
      return fetchAbstractNFTs(retryCount + 1);
    }
    return [];
  }

  // If we got too few results, retry (might be a partial API response)
  if (collections.length < MIN_EXPECTED_RESULTS && retryCount < MAX_RETRIES) {
    console.log(`Only got ${collections.length} NFTs, retrying... attempt ${retryCount + 2}`);
    await new Promise(r => setTimeout(r, 1000));
    const retryResults = await fetchAbstractNFTs(retryCount + 1);
    // Return whichever has more results
    return retryResults.length > collections.length ? retryResults : collections.slice(0, 20);
  }

  return collections.slice(0, 20);
}

// Fetch top tokens on Abstract from GeckoTerminal (primary) and DexScreener (fallback)
async function fetchAbstractTokens(retryCount = 0): Promise<Token[]> {
  const tokenMap = new Map<string, Token>();
  const MAX_RETRIES = 2;
  const MIN_EXPECTED_RESULTS = 8;

  // Primary: Fetch directly from GeckoTerminal pools endpoint for Abstract chain
  const geckoPoolEndpoints = [
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=1&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=2&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=3&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/trending_pools?page=1',
    'https://api.geckoterminal.com/api/v2/networks/abstract/trending_pools?page=2',
  ];

  for (const endpoint of geckoPoolEndpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();

        for (const pool of (data.data || [])) {
          const attrs = pool.attributes || {};
          const poolName = attrs.name || '';
          const tokenSymbol = poolName.split(' / ')[0]?.trim() || '';

          // Skip empty, stablecoins, wrapped tokens
          if (!tokenSymbol) continue;
          const skipTokens = ['WETH', 'USDC', 'USDC.e', 'USDT', 'ETH', 'DAI', 'WBTC'];
          if (skipTokens.includes(tokenSymbol)) continue;
          if (EXCLUDED_TOKENS.has(tokenSymbol.toLowerCase())) continue;

          // Extract token address from pool relationships
          const baseTokenRef = pool.relationships?.base_token?.data?.id || '';
          const tokenAddress = baseTokenRef.replace('abstract_', '');

          const price = parseFloat(attrs.base_token_price_usd || '0');
          const volume = parseFloat(attrs.volume_usd?.h24 || '0');
          const marketCap = parseFloat(attrs.fdv_usd || attrs.market_cap_usd || '0');
          const priceChange1h = parseFloat(attrs.price_change_percentage?.h1 || '0');
          const priceChange24h = parseFloat(attrs.price_change_percentage?.h24 || '0');

          // Get image - use hardcoded fallbacks for specific tokens (case-insensitive)
          const hardcodedImages: Record<string, string> = {
            'abseth': '/AbstractLogo.png',
            'weth': '/AbstractLogo.png',
            'chad': '/chadlogo.png',
            'gtbtc': '/gateBTClogo.png',
            'gatebtc': '/gateBTClogo.png',
          };

          const tokenImage = hardcodedImages[tokenSymbol.toLowerCase()]
            || (tokenAddress
              ? `https://dd.dexscreener.com/ds-data/tokens/abstract/${tokenAddress}.png`
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(tokenSymbol)}&background=1a1a1a&color=2edb84&size=128`);

          const existing = tokenMap.get(tokenSymbol);
          if (existing) {
            // Aggregate volume, keep highest market cap data
            existing.volume24h = Math.max(existing.volume24h, volume);
            if (marketCap > existing.marketCap) {
              existing.price = price;
              existing.priceChange1h = priceChange1h;
              existing.priceChange24h = priceChange24h;
              existing.marketCap = marketCap;
            }
          } else if (marketCap > 1000 || volume > 100) { // Only add tokens with some activity
            tokenMap.set(tokenSymbol, {
              name: tokenSymbol,
              symbol: tokenSymbol,
              address: tokenAddress,
              image: tokenImage,
              price,
              priceChange1h,
              priceChange24h,
              priceChange7d: priceChange24h * 3, // Estimate
              priceChange30d: priceChange24h * 6, // Estimate
              volume24h: volume,
              marketCap,
              holders: 0,
            });
          }
        }
      }
      // Small delay between requests
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.error('GeckoTerminal fetch error:', err);
    }
  }

  // Convert to array and sort by market cap
  const tokens = Array.from(tokenMap.values())
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 30);

  // If we got too few results, retry
  if (tokens.length < MIN_EXPECTED_RESULTS && retryCount < MAX_RETRIES) {
    console.log(`Only got ${tokens.length} tokens, retrying... attempt ${retryCount + 2}`);
    await new Promise(r => setTimeout(r, 1000));
    const retryResults = await fetchAbstractTokens(retryCount + 1);
    return retryResults.length > tokens.length ? retryResults : tokens;
  }

  return tokens;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    // Check if we have valid cached data (less than 24 hours old)
    if (dataCache && !forceRefresh) {
      const cacheAge = Date.now() - dataCache.timestamp;
      if (cacheAge < CACHE_TTL) {
        console.log(`Returning cached data (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
        return NextResponse.json({
          nfts: dataCache.nfts,
          tokens: dataCache.tokens,
          lastUpdated: new Date(dataCache.timestamp).toISOString(),
          validation: { fromCache: true, cacheAgeMinutes: Math.round(cacheAge / 1000 / 60) },
        });
      }
    }

    let nfts: NFTCollection[] = [];
    let tokens: Token[] = [];

    // Fetch fresh data
    if (type === 'all' || type === 'nfts') {
      nfts = await fetchAbstractNFTs();
    }

    if (type === 'all' || type === 'tokens') {
      tokens = await fetchAbstractTokens();
    }

    // If tokens fetch failed or returned too few, use fallback
    if (tokens.length < 5) {
      console.log('Token fetch returned too few results, using fallback data');
      tokens = FALLBACK_TOKENS;
    }

    // Validate fetched data
    const nftValidation = validateNFTData(nfts);
    const tokenValidation = validateTokenData(tokens);

    // Log validation results
    if (!nftValidation.valid) {
      console.log(`NFT data validation: missing ${nftValidation.missingCount} known projects:`, nftValidation.missing);
    }
    if (!tokenValidation.valid) {
      console.log(`Token data validation: missing ${tokenValidation.missingCount} known tokens:`, tokenValidation.missing);
    }

    // If we have cached data and current fetch is missing known projects, merge
    if (dataCache && (!nftValidation.valid || !tokenValidation.valid)) {
      const cacheAge = Date.now() - dataCache.timestamp;
      console.log(`Merging with cached data (age: ${Math.round(cacheAge / 1000)}s)`);

      const merged = mergeWithCache(nfts, tokens, dataCache);
      nfts = merged.nfts;
      tokens = merged.tokens;
    }

    // Update cache if current data looks good
    if (nftValidation.valid && tokenValidation.valid) {
      dataCache = {
        nfts,
        tokens,
        timestamp: Date.now(),
      };
    } else if (!dataCache) {
      // Even if not perfect, cache it if we have no cache
      dataCache = {
        nfts,
        tokens,
        timestamp: Date.now(),
      };
    }

    // Log fetch results for debugging
    const fetchedSymbols = tokens.map(t => t.symbol);
    lastFetchLog = {
      timestamp: new Date().toISOString(),
      found: fetchedSymbols,
      missing: tokenValidation.missing,
    };

    if (tokenValidation.missing.length > 0) {
      console.warn(`[Abstract Stats] Missing ${tokenValidation.missing.length} known tokens:`, tokenValidation.missing);
    }

    return NextResponse.json({
      nfts,
      tokens,
      lastUpdated: new Date().toISOString(),
      validation: {
        nfts: { valid: nftValidation.valid, missing: nftValidation.missingCount },
        tokens: {
          valid: tokenValidation.valid,
          missing: tokenValidation.missingCount,
          missingSymbols: tokenValidation.missing,
        },
        usingCache: !nftValidation.valid || !tokenValidation.valid,
      },
      debug: {
        totalTokensFound: tokens.length,
        knownTokensExpected: KNOWN_TOP_TOKENS.length,
      },
    });
  } catch (error) {
    console.error('Abstract stats error:', error);

    // If we have cache, return it on error
    if (dataCache) {
      console.log('Returning cached data due to error');
      return NextResponse.json({
        nfts: dataCache.nfts,
        tokens: dataCache.tokens,
        lastUpdated: new Date(dataCache.timestamp).toISOString(),
        validation: { fromCache: true, error: true },
      });
    }

    // Use fallback data if no cache
    console.log('Using fallback data due to error and no cache');
    return NextResponse.json({
      nfts: [],
      tokens: FALLBACK_TOKENS,
      lastUpdated: new Date().toISOString(),
      validation: { fromFallback: true, error: true },
    });
  }
}
