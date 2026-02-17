import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

interface Wallet {
  id: string;
  wallet: string;
  name: string;
  tier: number;
  tierV2: number;
  badges: number;
  streaming: boolean;
  pfp?: string;
  txs?: number;
}

// Cache for wallet data (Gold+ preloaded, Silver loaded on demand)
let cachedData: {
  gold: Wallet[];
  platinum: Wallet[];
  diamond: Wallet[];
  obsidian: Wallet[];
  lastLoaded: number;
} | null = null;

let silverCache: { data: Wallet[]; lastLoaded: number } | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Load a tier file via HTTP
async function loadTierFile(baseUrl: string, tier: string): Promise<Wallet[]> {
  try {
    // Try enriched file first
    const enrichedUrl = `${baseUrl}/data/wallets-${tier}-enriched.json`;
    let res = await fetch(enrichedUrl, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
    // Fall back to regular file
    const fileUrl = `${baseUrl}/data/wallets-${tier}.json`;
    res = await fetch(fileUrl, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error(`Error loading wallets-${tier}:`, e);
  }
  return [];
}

// Load Gold+ wallets (preloaded by default)
async function loadGoldPlusData(baseUrl: string): Promise<typeof cachedData> {
  if (cachedData && Date.now() - cachedData.lastLoaded < CACHE_TTL) {
    return cachedData;
  }

  const [gold, platinum, diamond, obsidian] = await Promise.all([
    loadTierFile(baseUrl, 'gold'),
    loadTierFile(baseUrl, 'platinum'),
    loadTierFile(baseUrl, 'diamond'),
    loadTierFile(baseUrl, 'obsidian'),
  ]);

  cachedData = { gold, platinum, diamond, obsidian, lastLoaded: Date.now() };
  return cachedData;
}

// Load silver wallets (on demand only)
async function loadSilverData(baseUrl: string): Promise<Wallet[]> {
  if (silverCache && Date.now() - silverCache.lastLoaded < CACHE_TTL) {
    return silverCache.data;
  }

  const silver = await loadTierFile(baseUrl, 'silver');
  silverCache = { data: silver, lastLoaded: Date.now() };
  return silver;
}

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 30 });
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const tierFilter = searchParams.get('tier'); // 'silver', 'gold', 'platinum', 'diamond', 'obsidian', or 'all'
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
  const search = searchParams.get('search')?.toLowerCase();
  const sort = searchParams.get('sort') || 'tier'; // 'tier', 'txs', 'badges'

  // Get base URL for fetching data files
  const baseUrl = new URL(request.url).origin;

  // Load Gold+ data (always needed for stats)
  const data = await loadGoldPlusData(baseUrl);
  if (!data) {
    return NextResponse.json({ error: 'Failed to load wallet data' }, { status: 500 });
  }

  // Only load silver if specifically requested or searching
  const needsSilver = tierFilter === 'silver' || tierFilter === 'all' || search;
  const silverData = needsSilver ? await loadSilverData(baseUrl) : [];

  // Sort function based on sort parameter
  const sortWallets = (a: Wallet, b: Wallet) => {
    if (sort === 'txs') return (b.txs || 0) - (a.txs || 0);
    if (sort === 'badges') return b.badges - a.badges;
    // Default: tier, with badge count as tiebreaker
    if (b.tierV2 !== a.tierV2) return b.tierV2 - a.tierV2;
    return b.badges - a.badges;
  };

  // Stats (silver count from cache or loaded data)
  const silverCount = silverCache?.data.length || silverData.length || 180782; // fallback to known count
  const stats = {
    silver: silverCount,
    gold: data.gold.length,
    platinum: data.platinum.length,
    diamond: data.diamond.length,
    obsidian: data.obsidian.length,
    total: silverCount + data.gold.length + data.platinum.length + data.diamond.length + data.obsidian.length,
  };

  // Apply search filter if provided
  const filterBySearch = (wallets: Wallet[]) => {
    if (!search) return wallets;
    return wallets.filter(w =>
      w.name.toLowerCase().includes(search) ||
      w.wallet.toLowerCase().includes(search)
    );
  };

  let result: {
    silver?: Wallet[];
    gold?: Wallet[];
    platinum?: Wallet[];
    diamond?: Wallet[];
    obsidian?: Wallet[];
    all?: Wallet[];
    stats: typeof stats;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };

  if (tierFilter === 'all' || !tierFilter) {
    // Return Gold+ by default (don't include silver in "all" to keep it fast)
    // Silver is searchable or accessible via silver filter
    const allWallets = [
      ...filterBySearch(data.obsidian),
      ...filterBySearch(data.diamond),
      ...filterBySearch(data.platinum),
      ...filterBySearch(data.gold),
      // Only include silver in "all" if searching
      ...(search ? filterBySearch(silverData) : []),
    ].sort(sortWallets);

    const total = allWallets.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedWallets = allWallets.slice(start, start + limit);

    result = {
      all: paginatedWallets,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } else if (tierFilter === 'silver') {
    // Silver tier specifically requested
    const filtered = filterBySearch(silverData).sort(sortWallets);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedWallets = filtered.slice(start, start + limit);

    result = {
      silver: paginatedWallets,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } else {
    // Return specific tier (gold, platinum, diamond, obsidian)
    const tierData = data[tierFilter as keyof typeof data];
    if (!tierData || tierFilter === 'lastLoaded') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const filtered = filterBySearch(tierData as Wallet[]).sort(sortWallets);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedWallets = filtered.slice(start, start + limit);

    result = {
      [tierFilter]: paginatedWallets,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  return NextResponse.json(result);
}
