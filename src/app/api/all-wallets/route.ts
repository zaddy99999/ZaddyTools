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

// Cache for wallet data
let cachedData: {
  gold: Wallet[];
  platinum: Wallet[];
  diamond: Wallet[];
  obsidian: Wallet[];
  lastLoaded: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadWalletData(): typeof cachedData {
  // Return cached if still valid
  if (cachedData && Date.now() - cachedData.lastLoaded < CACHE_TTL) {
    return cachedData;
  }

  const dataDir = path.join(process.cwd(), 'public', 'data');

  // Load each tier file (prefer enriched version if exists)
  const loadTierFile = (tier: string): Wallet[] => {
    try {
      // Try enriched file first
      const enrichedPath = path.join(dataDir, `wallets-${tier}-enriched.json`);
      if (fs.existsSync(enrichedPath)) {
        const content = fs.readFileSync(enrichedPath, 'utf-8');
        return JSON.parse(content);
      }
      // Fall back to regular file
      const filePath = path.join(dataDir, `wallets-${tier}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error(`Error loading wallets-${tier}:`, e);
    }
    return [];
  };

  cachedData = {
    gold: loadTierFile('gold'),
    platinum: loadTierFile('platinum'),
    diamond: loadTierFile('diamond'),
    obsidian: loadTierFile('obsidian'),
    lastLoaded: Date.now(),
  };

  return cachedData;
}

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 30 });
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const tierFilter = searchParams.get('tier'); // 'gold', 'platinum', 'diamond', 'obsidian', or 'all'
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
  const search = searchParams.get('search')?.toLowerCase();

  const data = loadWalletData();
  if (!data) {
    return NextResponse.json({ error: 'Failed to load wallet data' }, { status: 500 });
  }

  // Sort each tier by tierV2 descending
  const sortByTierV2 = (a: Wallet, b: Wallet) => b.tierV2 - a.tierV2;

  let result: {
    gold?: Wallet[];
    platinum?: Wallet[];
    diamond?: Wallet[];
    obsidian?: Wallet[];
    all?: Wallet[];
    stats: {
      gold: number;
      platinum: number;
      diamond: number;
      obsidian: number;
      total: number;
    };
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };

  const stats = {
    gold: data.gold.length,
    platinum: data.platinum.length,
    diamond: data.diamond.length,
    obsidian: data.obsidian.length,
    total: data.gold.length + data.platinum.length + data.diamond.length + data.obsidian.length,
  };

  // Apply search filter if provided
  const filterBySearch = (wallets: Wallet[]) => {
    if (!search) return wallets;
    return wallets.filter(w =>
      w.name.toLowerCase().includes(search) ||
      w.wallet.toLowerCase().includes(search)
    );
  };

  if (tierFilter === 'all' || !tierFilter) {
    // Return all tiers combined, paginated
    const allWallets = [
      ...filterBySearch(data.obsidian),
      ...filterBySearch(data.diamond),
      ...filterBySearch(data.platinum),
      ...filterBySearch(data.gold),
    ].sort(sortByTierV2);

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
    const tierData = data[tierFilter as keyof typeof data];
    if (!tierData || tierFilter === 'lastLoaded') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const filtered = filterBySearch(tierData as Wallet[]).sort(sortByTierV2);
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
