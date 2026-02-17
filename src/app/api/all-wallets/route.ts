import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

// Import small wallet files directly (bundled with function)
import obsidianWallets from '../../../data/wallets-obsidian-enriched.json';
import diamondWallets from '../../../data/wallets-diamond-enriched.json';
import platinumWallets from '../../../data/wallets-platinum-enriched.json';

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

// Static data for small tiers (bundled)
const STATIC_DATA = {
  obsidian: obsidianWallets as Wallet[],
  diamond: diamondWallets as Wallet[],
  platinum: platinumWallets as Wallet[],
};

// Load large tier files via fetch (gold, silver)
async function loadLargeTierFile(baseUrl: string, tier: string): Promise<Wallet[]> {
  try {
    const enrichedUrl = `${baseUrl}/data/wallets-${tier}-enriched.json`;
    let res = await fetch(enrichedUrl, { next: { revalidate: 300 } }); // Cache for 5 min
    if (res.ok) return await res.json();

    const fileUrl = `${baseUrl}/data/wallets-${tier}.json`;
    res = await fetch(fileUrl, { next: { revalidate: 300 } });
    if (res.ok) return await res.json();
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

  // Get base URL for fetching large files
  const baseUrl = new URL(request.url).origin;

  // Small tiers are always available (bundled)
  const obsidianData = STATIC_DATA.obsidian;
  const diamondData = STATIC_DATA.diamond;
  const platinumData = STATIC_DATA.platinum;

  // Large tiers loaded on demand
  let goldData: Wallet[] = [];
  let silverData: Wallet[] = [];

  // Determine what large tiers to load
  if (search) {
    // For search, load gold and silver
    [goldData, silverData] = await Promise.all([
      loadLargeTierFile(baseUrl, 'gold'),
      loadLargeTierFile(baseUrl, 'silver'),
    ]);
  } else if (tierFilter === 'gold') {
    goldData = await loadLargeTierFile(baseUrl, 'gold');
  } else if (tierFilter === 'silver') {
    silverData = await loadLargeTierFile(baseUrl, 'silver');
  }
  // For 'all' without search, we only show platinum+ (gold/silver are too big)

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
