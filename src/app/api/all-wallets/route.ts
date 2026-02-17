import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import fs from 'fs';
import path from 'path';

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

// Load a tier file from filesystem (works on Vercel with included files)
function loadTierFile(tier: string): Wallet[] {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    // Try enriched file first
    const enrichedPath = path.join(dataDir, `wallets-${tier}-enriched.json`);
    if (fs.existsSync(enrichedPath)) {
      return JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'));
    }
    // Fall back to regular file
    const filePath = path.join(dataDir, `wallets-${tier}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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

  // Only load the tier(s) we actually need
  // For 'all' without search, only load platinum+ (fast), show note to filter for gold/silver
  // For specific tier, load that tier
  // For search, load all tiers that might match

  let obsidianData: Wallet[] = [];
  let diamondData: Wallet[] = [];
  let platinumData: Wallet[] = [];
  let goldData: Wallet[] = [];
  let silverData: Wallet[] = [];

  // Determine what to load based on filter and search
  if (search) {
    // For search, we need to load everything (expensive but necessary)
    [obsidianData, diamondData, platinumData, goldData, silverData] = await Promise.all([
      Promise.resolve(loadTierFile('obsidian')),
      Promise.resolve(loadTierFile('diamond')),
      Promise.resolve(loadTierFile('platinum')),
      Promise.resolve(loadTierFile('gold')),
      Promise.resolve(loadTierFile('silver')),
    ]);
  } else if (tierFilter === 'all' || !tierFilter) {
    // For 'all', only load platinum+ (gold/silver too big for default view)
    obsidianData = loadTierFile('obsidian');
    diamondData = loadTierFile('diamond');
    platinumData = loadTierFile('platinum');
  } else {
    // Load only the specific tier requested
    switch (tierFilter) {
      case 'obsidian': obsidianData = loadTierFile('obsidian'); break;
      case 'diamond': diamondData = loadTierFile('diamond'); break;
      case 'platinum': platinumData = loadTierFile('platinum'); break;
      case 'gold': goldData = loadTierFile('gold'); break;
      case 'silver': silverData = loadTierFile('silver'); break;
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
