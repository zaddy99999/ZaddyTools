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

// Known counts for stats
const KNOWN_COUNTS = {
  silver: 180782,
  gold: 16566,
  platinum: 1332,
  diamond: 103,
  obsidian: 11,
};

// Production URL for fetching data
const DATA_BASE_URL = 'https://zaddytools.vercel.app';

// Cache for loaded data
const cache: Record<string, { data: Wallet[]; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Load tier file via fetch with caching
async function loadTierFile(tier: string): Promise<Wallet[]> {
  // Check cache
  const cached = cache[tier];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const enrichedUrl = `${DATA_BASE_URL}/data/wallets-${tier}-enriched.json`;
    let res = await fetch(enrichedUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      cache[tier] = { data, timestamp: Date.now() };
      return data;
    }

    const fileUrl = `${DATA_BASE_URL}/data/wallets-${tier}.json`;
    res = await fetch(fileUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      cache[tier] = { data, timestamp: Date.now() };
      return data;
    }
  } catch (e) {
    console.error(`Error loading wallets-${tier}:`, e);
  }
  return [];
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

  // Determine what tiers to load based on filter and search
  let obsidianData: Wallet[] = [];
  let diamondData: Wallet[] = [];
  let platinumData: Wallet[] = [];
  let goldData: Wallet[] = [];
  let silverData: Wallet[] = [];

  if (search) {
    // For search, load all tiers in parallel
    [obsidianData, diamondData, platinumData, goldData, silverData] = await Promise.all([
      loadTierFile('obsidian'),
      loadTierFile('diamond'),
      loadTierFile('platinum'),
      loadTierFile('gold'),
      loadTierFile('silver'),
    ]);
  } else if (tierFilter === 'all' || !tierFilter) {
    // For 'all', load platinum+ and top gold wallets (~1.9k wallets total)
    [obsidianData, diamondData, platinumData, goldData] = await Promise.all([
      loadTierFile('obsidian'),
      loadTierFile('diamond'),
      loadTierFile('platinum'),
      loadTierFile('gold-top'), // Pre-computed top ~460 gold wallets by txs/badges
    ]);
  } else {
    // Load only the specific tier requested
    switch (tierFilter) {
      case 'obsidian': obsidianData = await loadTierFile('obsidian'); break;
      case 'diamond': diamondData = await loadTierFile('diamond'); break;
      case 'platinum': platinumData = await loadTierFile('platinum'); break;
      case 'gold': goldData = await loadTierFile('gold'); break;
      case 'silver': silverData = await loadTierFile('silver'); break;
    }
  }

  // Sort function based on sort parameter
  const sortWallets = (a: Wallet, b: Wallet) => {
    if (sort === 'txs') return (b.txs || 0) - (a.txs || 0);
    if (sort === 'badges') return b.badges - a.badges;
    // Default: tier, with badge count as tiebreaker
    if (b.tierV2 !== a.tierV2) return b.tierV2 - a.tierV2;
    return b.badges - a.badges;
  };

  // Stats - use known counts for tiers not loaded
  const stats = {
    silver: silverData.length || KNOWN_COUNTS.silver,
    gold: goldData.length || KNOWN_COUNTS.gold,
    platinum: platinumData.length || KNOWN_COUNTS.platinum,
    diamond: diamondData.length || KNOWN_COUNTS.diamond,
    obsidian: obsidianData.length || KNOWN_COUNTS.obsidian,
    total: KNOWN_COUNTS.silver + KNOWN_COUNTS.gold + KNOWN_COUNTS.platinum + KNOWN_COUNTS.diamond + KNOWN_COUNTS.obsidian,
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
    // Return Platinum+ by default (Gold/Silver only when searching)
    const allWallets = [
      ...filterBySearch(obsidianData),
      ...filterBySearch(diamondData),
      ...filterBySearch(platinumData),
      ...filterBySearch(goldData),
      ...filterBySearch(silverData),
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
  } else {
    // Return specific tier
    let tierData: Wallet[] = [];
    switch (tierFilter) {
      case 'obsidian': tierData = obsidianData; break;
      case 'diamond': tierData = diamondData; break;
      case 'platinum': tierData = platinumData; break;
      case 'gold': tierData = goldData; break;
      case 'silver': tierData = silverData; break;
      default: return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const filtered = filterBySearch(tierData).sort(sortWallets);
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
