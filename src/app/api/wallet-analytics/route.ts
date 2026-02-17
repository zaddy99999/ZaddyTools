import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, timeouts } from '@/lib/fetchWithTimeout';
import { checkRateLimit } from '@/lib/rateLimit';
import { safeErrorMessage } from '@/lib/errorResponse';

// Rate limit: 20 requests per minute
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,   // 1 minute
  maxRequests: 20,       // 20 requests per minute
};

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz';
// Use Abstract's block explorer API (no API key required)
const EXPLORER_API = 'https://block-explorer-api.mainnet.abs.xyz/api';

// Abstract Badges NFT contract (ERC-1155)
const ABSTRACT_BADGES_CONTRACT = '0xbc176ac2373614f9858a118917d83b139bcb3f8c';

// Xeet Creator Cards NFT contract (ERC-1155)
const XEET_CARDS_CONTRACT = '0xec27d2237432d06981e1f18581494661517e1bd3';
const XEET_COLLECTION_IMAGE = 'https://i2c.seadn.io/collection/xeet-creator-cards/image_type_logo/b2b3ef6100871f21a24e968da0d24c/bcb2b3ef6100871f21a24e968da0d24c.png';

// Known NFT collections on Abstract (all lowercase) with floor prices in ETH
// Update these periodically or when user reports incorrect values
const KNOWN_NFT_COLLECTIONS: Record<string, { name: string; floorEth: number }> = {
  '0x09bb4c785165915e66f4a645bc978a6c885a0319': { name: 'Web3 Playboys', floorEth: 0.05 },
  '0x30072084ff8724098cbb65e07f7639ed31af5f66': { name: 'Dreamilio', floorEth: 0.03 },
  '0xe501994195b9951413411395ed1921a88eff694e': { name: 'Abstract Checks', floorEth: 0.01 },
  '0x100ea890ad486334c8a74c6a37e216c381ff8ddf': { name: 'Abstract Ordinals', floorEth: 0.005 },
};

// Cache for floor prices (fetched from API) with size limit
const MAX_CACHE_ENTRIES = 1000;
const floorPriceCache = new Map<string, { price: number; timestamp: number }>();
const FLOOR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to add entry to a Map with size limit (evicts oldest entries)
function setMapWithLimit<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number) {
  // If key exists, delete it first to update insertion order
  if (map.has(key)) {
    map.delete(key);
  }
  // Evict oldest entries if at limit
  while (map.size >= maxSize) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
  map.set(key, value);
}

// Cache for collection data (floor price, name, image)
interface CollectionData {
  floorEth: number | null;
  name: string | null;
  image: string | null;
  timestamp: number;
}
const collectionCache = new Map<string, CollectionData>();

// Fetch collection data from OpenSea API (floor price, name, image)
async function getCollectionData(contractAddress: string): Promise<{ floorEth: number | null; name: string | null; image: string | null }> {
  const addr = contractAddress.toLowerCase();

  // Check cache first
  const cached = collectionCache.get(addr);
  if (cached && Date.now() - cached.timestamp < FLOOR_CACHE_TTL) {
    return { floorEth: cached.floorEth, name: cached.name, image: cached.image };
  }

  // Try OpenSea API if key is configured
  if (process.env.OPENSEA_API_KEY) {
    try {
      const response = await fetchWithTimeout(
        `https://api.opensea.io/api/v2/chain/abstract/contract/${addr}/nfts?limit=1`,
        {
          headers: {
            'Accept': 'application/json',
            'X-API-KEY': process.env.OPENSEA_API_KEY,
          },
          timeout: timeouts.DEFAULT,
        }
      );

      if (response.ok) {
        const data = await response.json();
        const slug = data.nfts?.[0]?.collection;
        if (slug) {
          // Fetch collection details
          const collectionRes = await fetchWithTimeout(
            `https://api.opensea.io/api/v2/collections/${slug}`,
            {
              headers: {
                'Accept': 'application/json',
                'X-API-KEY': process.env.OPENSEA_API_KEY,
              },
              timeout: timeouts.DEFAULT,
            }
          );

          if (collectionRes.ok) {
            const collection = await collectionRes.json();
            const name = collection.name || null;
            const image = collection.image_url || null;

            // Also fetch stats for floor price
            const statsRes = await fetchWithTimeout(
              `https://api.opensea.io/api/v2/collections/${slug}/stats`,
              {
                headers: {
                  'Accept': 'application/json',
                  'X-API-KEY': process.env.OPENSEA_API_KEY,
                },
                timeout: timeouts.DEFAULT,
              }
            );

            let floorEth: number | null = null;
            if (statsRes.ok) {
              const stats = await statsRes.json();
              floorEth = stats.total?.floor_price || null;
            }

            const result = { floorEth, name, image };
            setMapWithLimit(collectionCache, addr, { ...result, timestamp: Date.now() }, MAX_CACHE_ENTRIES);
            return result;
          }
        }
      }
    } catch (err) {
      console.error('OpenSea API error:', err);
    }
  }

  // Fallback to hardcoded data if API fails
  const knownCollection = KNOWN_NFT_COLLECTIONS[addr];
  if (knownCollection) {
    return { floorEth: knownCollection.floorEth, name: knownCollection.name, image: null };
  }

  return { floorEth: null, name: null, image: null };
}

// Known contract names on Abstract (all lowercase for case-insensitive lookup)
const KNOWN_CONTRACTS: Record<string, string> = {
  '0x0000000000000000000000000000000000000000': 'Native Transfer',
  // Popular Abstract apps & protocols
  '0xbc176ac2373614f9858a118917d83b139bcb3f8c': 'Abstract Badges',
  '0x96e1056a8814de39c8c3cd0176042d6e4a7dae92': 'Abstract Portal',
  '0x8c826f795466e39acbff1bb4eeeb759609377ba1': 'Abstract Bridge',
  '0x52629961f71c1c2564c5aa22372cb1b9fa9eba3e': 'AGW (Global Wallet)',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap',
  '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae': 'LI.FI',
  '0xe66dc11ab4f23d77a7b24de54d46b85ff1e91a27': 'Relay Bridge',
  '0x6b5072a1b8c01ac41968b85744df2efa3ecf8155': 'Jumper',
  '0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5': 'LayerZero',
  '0x19cec7dfcfda7f8254893e5ae8e09ebc18e7c89e': 'Hyperlane',
  '0xfe5e5d361b2ad62c541bab87c45a0b9b018389a2': 'Stargate',
  '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789': 'Entry Point (AA)',
  '0x0000000071727de22e5e9d8baf0edac6f37da032': 'Entry Point v0.7',
  // WETH
  '0x3439153eb7af838ad19d56e1571fbd09333c2809': 'WETH',
  '0x4200000000000000000000000000000000000006': 'WETH',
  // DEXes
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap Router',
  '0x2626664c2603336e57b271c5c0b26f421741e481': 'Uniswap V3 Router',
  '0xec7be89e9d109e7e3fec59c222cf297125fefda2': 'Uniswap V4 Router',
  // Bridges
  '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1': 'Optimism Bridge',
  '0x32400084c286cf3e17e7b677ea9583e60a000324': 'zkSync Bridge',
  // NFT marketplaces
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': 'Seaport',
  '0x00000000000001ad428e4906ae43d8f9852d0dd6': 'Seaport 1.6',
  // Account abstraction
  '0x0000000000000000000000000000000000000001': 'System Contract',
  // Common patterns - these will be matched by prefix
};

interface FavoriteApp {
  address: string;
  name: string;
  interactions: number;
  percentage: number;
}

interface Badge {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  tokenId?: string;
  image?: string;
}

interface NftHolding {
  contractAddress: string;
  tokenId: string;
  name: string;
  collectionName: string;
  image?: string;
  count: number;
  estimatedValueUsd?: number;
}

// Wallet personality types based on behavior
function getWalletPersonality(data: {
  transactionCount: number;
  tradingVolumeEth: number;
  nftCount: number;
  contractsInteracted: number;
  activeDays: number;
  balanceEth: number;
}): { title: string; emoji: string; description: string } {
  const txPerDay = data.activeDays > 0 ? data.transactionCount / data.activeDays : 0;
  const volumePerTx = data.transactionCount > 0 ? data.tradingVolumeEth / data.transactionCount : 0;

  // Check for specific patterns
  if (data.nftCount >= 100 && data.tradingVolumeEth >= 10) {
    return { title: 'Master Collector', emoji: '🏆', description: 'A true NFT connoisseur with an impressive collection' };
  }
  if (data.tradingVolumeEth >= 100 && txPerDay >= 10) {
    return { title: 'Degen Trader', emoji: '🎰', description: 'Lives and breathes the market, trading at all hours' };
  }
  if (data.tradingVolumeEth >= 50 && data.contractsInteracted >= 30) {
    return { title: 'DeFi Wizard', emoji: '🧙', description: 'Masters every protocol, optimizes every yield' };
  }
  if (data.balanceEth >= 10 && data.activeDays >= 30) {
    return { title: 'Diamond Hands', emoji: '💎', description: 'HODLs through thick and thin' };
  }
  if (data.contractsInteracted >= 50) {
    return { title: 'Protocol Explorer', emoji: '🧭', description: 'Tries every new app and protocol' };
  }
  if (data.nftCount >= 50) {
    return { title: 'NFT Enthusiast', emoji: '🎨', description: 'Curates digital art and collectibles' };
  }
  if (data.transactionCount >= 500 && data.activeDays >= 30) {
    return { title: 'Power User', emoji: '⚡', description: 'Consistently active and engaged' };
  }
  if (txPerDay >= 5) {
    return { title: 'Speed Demon', emoji: '🏎️', description: 'Rapid-fire transactions all day' };
  }
  if (volumePerTx >= 1) {
    return { title: 'Big Mover', emoji: '🐋', description: 'Each transaction packs a punch' };
  }
  if (data.activeDays >= 60) {
    return { title: 'Consistent Builder', emoji: '🔨', description: 'Steady and reliable, in it for the long haul' };
  }
  if (data.transactionCount >= 100) {
    return { title: 'Rising Star', emoji: '⭐', description: 'On their way to greatness' };
  }
  if (data.tradingVolumeEth >= 5) {
    return { title: 'Active Trader', emoji: '📈', description: 'Knows their way around the markets' };
  }

  return { title: 'Abstract Explorer', emoji: '🚀', description: 'Just getting started on their journey' };
}

interface WalletAnalytics {
  address: string;
  balance: string;
  balanceFormatted: string;
  balanceUsd: string;
  transactionCount: number;
  firstTxDate: string | null;
  lastTxDate: string | null;
  walletAgeDays: number | null;
  activeDays: number;
  contractsInteracted: number;
  tokenCount: number;
  nftCount: number;
  totalGasUsed: string;
  totalGasUsedEth: number;
  totalGasUsedUsd: string;
  tradingVolume: string;
  tradingVolumeEth: number;
  tradingVolumeUsd: string;
  // P&L tracking
  ethReceived: number;
  ethReceivedUsd: string;
  ethSent: number;
  ethSentUsd: string;
  netPnl: number;
  netPnlUsd: string;
  isProfitable: boolean;
  ethPriceUsd: number;
  favoriteApps: FavoriteApp[];
  badges: Badge[];
  abstractBadgeCount: number;
  xeetCards: XeetCard[];
  xeetCardCount: number;
  nftHoldings: NftHolding[];
  walletScore: number;
  walletRank: string;
  walletPercentile: number;
  personality: { title: string; emoji: string; description: string };
  limitedData: boolean;
  dailyActivity: { date: string; count: number }[];
  error?: string;
}

async function rpcCall(method: string, params: unknown[] = []) {
  const response = await fetchWithTimeout(ABSTRACT_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
    timeout: timeouts.DEFAULT,
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function getExplorerData(module: string, action: string, address: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    module,
    action,
    address,
    ...extra,
  });

  try {
    const response = await fetchWithTimeout(`${EXPLORER_API}?${params}`, {
      headers: { 'Accept': 'application/json' },
      timeout: timeouts.DEFAULT,
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Explorer API error:', err);
    return null;
  }
}

// Badge metadata API
const ABSTRACT_BADGE_METADATA_URL = 'https://abstract-assets.abs.xyz/badges';

// Known badge names and images for faster loading
const KNOWN_BADGES: Record<string, { name: string; image: string }> = {
  '1': { name: 'Discord Verified', image: 'https://abstract-assets.abs.xyz/badges/badge-discord.png' },
  '2': { name: 'X Verified', image: 'https://abstract-assets.abs.xyz/badges/badge-twitter.png' },
  '3': { name: 'Fund your Account', image: 'https://abstract-assets.abs.xyz/badges/badge-fund-account.png' },
  '4': { name: 'App Voter', image: 'https://abstract-assets.abs.xyz/badges/badge-app-voter.png' },
  '5': { name: 'The Trader', image: 'https://abstract-assets.abs.xyz/badges/badge-the-trader.png' },
  '10': { name: "You're So Early", image: 'https://abstract-assets.abs.xyz/badges/badge-so-early.png' },
  '16': { name: 'The Sock Master', image: 'https://abstract-assets.abs.xyz/badges/badge-sock-master.png' },
  '18': { name: 'Roach Racer', image: 'https://abstract-assets.abs.xyz/badges/badge-roach-racing.png' },
  '22': { name: 'Gacha Goat', image: 'https://abstract-assets.abs.xyz/badges/badge-gacha-goat.png' },
  '26': { name: 'The Big Badge', image: 'https://abstract-assets.abs.xyz/badges/badge-bigcoin.png' },
  '27': { name: 'Multiplier Mommy', image: 'https://abstract-assets.abs.xyz/badges/badge-multiplier-mommy.png' },
  '28': { name: 'Myriad Grand Master', image: 'https://abstract-assets.abs.xyz/badges/badge-myriad-mastermind.png' },
  '29': { name: 'Giga Juicy', image: 'https://abstract-assets.abs.xyz/badges/badge-giga-juicy.png' },
  '31': { name: 'Abstract Games Survivor', image: 'https://abstract-assets.abs.xyz/badges/badge-abstract-games-survivor.png' },
  '42': { name: 'Cambrian Artifact Hunter', image: 'https://abstract-assets.abs.xyz/badges/badge-cambria-gold-rush.png' },
  '45': { name: 'Email Notification', image: 'https://abstract-assets.abs.xyz/badges/badge-email-notification.png' },
  '46': { name: 'Speed Trader', image: 'https://abstract-assets.abs.xyz/badges/badge-speed-trader.png' },
  '48': { name: 'One Year Badge', image: 'https://abstract-assets.abs.xyz/badges/badge-wrapped.png' },
};

// Fetch badge metadata from Abstract API
async function fetchBadgeMetadata(tokenId: string): Promise<{ name: string; icon: string; color: string; image?: string }> {
  // Check known badges first
  const known = KNOWN_BADGES[tokenId];
  if (known) {
    return { name: known.name, icon: '🏅', color: '#2edb84', image: known.image };
  }

  try {
    const res = await fetchWithTimeout(`${ABSTRACT_BADGE_METADATA_URL}/${tokenId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ZaddyTools/1.0)',
      },
      timeout: timeouts.SHORT,
    });
    if (res.ok) {
      const data = await res.json();
      return {
        name: data.name || `Badge #${tokenId}`,
        icon: '🏅',
        color: '#2edb84',
        image: data.image,
      };
    }
  } catch {
    // Ignore errors
  }
  return { name: `Badge #${tokenId}`, icon: '🏅', color: '#2edb84' };
}

// Fetch Abstract Badges by querying the ERC-1155 contract directly
async function fetchAbstractBadges(address: string): Promise<Badge[]> {
  const badges: Badge[] = [];

  try {
    // Query badge balances directly from the contract (ERC-1155 balanceOf)
    // Check badge IDs 1-50 (most badges are in this range)
    const badgeChecks: Promise<{ tokenId: string; balance: number }>[] = [];

    for (let tokenId = 1; tokenId <= 50; tokenId++) {
      // ERC-1155 balanceOf(address, tokenId) - function selector: 0x00fdd58e
      const addressPadded = address.slice(2).toLowerCase().padStart(64, '0');
      const tokenIdHex = tokenId.toString(16).padStart(64, '0');
      const data = `0x00fdd58e${addressPadded}${tokenIdHex}`;

      badgeChecks.push(
        fetch(ABSTRACT_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: tokenId,
            method: 'eth_call',
            params: [{ to: ABSTRACT_BADGES_CONTRACT, data }, 'latest'],
          }),
        })
          .then((res) => res.json())
          .then((data) => ({
            tokenId: String(tokenId),
            balance: data.result ? parseInt(data.result, 16) : 0,
          }))
          .catch(() => ({ tokenId: String(tokenId), balance: 0 }))
      );
    }

    const results = await Promise.all(badgeChecks);

    // Get badges the user owns
    const ownedBadges = results.filter((r) => r.balance > 0);

    // Fetch metadata for owned badges in parallel
    const metadataPromises = ownedBadges.map(async ({ tokenId }) => {
      const metadata = await fetchBadgeMetadata(tokenId);
      return { tokenId, metadata };
    });

    const badgesWithMetadata = await Promise.all(metadataPromises);

    for (const { tokenId, metadata } of badgesWithMetadata) {
      badges.push({
        id: `badge-${tokenId}`,
        label: metadata.name,
        description: `Abstract Badge #${tokenId}`,
        color: metadata.color,
        icon: metadata.icon,
        tokenId,
        image: metadata.image,
      });
    }

  } catch (err) {
    console.error('Error fetching Abstract badges:', err);
  }

  return badges;
}

// Xeet Creator Card interface
interface XeetCard {
  tokenId: string;
  name: string;
  image?: string;
  balance: number;
}

// Fetch Xeet Creator Cards by querying the ERC-1155 contract
async function fetchXeetCards(address: string): Promise<XeetCard[]> {
  const cards: XeetCard[] = [];
  const MAX_TOKEN_ID = 900;
  const BATCH_SIZE = 100; // Batch RPC calls for efficiency

  try {
    const addressPadded = address.slice(2).toLowerCase().padStart(64, '0');
    const ownedCards: { tokenId: string; balance: number }[] = [];

    // Process in batches using JSON-RPC batch requests
    for (let batchStart = 1; batchStart <= MAX_TOKEN_ID; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, MAX_TOKEN_ID);
      const batchCalls: { jsonrpc: string; id: number; method: string; params: unknown[] }[] = [];

      for (let tokenId = batchStart; tokenId <= batchEnd; tokenId++) {
        const tokenIdHex = tokenId.toString(16).padStart(64, '0');
        const data = `0x00fdd58e${addressPadded}${tokenIdHex}`;
        batchCalls.push({
          jsonrpc: '2.0',
          id: tokenId,
          method: 'eth_call',
          params: [{ to: XEET_CARDS_CONTRACT, data }, 'latest'],
        });
      }

      try {
        const res = await fetchWithTimeout(ABSTRACT_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchCalls),
          timeout: timeouts.DEFAULT,
        });
        const results = await res.json();

        // Handle both array response (batch) and single response
        const responses = Array.isArray(results) ? results : [results];
        for (const r of responses) {
          if (r.result) {
            const balance = parseInt(r.result, 16);
            if (balance > 0) {
              ownedCards.push({ tokenId: String(r.id), balance });
            }
          }
        }
      } catch {
        // Continue with next batch on error
      }
    }

    // Skip OpenSea metadata for speed - just return basic card info
    for (const { tokenId, balance } of ownedCards) {
      cards.push({
        tokenId,
        name: `Xeet Card #${tokenId}`,
        image: undefined, // Skip image fetching for speed
        balance,
      });
    }

  } catch (err) {
    console.error('Error fetching Xeet cards:', err);
  }

  return cards;
}

function calculateWalletScore(data: {
  walletAgeDays: number | null;
  transactionCount: number;
  activeDays: number;
  contractsInteracted: number;
  nftCount: number;
  tradingVolumeEth: number;
  balanceEth: number;
}): { score: number; rank: string; percentile: number } {
  let score = 0;

  // Age score (max 20 points)
  if (data.walletAgeDays !== null) {
    score += Math.min(20, Math.floor(data.walletAgeDays / 18.25)); // 1 year = 20 points
  }

  // Transaction score (max 25 points)
  score += Math.min(25, Math.floor(Math.log10(data.transactionCount + 1) * 8));

  // Active days score (max 15 points)
  score += Math.min(15, Math.floor(data.activeDays / 6.67)); // 100 days = 15 points

  // Contracts score (max 15 points)
  score += Math.min(15, Math.floor(data.contractsInteracted / 3.33)); // 50 contracts = 15 points

  // NFT score (max 10 points)
  score += Math.min(10, Math.floor(Math.log10(data.nftCount + 1) * 5));

  // Volume score (max 10 points)
  score += Math.min(10, Math.floor(Math.log10(data.tradingVolumeEth + 1) * 5));

  // Balance score (max 5 points)
  score += Math.min(5, Math.floor(Math.log10(data.balanceEth + 1) * 2.5));

  // Determine activity grade (not Abstract tier - this is our own score)
  let rank: string;
  if (score >= 90) rank = 'S';
  else if (score >= 75) rank = 'A+';
  else if (score >= 60) rank = 'A';
  else if (score >= 45) rank = 'B';
  else if (score >= 30) rank = 'C';
  else if (score >= 15) rank = 'D';
  else rank = 'New';

  // Calculate percentile based on score
  // Higher score = lower percentile (top X%)
  let percentile: number;
  if (score >= 90) percentile = 1;
  else if (score >= 85) percentile = 2;
  else if (score >= 80) percentile = 3;
  else if (score >= 75) percentile = 5;
  else if (score >= 70) percentile = 8;
  else if (score >= 65) percentile = 10;
  else if (score >= 60) percentile = 15;
  else if (score >= 55) percentile = 20;
  else if (score >= 50) percentile = 25;
  else if (score >= 45) percentile = 30;
  else if (score >= 40) percentile = 40;
  else if (score >= 35) percentile = 50;
  else if (score >= 30) percentile = 60;
  else if (score >= 25) percentile = 70;
  else if (score >= 20) percentile = 80;
  else if (score >= 15) percentile = 90;
  else percentile = 95;

  return { score: Math.min(100, score), rank, percentile };
}

export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
  }

  try {
    // Fetch basic data from RPC
    const [balanceHex, txCountHex] = await Promise.all([
      rpcCall('eth_getBalance', [address, 'latest']),
      rpcCall('eth_getTransactionCount', [address, 'latest']),
    ]);

    const balanceWei = BigInt(balanceHex);
    const balanceEth = Number(balanceWei) / 1e18;
    const nonceCount = parseInt(txCountHex, 16); // This is just outgoing tx nonce

    // Initialize analytics data
    let firstTxDate: string | null = null;
    let lastTxDate: string | null = null;
    let walletAgeDays: number | null = null;
    let activeDays = 0;
    let contractsInteracted = 0;
    let totalGasUsedEth = 0;
    let tradingVolumeEth = 0;
    let tradingVolumeUsdHistorical = 0;
    // P&L tracking
    let ethReceivedTotal = 0;
    let ethReceivedUsdTotal = 0;
    let ethSentTotal = 0;
    let ethSentUsdTotal = 0;
    const favoriteApps: FavoriteApp[] = [];
    // Daily activity for heatmap
    let dailyTxCounts = new Map<string, number>();

    // Get current ETH price for balance
    let ethPriceUsd = 2000; // fallback
    try {
      const priceRes = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
        timeout: timeouts.SHORT,
      });
      const priceData = await priceRes.json();
      ethPriceUsd = priceData?.ethereum?.usd || 2000;
    } catch {
      // Use fallback price
    }

    // Get historical ETH prices for the past 365 days
    const historicalPrices = new Map<string, number>();
    try {
      const histRes = await fetchWithTimeout('https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=365', {
        timeout: timeouts.DEFAULT,
      });
      const histData = await histRes.json();
      if (histData?.prices) {
        for (const [timestamp, price] of histData.prices) {
          const date = new Date(timestamp).toISOString().split('T')[0];
          historicalPrices.set(date, price);
        }
      }
    } catch {
      // Will use current price as fallback
    }

    // Get transaction history using block ranges to bypass API pagination limits
    // API limit: page * offset <= 1000, so we use block ranges instead
    const allTxs: any[] = [];
    const seenHashes = new Set<string>();

    // Get current block number for range calculation
    let currentBlock = 50000000; // Default high value
    try {
      const blockHex = await rpcCall('eth_blockNumber', []);
      currentBlock = parseInt(blockHex, 16);
    } catch {
      // Use default
    }

    // Fetch transactions in block ranges with pagination within each range
    const blockStep = 2000000; // ~2M blocks per range
    for (let startBlock = 0; startBlock <= currentBlock; startBlock += blockStep) {
      const endBlock = Math.min(startBlock + blockStep - 1, currentBlock);

      // Paginate within each block range
      for (let page = 1; page <= 20; page++) {
        const txListData = await getExplorerData('account', 'txlist', address, {
          startblock: String(startBlock),
          endblock: String(endBlock),
          page: String(page),
          offset: '1000',
          sort: 'asc',
        });

        if (txListData?.status !== '1' || !Array.isArray(txListData.result) || txListData.result.length === 0) {
          break; // No more transactions in this block range
        }

        for (const tx of txListData.result) {
          if (!seenHashes.has(tx.hash)) {
            seenHashes.add(tx.hash);
            allTxs.push(tx);
          }
        }

        // If we got less than 1000, no more pages in this range
        if (txListData.result.length < 1000) {
          break;
        }
      }
    }

    // Sort all transactions by timestamp
    allTxs.sort((a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp));

    if (allTxs.length > 0) {
      const txs = allTxs;

      // First and last tx dates
      const firstTx = txs[0];
      const lastTx = txs[txs.length - 1];

      if (firstTx?.timeStamp) {
        const firstDate = new Date(parseInt(firstTx.timeStamp) * 1000);
        firstTxDate = firstDate.toISOString().split('T')[0];
        walletAgeDays = Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (lastTx?.timeStamp) {
        lastTxDate = new Date(parseInt(lastTx.timeStamp) * 1000).toISOString().split('T')[0];
      }

      // Track unique days, contracts, and calculate volumes with historical prices
      dailyTxCounts = new Map<string, number>();
      const contractInteractions = new Map<string, number>();
      let gasTotal = BigInt(0);
      let volumeTotal = BigInt(0);

      for (const tx of txs) {
        // Track active days with counts
        let txDate = '';
        if (tx.timeStamp) {
          txDate = new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0];
          dailyTxCounts.set(txDate, (dailyTxCounts.get(txDate) || 0) + 1);
        }

        // Track contract interactions
        if (tx.to && tx.to !== '') {
          const contractAddr = tx.to.toLowerCase();
          contractInteractions.set(contractAddr, (contractInteractions.get(contractAddr) || 0) + 1);
        }

        // Calculate gas - only count when this wallet paid for it (is the sender)
        if (tx.from?.toLowerCase() === address.toLowerCase() && tx.gasUsed && tx.gasPrice) {
          gasTotal += BigInt(tx.gasUsed) * BigInt(tx.gasPrice);
        }

        // Calculate volume (ETH transferred) with historical USD price
        if (tx.value && tx.value !== '0') {
          const ethValue = Number(BigInt(tx.value)) / 1e18;
          volumeTotal += BigInt(tx.value);

          // Get historical price for this date, fallback to current price
          const historicalPrice = historicalPrices.get(txDate) || ethPriceUsd;
          tradingVolumeUsdHistorical += ethValue * historicalPrice;

          // Track P&L: ETH received vs sent
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            // Received ETH
            ethReceivedTotal += ethValue;
            ethReceivedUsdTotal += ethValue * historicalPrice;
          } else if (tx.from?.toLowerCase() === address.toLowerCase()) {
            // Sent ETH
            ethSentTotal += ethValue;
            ethSentUsdTotal += ethValue * historicalPrice;
          }
        }
      }

      activeDays = dailyTxCounts.size;
      contractsInteracted = contractInteractions.size;
      totalGasUsedEth = Number(gasTotal) / 1e18;
      tradingVolumeEth = Number(volumeTotal) / 1e18;

      // Get top 5 favorite apps
      const sortedContracts = Array.from(contractInteractions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const totalInteractions = txs.length;

      // Try to get contract names from explorer
      for (const [addr, count] of sortedContracts) {
        let name = KNOWN_CONTRACTS[addr.toLowerCase()];

        if (!name) {
          // Try to get contract info from explorer
          try {
            const contractInfo = await getExplorerData('contract', 'getsourcecode', addr);
            if (contractInfo?.status === '1' && contractInfo?.result?.[0]?.ContractName) {
              let contractName = contractInfo.result[0].ContractName;
              // Clean up the name (remove path prefixes like "contracts/")
              if (contractName.includes(':')) {
                contractName = contractName.split(':').pop() || contractName;
              }
              if (contractName.includes('/')) {
                contractName = contractName.split('/').pop() || contractName;
              }
              // Remove .sol extension if present
              contractName = contractName.replace('.sol', '');
              name = contractName;
            }
          } catch {
            // Ignore errors
          }
        }

        // If still no name, try token info
        if (!name) {
          try {
            const tokenInfo = await getExplorerData('token', 'tokeninfo', addr);
            if (tokenInfo?.status === '1' && tokenInfo?.result?.[0]?.name) {
              name = tokenInfo.result[0].name;
            }
          } catch {
            // Ignore errors
          }
        }

        favoriteApps.push({
          address: addr,
          name: name || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          interactions: count,
          percentage: Math.round((count / totalInteractions) * 100),
        });
      }
    }

    // Get internal transactions for more accurate volume (with historical prices) - paginate
    let internalTxs: any[] = [];
    for (let page = 1; page <= 10; page++) {
      const internalTxData = await getExplorerData('account', 'txlistinternal', address, {
        startblock: '0',
        endblock: '99999999',
        page: String(page),
        offset: '1000',
        sort: 'asc',
      });
      if (internalTxData?.status !== '1' || !internalTxData?.result?.length) break;
      internalTxs = internalTxs.concat(internalTxData.result);
      if (internalTxData.result.length < 1000) break;
    }

    if (internalTxs.length > 0) {
      for (const tx of internalTxs) {
        if (tx.value && tx.value !== '0') {
          const ethValue = Number(BigInt(tx.value)) / 1e18;
          tradingVolumeEth += ethValue;

          // Apply historical price
          let txDate = '';
          if (tx.timeStamp) {
            txDate = new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0];
          }
          const historicalPrice = historicalPrices.get(txDate) || ethPriceUsd;
          tradingVolumeUsdHistorical += ethValue * historicalPrice;

          // Track P&L
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            ethReceivedTotal += ethValue;
            ethReceivedUsdTotal += ethValue * historicalPrice;
          } else if (tx.from?.toLowerCase() === address.toLowerCase()) {
            ethSentTotal += ethValue;
            ethSentUsdTotal += ethValue * historicalPrice;
          }
        }
      }
    }

    // Get token transfers for trading volume - include WETH and stablecoins
    const WETH_ADDRESSES = [
      '0x3439153eb7af838ad19d56e1571fbd09333c2809',
      '0x4200000000000000000000000000000000000006',
    ];
    const STABLECOIN_ADDRESSES = [
      '0x84a71ccd554cc1b02749b35d22f684cc8ec987e1', // USDC.e
    ];

    // Paginate token transfers
    let tokenTxs: any[] = [];
    for (let page = 1; page <= 10; page++) {
      const tokenTxData = await getExplorerData('account', 'tokentx', address, {
        startblock: '0',
        endblock: '99999999',
        page: String(page),
        offset: '1000',
        sort: 'asc',
      });
      if (tokenTxData?.status !== '1' || !tokenTxData?.result?.length) break;
      tokenTxs = tokenTxs.concat(tokenTxData.result);
      if (tokenTxData.result.length < 1000) break;
    }

    // Add WETH transfers to trading volume
    for (const tx of tokenTxs) {
      const contractAddr = tx.contractAddress?.toLowerCase() || '';
      const value = tx.value ? Number(BigInt(tx.value)) / Math.pow(10, parseInt(tx.tokenDecimal || '18')) : 0;

      if (WETH_ADDRESSES.includes(contractAddr)) {
        // WETH = ETH equivalent
        tradingVolumeEth += value;

        // Apply historical price
        let txDate = '';
        if (tx.timeStamp) {
          txDate = new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0];
        }
        const historicalPrice = historicalPrices.get(txDate) || ethPriceUsd;
        tradingVolumeUsdHistorical += value * historicalPrice;

        // Track WETH P&L
        if (tx.to?.toLowerCase() === address.toLowerCase()) {
          ethReceivedTotal += value;
          ethReceivedUsdTotal += value * historicalPrice;
        } else if (tx.from?.toLowerCase() === address.toLowerCase()) {
          ethSentTotal += value;
          ethSentUsdTotal += value * historicalPrice;
        }
      } else if (STABLECOIN_ADDRESSES.includes(contractAddr)) {
        // USDC/stablecoins - already in USD
        tradingVolumeUsdHistorical += value;
        tradingVolumeEth += value / ethPriceUsd; // Rough ETH equivalent

        // Track stablecoin P&L
        if (tx.to?.toLowerCase() === address.toLowerCase()) {
          ethReceivedUsdTotal += value;
        } else if (tx.from?.toLowerCase() === address.toLowerCase()) {
          ethSentUsdTotal += value;
        }
      }
    }

    // Count unique tokens held from transfers
    const tokenBalances = new Map<string, number>();
    for (const tx of tokenTxs) {
      const contractAddr = tx.contractAddress?.toLowerCase() || '';
      const value = tx.value ? Number(BigInt(tx.value)) / Math.pow(10, parseInt(tx.tokenDecimal || '18')) : 0;

      const current = tokenBalances.get(contractAddr) || 0;
      if (tx.to.toLowerCase() === address.toLowerCase()) {
        tokenBalances.set(contractAddr, current + value);
      } else if (tx.from.toLowerCase() === address.toLowerCase()) {
        tokenBalances.set(contractAddr, current - value);
      }
    }
    const tokenCount = Array.from(tokenBalances.values()).filter((v) => v > 0.0001).length;

    // NFT count and holdings - try multiple approaches
    let nftCount = 0;
    let openSeaNftCount = 0; // More accurate count from OpenSea (includes ERC1155)
    const nftHoldings: NftHolding[] = [];
    const nftBalanceMap = new Map<string, { balance: number; contractAddress: string; tokenId: string; tokenName?: string; collectionName?: string }>();

    // Track OpenSea NFTs for holdings (includes ERC1155)
    interface OpenSeaNft {
      contract: string;
      identifier: string;
      collection: string;
      name: string | null;
      image_url: string | null;
      token_standard: string;
    }
    const openSeaNfts: OpenSeaNft[] = [];

    // Try OpenSea API for accurate NFT count (includes ERC1155)
    if (process.env.OPENSEA_API_KEY) {
      try {
        let nextCursor: string | null = '';
        let pageCount = 0;
        const maxPages = 10; // Safety limit

        while (nextCursor !== null && pageCount < maxPages) {
          const nftUrl: string = `https://api.opensea.io/api/v2/chain/abstract/account/${address}/nfts?limit=200${nextCursor ? `&next=${nextCursor}` : ''}`;
          const osResponse = await fetchWithTimeout(nftUrl, {
            headers: {
              'Accept': 'application/json',
              'X-API-KEY': process.env.OPENSEA_API_KEY,
            },
            timeout: timeouts.DEFAULT,
          });

          if (osResponse.ok) {
            const osData = await osResponse.json();
            const nfts = osData.nfts || [];
            openSeaNftCount += nfts.length;

            // Store NFT data for holdings
            for (const nft of nfts) {
              openSeaNfts.push({
                contract: nft.contract?.toLowerCase() || '',
                identifier: nft.identifier || '',
                collection: nft.collection || '',
                name: nft.name || null,
                image_url: nft.image_url || nft.display_image_url || null,
                token_standard: nft.token_standard || 'erc721',
              });
            }

            nextCursor = osData.next || null;
            pageCount++;
          } else {
            break;
          }
        }
      } catch {
        // OpenSea failed, will use transfer-based counting
      }
    }

    // Try ERC721 transfers - paginate to get all
    for (let page = 1; page <= 10; page++) {
      const nftData = await getExplorerData('account', 'tokennfttx', address, {
        startblock: '0',
        endblock: '99999999',
        page: String(page),
        offset: '1000',
        sort: 'asc',
      });

      if (nftData?.status !== '1' || !nftData?.result?.length) break;

      for (const tx of nftData.result) {
        const key = `${tx.contractAddress.toLowerCase()}-${tx.tokenID}`;
        const existing = nftBalanceMap.get(key) || {
          balance: 0,
          contractAddress: tx.contractAddress,
          tokenId: tx.tokenID,
          tokenName: tx.tokenName,
          collectionName: tx.tokenSymbol || tx.tokenName
        };

        if (tx.to.toLowerCase() === address.toLowerCase()) {
          existing.balance += 1;
        } else if (tx.from.toLowerCase() === address.toLowerCase()) {
          existing.balance -= 1;
        }
        nftBalanceMap.set(key, existing);
      }

      if (nftData.result.length < 1000) break;
    }

    // Note: Abscan API doesn't support token1155tx endpoint
    // ERC1155 NFTs are fetched via OpenSea API which includes all token standards

    // Count owned NFTs - prefer OpenSea data if available (includes ERC1155)
    if (openSeaNfts.length > 0) {
      // Use OpenSea data for holdings - it includes ERC1155 NFTs
      nftCount = openSeaNfts.length;

      // Filter out badges and xeet cards (shown separately) and count by collection
      const collectionCounts = new Map<string, { count: number; nfts: typeof openSeaNfts }>();
      for (const nft of openSeaNfts) {
        // Skip badges and xeet cards
        if (nft.contract === ABSTRACT_BADGES_CONTRACT.toLowerCase() ||
            nft.contract === XEET_CARDS_CONTRACT.toLowerCase()) {
          continue;
        }

        const existing = collectionCounts.get(nft.contract) || { count: 0, nfts: [] };
        existing.count++;
        existing.nfts.push(nft);
        collectionCounts.set(nft.contract, existing);
      }

      // Sort collections by count (most NFTs first) and build holdings
      const sortedCollections = Array.from(collectionCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      // Fetch collection data for floor prices
      const collectionDataList = await Promise.all(
        sortedCollections.map(([contract]) => getCollectionData(contract))
      );

      for (let i = 0; i < sortedCollections.length; i++) {
        const [contract, data] = sortedCollections[i];
        const colData = collectionDataList[i];
        const firstNft = data.nfts[0];
        const floorEth = colData.floorEth || 0;
        const estimatedValueUsd = floorEth > 0 ? floorEth * data.count * ethPriceUsd : undefined;

        nftHoldings.push({
          contractAddress: contract,
          tokenId: firstNft.identifier,
          name: data.count > 1 ? `${data.count} NFTs` : (firstNft.name || `#${firstNft.identifier}`),
          collectionName: colData.name || firstNft.collection || `${contract.slice(0, 6)}...${contract.slice(-4)}`,
          image: firstNft.image_url || colData.image || undefined,
          count: data.count,
          estimatedValueUsd,
        });
      }
    } else {
      // Fallback to explorer-based ERC721 data
      const ownedNfts = Array.from(nftBalanceMap.values()).filter(v => v.balance > 0);
      nftCount = ownedNfts.reduce((sum, nft) => sum + nft.balance, 0);

      // Get collection names for top NFTs (exclude Abstract Badges which are shown separately)
      const nonBadgeNfts = ownedNfts.filter(nft =>
        nft.contractAddress.toLowerCase() !== ABSTRACT_BADGES_CONTRACT.toLowerCase()
      );

      // Count NFTs per collection to prioritize bigger holdings
      const collectionCounts = new Map<string, number>();
      for (const nft of nonBadgeNfts) {
        const addr = nft.contractAddress.toLowerCase();
        collectionCounts.set(addr, (collectionCounts.get(addr) || 0) + nft.balance);
      }

      // Sort by collection size (most NFTs first)
      nonBadgeNfts.sort((a, b) => {
        const countA = collectionCounts.get(a.contractAddress.toLowerCase()) || 0;
        const countB = collectionCounts.get(b.contractAddress.toLowerCase()) || 0;
        return countB - countA;
      });

      // Try to get better names for top collections
      const collectionNames = new Map<string, string>();
      const uniqueContracts = Array.from(new Set(nonBadgeNfts.map(n => n.contractAddress.toLowerCase())));

      for (const contractAddr of uniqueContracts.slice(0, 10)) {
        try {
          const tokenInfo = await getExplorerData('token', 'tokeninfo', contractAddr);
          if (tokenInfo?.status === '1' && tokenInfo?.result?.[0]) {
            const name = tokenInfo.result[0].name || tokenInfo.result[0].symbol;
            if (name) collectionNames.set(contractAddr.toLowerCase(), name);
          }
        } catch {
          // Ignore errors
        }
      }

      // Build top NFT holdings - one per collection, sorted by collection size
      const seenCollections = new Set<string>();
      const holdingsToProcess: Array<{
        contractAddress: string;
        tokenId: string;
        tokenName?: string;
        collectionName: string;
        count: number;
      }> = [];

      for (const nft of nonBadgeNfts) {
        const contractLower = nft.contractAddress.toLowerCase();

        // Only show one NFT per collection
        if (seenCollections.has(contractLower)) continue;
        seenCollections.add(contractLower);

        const collectionName = KNOWN_NFT_COLLECTIONS[contractLower]?.name ||
                               collectionNames.get(contractLower) ||
                               nft.collectionName ||
                               `${nft.contractAddress.slice(0, 6)}...${nft.contractAddress.slice(-4)}`;

        const count = collectionCounts.get(contractLower) || 1;

        holdingsToProcess.push({
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          tokenName: nft.tokenName,
          collectionName,
          count,
        });

        if (holdingsToProcess.length >= 10) break;
      }

      // Fetch collection data (floor prices, names, images) for top collections in parallel
      const collectionDataList = await Promise.all(
        holdingsToProcess.map(h => getCollectionData(h.contractAddress))
      );

      // Build final holdings with prices and images
      for (let i = 0; i < holdingsToProcess.length; i++) {
        const h = holdingsToProcess[i];
        const colData = collectionDataList[i];
        const floorEth = colData.floorEth || 0;
        const estimatedValueUsd = floorEth > 0 ? floorEth * h.count * ethPriceUsd : undefined;

        // Use OpenSea name if available, otherwise fall back to existing name
        const collectionName = colData.name || h.collectionName;

        nftHoldings.push({
          contractAddress: h.contractAddress,
          tokenId: h.tokenId,
          name: h.count > 1 ? `${h.count} NFTs` : (h.tokenName || `#${h.tokenId}`),
          collectionName,
          image: colData.image || undefined,
          count: h.count,
          estimatedValueUsd,
        });
      }
    }

    // Use actual fetched transaction count (more accurate than nonce which is just outgoing)
    // Note: Explorer API has limits - if we hit exactly 2000, 5000, or 10000, we likely hit a cap
    let transactionCount = allTxs.length > 0 ? allTxs.length : nonceCount;

    // Use the actual fetched transaction count - no guessing

    // Estimate data if API wasn't available (no API key or API failed)
    const hasApiData = activeDays > 0 || contractsInteracted > 0;
    if (!hasApiData && nonceCount > 0) {
      // Abstract mainnet launched around Jan 2025
      // Estimate based on transaction count
      const ABSTRACT_LAUNCH = new Date('2025-01-27');
      const daysSinceLaunch = Math.floor((Date.now() - ABSTRACT_LAUNCH.getTime()) / (1000 * 60 * 60 * 24));

      // Estimate wallet age: if they have txs, assume they started within first month
      walletAgeDays = Math.min(daysSinceLaunch, Math.max(1, Math.floor(transactionCount / 10)));

      // Estimate active days: assume ~5-20 txs per active day
      activeDays = Math.max(1, Math.floor(transactionCount / 10));

      // Estimate contracts: assume ~30% of txs go to unique contracts
      contractsInteracted = Math.max(1, Math.floor(transactionCount * 0.3));

      // Note: Other fields remain at 0/null as we can't estimate them
      firstTxDate = new Date(Date.now() - (walletAgeDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      lastTxDate = new Date().toISOString().split('T')[0];
    }

    // Fetch Abstract Badges NFTs and Xeet Creator Cards in parallel
    const [badges, xeetCards] = await Promise.all([
      fetchAbstractBadges(address),
      fetchXeetCards(address),
    ]);
    const abstractBadgeCount = badges.length;
    const xeetCardCount = xeetCards.reduce((sum, card) => sum + card.balance, 0);

    // Add ERC1155 NFTs (badges and xeet cards) to total NFT count
    // BUT only if we didn't use OpenSea data (which already includes them)
    if (openSeaNfts.length === 0) {
      // Fallback path: OpenSea failed, so add badges/xeet from direct RPC
      nftCount += abstractBadgeCount + xeetCardCount;
    }
    // If OpenSea was used, nftCount already includes all NFTs (no double-counting)

    // Calculate score and personality
    const scoreData = {
      walletAgeDays,
      transactionCount,
      activeDays,
      contractsInteracted,
      nftCount,
      tokenCount,
      tradingVolumeEth,
      balanceEth,
    };

    const { score: walletScore, rank: walletRank, percentile: walletPercentile } = calculateWalletScore(scoreData);

    const personality = getWalletPersonality({
      transactionCount,
      tradingVolumeEth,
      nftCount,
      contractsInteracted,
      activeDays,
      balanceEth,
    });

    const balanceUsd = balanceEth * ethPriceUsd;
    // Use historical prices for trading volume, fallback to current price if no historical data
    const tradingVolumeUsd = tradingVolumeUsdHistorical > 0 ? tradingVolumeUsdHistorical : tradingVolumeEth * ethPriceUsd;
    const totalGasUsedUsd = totalGasUsedEth * ethPriceUsd;

    const analytics: WalletAnalytics = {
      address,
      balance: balanceWei.toString(),
      balanceFormatted: balanceEth.toFixed(4) + ' ETH',
      balanceUsd: '$' + balanceUsd.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      transactionCount,
      firstTxDate,
      lastTxDate,
      walletAgeDays,
      activeDays,
      contractsInteracted,
      tokenCount,
      nftCount,
      totalGasUsed: totalGasUsedEth.toFixed(6) + ' ETH',
      totalGasUsedEth,
      totalGasUsedUsd: '$' + totalGasUsedUsd.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      tradingVolume: tradingVolumeEth.toFixed(4) + ' ETH',
      tradingVolumeEth,
      tradingVolumeUsd: '$' + tradingVolumeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      // P&L data
      ethReceived: ethReceivedTotal,
      ethReceivedUsd: '$' + ethReceivedUsdTotal.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      ethSent: ethSentTotal,
      ethSentUsd: '$' + ethSentUsdTotal.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      netPnl: ethReceivedUsdTotal - ethSentUsdTotal - totalGasUsedUsd,
      netPnlUsd: (ethReceivedUsdTotal - ethSentUsdTotal - totalGasUsedUsd >= 0 ? '+$' : '-$') + Math.abs(ethReceivedUsdTotal - ethSentUsdTotal - totalGasUsedUsd).toLocaleString('en-US', { maximumFractionDigits: 0 }),
      isProfitable: ethReceivedUsdTotal - ethSentUsdTotal - totalGasUsedUsd > 0,
      ethPriceUsd,
      favoriteApps,
      badges,
      abstractBadgeCount,
      xeetCards,
      xeetCardCount,
      nftHoldings,
      walletScore,
      walletRank,
      walletPercentile,
      personality,
      limitedData: !hasApiData,
      dailyActivity: Array.from(dailyTxCounts.entries()).map(([date, count]) => ({ date, count })),
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Wallet analytics error:', error);
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Failed to fetch wallet data') },
      { status: 500 }
    );
  }
}
