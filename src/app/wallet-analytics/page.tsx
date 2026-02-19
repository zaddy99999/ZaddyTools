'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import ErrorBoundary, { CardErrorBoundary } from '@/components/ErrorBoundary';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getAppInfo, CATEGORY_COLORS } from '@/lib/abstractContracts';

// App name to icon mapping for common apps
const APP_ICON_MAP: Record<string, string> = {
  'gigaswap': '/apps/gigaverse.png',
  'gigaverse': '/apps/gigaverse.png',
  'abstract dex': '/AbstractLogo.png',
  'myriad games': '/apps/myriad.png',
  'myriad': '/apps/myriad.png',
  'myriad (markets)': '/apps/myriad.png',
  'final bosu mint': '/apps/gacha.png', // Using gacha as placeholder
  'final bosu': '/apps/gacha.png',
  'abstract portal': '/AbstractLogo.png',
  'roach racing': '/apps/roach-racing-club.png',
  'gigaverse rom': '/apps/gigaverse.png',
  'check token': '/AbstractLogo.png',
  'cambria': '/apps/cambria.png',
  'xeet cards': '/apps/xeet.png',
  'sock master': '/AbstractLogo.png', // Fallback
};

// Get icon for app by name (case-insensitive)
function getAppIcon(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  return APP_ICON_MAP[normalized] || null;
}

// Runescape-style skill calculation from wallet data
interface WalletSkills {
  // Row 1
  attack: number;       // Trading volume
  hitpoints: number;    // Wallet score
  mining: number;       // ETH received
  // Row 2
  strength: number;     // Transaction count
  agility: number;      // Tx per active day
  smithing: number;     // Gas spent
  // Row 3
  defence: number;      // Wallet age
  herblore: number;     // Token diversity
  fishing: number;      // NFT count
  // Row 4
  ranged: number;       // Contracts interacted
  thieving: number;     // Internal tx count
  cooking: number;      // Active days
  // Row 5
  prayer: number;       // Badge count
  crafting: number;     // Xeet cards
  firemaking: number;   // ETH sent volume
  // Row 6
  magic: number;        // P&L performance
  fletching: number;    // Favorite apps
  woodcutting: number;  // NFT holdings value
  // Row 7
  runecraft: number;    // Balance
  slayer: number;       // Percentile rank
  farming: number;      // Days since first tx
  // Row 8
  construction: number; // Profile completeness
  hunter: number;       // Unique collections
  sailing: number;      // Total level bonus
}

function calculateSkillLevels(data: WalletData): WalletSkills {
  // Convert metrics to levels (1-99 like Runescape)
  const volumeUsd = parseFloat(data.tradingVolumeUsd?.replace(/[^0-9.]/g, '') || '0');
  const txPerDay = data.activeDays > 0 ? data.transactionCount / data.activeDays : 0;
  const profitRatio = data.ethReceived > 0 ? (data.ethReceived - data.ethSent) / data.ethReceived : 0;
  const balanceUsd = parseFloat(data.balanceUsd?.replace(/[^0-9.]/g, '') || '0');
  const ethReceivedUsd = parseFloat(data.ethReceivedUsd?.replace(/[^0-9.]/g, '') || '0');
  const ethSentUsd = parseFloat(data.ethSentUsd?.replace(/[^0-9.]/g, '') || '0');

  return {
    // Row 1
    attack: Math.min(99, Math.max(1, Math.floor(Math.log10(volumeUsd + 1) * 15))),
    hitpoints: Math.min(99, Math.max(1, data.walletScore || 10)),
    mining: Math.min(99, Math.max(1, Math.floor(Math.log10(ethReceivedUsd + 1) * 12))),
    // Row 2
    strength: Math.min(99, Math.max(1, Math.floor(Math.log10(data.transactionCount + 1) * 20))),
    agility: Math.min(99, Math.max(1, Math.floor(txPerDay * 5))),
    smithing: Math.min(99, Math.max(1, Math.floor(parseFloat(data.totalGasUsedUsd?.replace(/[^0-9.]/g, '') || '0') / 2))),
    // Row 3
    defence: Math.min(99, Math.max(1, Math.floor((data.walletAgeDays || 0) / 4))),
    herblore: Math.min(99, Math.max(1, data.tokenCount * 3)),
    fishing: Math.min(99, Math.max(1, Math.floor(Math.log10(data.nftCount + 1) * 25))),
    // Row 4
    ranged: Math.min(99, Math.max(1, Math.floor(data.contractsInteracted * 1.5))),
    thieving: Math.min(99, Math.max(1, Math.floor(data.transactionCount / 50))),
    cooking: Math.min(99, Math.max(1, Math.floor(data.activeDays / 2))),
    // Row 5
    prayer: Math.min(99, Math.max(1, (data.abstractBadgeCount || 0) * 4)),
    crafting: Math.min(99, Math.max(1, (data.xeetCardCount || 0) * 5)),
    firemaking: Math.min(99, Math.max(1, Math.floor(Math.log10(ethSentUsd + 1) * 12))),
    // Row 6
    magic: Math.min(99, Math.max(1, Math.floor(50 + profitRatio * 49))),
    fletching: Math.min(99, Math.max(1, (data.favoriteApps?.length || 0) * 15)),
    woodcutting: Math.min(99, Math.max(1, Math.floor(Math.log10((data.nftHoldings?.length || 0) * 100 + 1) * 15))),
    // Row 7
    runecraft: Math.min(99, Math.max(1, Math.floor(Math.log10(balanceUsd + 1) * 20))),
    slayer: Math.min(99, Math.max(1, Math.floor(data.walletScore * 0.99))),
    farming: Math.min(99, Math.max(1, Math.floor((data.walletAgeDays || 0) / 5))),
    // Row 8
    construction: Math.min(99, Math.max(1, Math.floor(((data.abstractBadgeCount || 0) + (data.xeetCardCount || 0) + (data.nftCount > 0 ? 10 : 0)) * 2))),
    hunter: Math.min(99, Math.max(1, Math.floor((data.nftHoldings?.length || 0) * 8))),
    sailing: Math.min(99, Math.max(1, Math.floor(data.walletScore * 0.8))),
  };
}

function getTotalLevel(skills: WalletSkills): number {
  return Object.values(skills).reduce((sum, level) => sum + level, 0);
}

// Tier-based total level ranges (after -200 adjustment)
// Bronze: 600-1000, Silver: 1000-1400, Gold: 1400-1600
// Platinum: 1600-1800, Diamond: 1800-2000, Obsidian: 2000-2150, Ethereal: 2150-2376
const TIER_LEVEL_RANGES: { [tier: number]: [number, number] } = {
  1: [600, 1000],   // Bronze
  2: [1000, 1400],  // Silver
  3: [1400, 1600],  // Gold
  4: [1600, 1800],  // Platinum
  5: [1800, 2000],  // Diamond
  6: [2000, 2150],  // Obsidian
  7: [2150, 2376],  // Ethereal (max is 24 skills × 99 = 2376)
};

// Get deterministic "random" value based on wallet address for consistent results
function getWalletSeed(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Calculate tier-based total level
function getTierBasedTotalLevel(tier: number, walletAddress: string): number {
  const range = TIER_LEVEL_RANGES[tier] || TIER_LEVEL_RANGES[1];
  const seed = getWalletSeed(walletAddress);
  // Use seed to get consistent position within range
  const position = (seed % 1000) / 1000;
  return Math.floor(range[0] + (range[1] - range[0]) * position);
}

// Scale skills to match a target total
function scaleSkillsToTotal(skills: WalletSkills, targetTotal: number): WalletSkills {
  const currentTotal = getTotalLevel(skills);
  if (currentTotal === 0) return skills;

  const scaleFactor = targetTotal / currentTotal;
  const skillKeys = Object.keys(skills) as (keyof WalletSkills)[];

  // First pass: scale all skills
  const scaledSkills: Partial<WalletSkills> = {};
  let newTotal = 0;

  for (const key of skillKeys) {
    let scaledValue = Math.round(skills[key] * scaleFactor);
    // Clamp to valid range (1-99)
    scaledValue = Math.max(1, Math.min(99, scaledValue));
    scaledSkills[key] = scaledValue;
    newTotal += scaledValue;
  }

  // Second pass: adjust to hit exact target
  const diff = targetTotal - newTotal;
  if (diff !== 0) {
    const direction = diff > 0 ? 1 : -1;
    let remaining = Math.abs(diff);

    // Sort skills by value to distribute adjustment
    const sortedKeys = [...skillKeys].sort((a, b) =>
      direction > 0
        ? (scaledSkills[a]! - scaledSkills[b]!) // Boost lower skills first
        : (scaledSkills[b]! - scaledSkills[a]!) // Reduce higher skills first
    );

    let i = 0;
    while (remaining > 0 && i < sortedKeys.length * 3) {
      const key = sortedKeys[i % sortedKeys.length];
      const newValue = scaledSkills[key]! + direction;
      if (newValue >= 1 && newValue <= 99) {
        scaledSkills[key] = newValue;
        remaining--;
      }
      i++;
    }
  }

  return scaledSkills as WalletSkills;
}

// Skill icons (emoji-based for simplicity, can replace with custom icons)
const SKILL_CONFIG: { key: keyof WalletSkills; name: string; icon: string; color: string }[] = [
  // Row 1
  { key: 'attack', name: 'Attack', icon: '⚔️', color: '#f1c40f' },
  { key: 'hitpoints', name: 'Hitpoints', icon: '❤️', color: '#e74c3c' },
  { key: 'mining', name: 'Mining', icon: '⛏️', color: '#3498db' },
  // Row 2
  { key: 'strength', name: 'Strength', icon: '💪', color: '#1abc9c' },
  { key: 'agility', name: 'Agility', icon: '🏃', color: '#9b59b6' },
  { key: 'smithing', name: 'Smithing', icon: '🔨', color: '#e67e22' },
  // Row 3
  { key: 'defence', name: 'Defence', icon: '🛡️', color: '#2edb84' },
  { key: 'herblore', name: 'Herblore', icon: '🌿', color: '#27ae60' },
  { key: 'fishing', name: 'Fishing', icon: '🐟', color: '#3498db' },
  // Row 4
  { key: 'ranged', name: 'Ranged', icon: '🏹', color: '#27ae60' },
  { key: 'prayer', name: 'Prayer', icon: '🙏', color: '#f1c40f' },
  { key: 'cooking', name: 'Cooking', icon: '🍳', color: '#e67e22' },
  // Row 5
  { key: 'magic', name: 'Magic', icon: '✨', color: '#9b59b6' },
  { key: 'crafting', name: 'Crafting', icon: '💎', color: '#3498db' },
  { key: 'firemaking', name: 'Firemaking', icon: '🔥', color: '#e74c3c' },
  // Row 6
  { key: 'runecraft', name: 'Runecraft', icon: '🔮', color: '#9b59b6' },
  { key: 'fletching', name: 'Fletching', icon: '🏹', color: '#1abc9c' },
  { key: 'woodcutting', name: 'Woodcutting', icon: '🪓', color: '#27ae60' },
  // Row 7
  { key: 'slayer', name: 'Slayer', icon: '💀', color: '#2c3e50' },
  { key: 'construction', name: 'Construction', icon: '🏠', color: '#e67e22' },
  { key: 'farming', name: 'Farming', icon: '🌾', color: '#27ae60' },
  // Row 8
  { key: 'construction', name: 'Construction', icon: '🏠', color: '#e67e22' },
  { key: 'hunter', name: 'Hunter', icon: '🦊', color: '#e67e22' },
  { key: 'sailing', name: 'Sailing', icon: '⛵', color: '#3498db' },
];

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

interface XeetCard {
  tokenId: string;
  name: string;
  image?: string;
  balance: number;
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

interface Personality {
  title: string;
  emoji: string;
  description: string;
}

interface AbstractPortalData {
  user: {
    id: string;
    name: string;
    description: string;
    walletAddress: string;
    tier: number;
    tierV2: number;
    hasStreamingAccess: boolean;
    overrideProfilePictureUrl?: string;
    badges: {
      badge: {
        id: number;
        type: string;
        name: string;
        icon: string;
        description: string;
      };
      claimed: boolean;
    }[];
  };
}

const TIER_CONFIG: { [key: number]: { name: string; color: string; gradient: string; xp: number } } = {
  1: { name: 'Bronze', color: '#cd7f32', gradient: 'linear-gradient(135deg, #cd7f32, #8b4513)', xp: 0 },
  2: { name: 'Silver', color: '#c0c0c0', gradient: 'linear-gradient(135deg, #c0c0c0, #808080)', xp: 10000 },
  3: { name: 'Gold', color: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700, #b8860b)', xp: 110000 },
  4: { name: 'Platinum', color: '#e5e4e2', gradient: 'linear-gradient(135deg, #e5e4e2, #a0b2c6)', xp: 1110000 },
  5: { name: 'Diamond', color: '#b9f2ff', gradient: 'linear-gradient(135deg, #b9f2ff, #4fc3f7)', xp: 4110000 },
  6: { name: 'Obsidian', color: '#3d3d3d', gradient: 'linear-gradient(135deg, #3d3d3d, #1a1a2e, #4a0080)', xp: 9110000 },
  7: { name: 'Ethereal', color: '#e040fb', gradient: 'linear-gradient(135deg, #e040fb, #7c4dff, #18ffff)', xp: 17110000 },
};

interface WalletData {
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
  totalGasUsedUsd: string;
  tradingVolume: string;
  tradingVolumeUsd: string;
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
  personality: Personality;
  limitedData?: boolean;
  error?: string;
  dailyActivity?: { date: string; count: number }[];
}

// OSRS Skills panel using the authentic template image
// Skill positions mapped to the OSRS template
// Image is 502x678, we scale to ~50% for display (251x339)
const SCALE = 0.5;
const IMG_WIDTH = 502 * SCALE;
const IMG_HEIGHT = 678 * SCALE;

// Skill positions at 50% scale - OSRS authentic layout
const SKILL_POSITIONS: { key: keyof WalletSkills; x: number; y: number }[] = [
  // Row 1: Attack, Hitpoints, Mining
  { key: 'attack', x: 68, y: 45 },
  { key: 'hitpoints', x: 131, y: 43 },
  { key: 'mining', x: 195, y: 45 },
  // Row 2: Strength, Agility, Smithing
  { key: 'strength', x: 68, y: 74 },
  { key: 'agility', x: 131, y: 74 },
  { key: 'smithing', x: 195, y: 74 },
  // Row 3: Defence, Herblore, Fishing
  { key: 'defence', x: 68, y: 104 },
  { key: 'herblore', x: 131, y: 105 },
  { key: 'fishing', x: 195, y: 104 },
  // Row 4: Ranged, Thieving, Cooking
  { key: 'ranged', x: 68, y: 136 },
  { key: 'thieving', x: 131, y: 134 },
  { key: 'cooking', x: 195, y: 136 },
  // Row 5: Prayer, Crafting, Firemaking
  { key: 'prayer', x: 68, y: 167 },
  { key: 'crafting', x: 131, y: 167 },
  { key: 'firemaking', x: 195, y: 167 },
  // Row 6: Magic, Fletching, Woodcutting
  { key: 'magic', x: 68, y: 197 },
  { key: 'fletching', x: 131, y: 194 },
  { key: 'woodcutting', x: 195, y: 194 },
  // Row 7: Runecraft, Slayer, Farming
  { key: 'runecraft', x: 68, y: 226 },
  { key: 'slayer', x: 131, y: 224 },
  { key: 'farming', x: 195, y: 224 },
  // Row 8: Construction, Hunter, Sailing
  { key: 'construction', x: 68, y: 257 },
  { key: 'hunter', x: 131, y: 257 },
  { key: 'sailing', x: 195, y: 254 },
];

function SkillsPanel({ skills, tier, walletAddress }: { skills: WalletSkills; tier?: number; walletAddress: string }) {
  // If we have a tier, scale skills to match tier-based total
  const baseTargetTotal = tier ? getTierBasedTotalLevel(tier, walletAddress) : getTotalLevel(skills);
  const baseSkills = tier ? scaleSkillsToTotal(skills, baseTargetTotal) : skills;

  // Store the ORIGINAL base total - this never changes
  const [originalTotal] = useState(baseTargetTotal);
  const [displaySkills, setDisplaySkills] = useState<WalletSkills>(baseSkills);
  const [totalLevel, setTotalLevel] = useState(baseTargetTotal);
  const [isRerolling, setIsRerolling] = useState(false);

  // Re-roll skills while keeping total within ±10 of ORIGINAL (not current)
  const handleReroll = () => {
    setIsRerolling(true);

    // Random variation in total level (±10 from ORIGINAL, not from current)
    const variation = Math.floor(Math.random() * 21) - 10;
    const newTotal = Math.max(24, Math.min(2376, originalTotal + variation)); // Clamp to valid range

    // Redistribute skills randomly but proportionally
    const skillKeys = Object.keys(baseSkills) as (keyof WalletSkills)[];
    const newSkills: Partial<WalletSkills> = {};

    // Generate random weights for each skill
    const weights = skillKeys.map(() => Math.random() + 0.1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let remaining = newTotal;
    skillKeys.forEach((key, i) => {
      if (i === skillKeys.length - 1) {
        // Last skill gets remaining points
        newSkills[key] = Math.max(1, Math.min(99, remaining));
      } else {
        const allocated = Math.floor((weights[i] / totalWeight) * newTotal);
        const clamped = Math.max(1, Math.min(99, allocated));
        newSkills[key] = clamped;
        remaining -= clamped;
      }
    });

    // Adjust to hit exact total
    const actualTotal = Object.values(newSkills).reduce((a, b) => a + (b || 0), 0);
    const diff = newTotal - actualTotal;
    if (diff !== 0) {
      const sortedKeys = [...skillKeys].sort((a, b) =>
        diff > 0 ? (newSkills[a]! - newSkills[b]!) : (newSkills[b]! - newSkills[a]!)
      );
      let adj = Math.abs(diff);
      for (const key of sortedKeys) {
        if (adj <= 0) break;
        const newVal = newSkills[key]! + (diff > 0 ? 1 : -1);
        if (newVal >= 1 && newVal <= 99) {
          newSkills[key] = newVal;
          adj--;
        }
      }
    }

    setTimeout(() => {
      setDisplaySkills(newSkills as WalletSkills);
      setTotalLevel(Object.values(newSkills).reduce((a, b) => a + (b || 0), 0));
      setIsRerolling(false);
    }, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        position: 'relative',
        width: IMG_WIDTH,
        height: IMG_HEIGHT,
        backgroundImage: 'url(/rsskills.png)',
        backgroundSize: `${IMG_WIDTH}px ${IMG_HEIGHT}px`,
        backgroundRepeat: 'no-repeat',
        opacity: isRerolling ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}>
        {/* Skill levels overlay */}
        {SKILL_POSITIONS.map(({ key, x, y }) => {
          const level = displaySkills[key];
          return (
            <span
              key={key}
              title={`${SKILL_CONFIG.find(s => s.key === key)?.name}: Level ${level}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: '20px',
                fontSize: '14px',
                fontWeight: 700,
                color: level >= 99 ? '#00ff00' : '#ffff00',
                textShadow: '1px 1px 0 #000',
                fontFamily: 'Arial, sans-serif',
                textAlign: 'center',
                cursor: 'default',
              }}
            >
              {level}
            </span>
          );
        })}

        {/* Total level overlay */}
        <span
          style={{
            position: 'absolute',
            right: 65,
            bottom: 38,
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#ffff00',
            textShadow: '1px 1px 0 #000',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {totalLevel}
        </span>
      </div>

      {/* Re-roll button */}
      <button
        onClick={handleReroll}
        disabled={isRerolling}
        style={{
          padding: '0.4rem 0.8rem',
          background: 'linear-gradient(135deg, #c9a959, #8b7355)',
          border: '2px solid #5c4a2a',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 600,
          cursor: isRerolling ? 'not-allowed' : 'pointer',
          fontFamily: 'monospace',
          textShadow: '1px 1px 0 #000',
          opacity: isRerolling ? 0.7 : 1,
        }}
      >
        {isRerolling ? '🎲 Rolling...' : '🎲 Re-roll Stats'}
      </button>
    </div>
  );
}

// Pre-cached demo wallet data for instant loading (updated 2026-02-15)
const DEMO_WALLET_ADDRESS = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24';
const CACHED_DEMO_DATA: WalletData = {
  address: DEMO_WALLET_ADDRESS,
  balance: "3280628088236414",
  balanceFormatted: "0.0033 ETH",
  balanceUsd: "$6.56",
  transactionCount: 3107,
  firstTxDate: "2025-01-28",
  lastTxDate: "2026-02-15",
  walletAgeDays: 382,
  activeDays: 168,
  contractsInteracted: 119,
  tokenCount: 21,
  nftCount: 264,
  totalGasUsed: "0.052597 ETH",
  totalGasUsedUsd: "$105.19",
  tradingVolume: "73.9640 ETH",
  tradingVolumeUsd: "$147,928",
  ethReceived: 22.567,
  ethReceivedUsd: "$74,313",
  ethSent: 22.337,
  ethSentUsd: "$73,615",
  netPnl: 592,
  netPnlUsd: "+$592",
  isProfitable: true,
  ethPriceUsd: 2000,
  favoriteApps: [
    { address: "0x1e4e22b8ad8b0b0b4a3f3e3f1d1c1b1a0a9a8a7a", name: "GigaSwap", interactions: 931, percentage: 25 },
    { address: "0x2f5f33c9be9c0c0c5b4g4f4e2e2d2c2b1b0b9b8b", name: "Abstract DEX", interactions: 577, percentage: 18 },
    { address: "0x3a6a44d0cf0d1d1d6c5h5g5f3f3e3d3c2c1c0c9c", name: "Myriad Games", interactions: 420, percentage: 14 },
    { address: "0x4b7b55e1dg1e2e2e7d6i6h6g4g4f4e4d3d2d1d0d", name: "Final Bosu Mint", interactions: 312, percentage: 10 },
    { address: "0x5c8c66f2eh2f3f3f8e7j7i7h5h5g5f5e4e3e2e1e", name: "Abstract Portal", interactions: 245, percentage: 8 },
    { address: "0x6d9d77g3fi3g4g4g9f8k8j8i6i6h6g6f5f4f3f2f", name: "Multiplier", interactions: 198, percentage: 6 },
    { address: "0x7e0e88h4gj4h5h5ha9l9k9j7j7i7h7g6g5g4g3g", name: "Roach Racing", interactions: 156, percentage: 5 },
    { address: "0x8f1f99i5hk5i6i6ibam0l0k8k8j8i8h7h6h5h4h", name: "Gigaverse ROM", interactions: 134, percentage: 4 },
    { address: "0x9g2g00j6il6j7j7jcbn1m1l9l9k9j9i8i7i6i5i", name: "CHECK Token", interactions: 112, percentage: 3 },
    { address: "0x0h3h11k7jm7k8k8kdco2n2m0m0l0k0j9j8j7j6j", name: "Sock Master", interactions: 89, percentage: 3 },
    { address: "0x1i4i22l8kn8l9l9ledp3o3n1n1m1l1k0k9k8k7k", name: "Cambria", interactions: 67, percentage: 2 },
    { address: "0x2j5j33m9lo9m0m0mfeq4p4o2o2n2m2l1l0l9l8l", name: "Xeet Cards", interactions: 45, percentage: 1 }
  ],
  badges: [
    { id: "badge-1", label: "Discord Verified", description: "Abstract Badge #1", color: "#2edb84", icon: "🏅", tokenId: "1", image: "https://abstract-assets.abs.xyz/badges/badge-discord.png" },
    { id: "badge-2", label: "X Verified", description: "Abstract Badge #2", color: "#2edb84", icon: "🏅", tokenId: "2", image: "https://abstract-assets.abs.xyz/badges/badge-twitter.png" },
    { id: "badge-3", label: "Fund your Account", description: "Abstract Badge #3", color: "#2edb84", icon: "🏅", tokenId: "3", image: "https://abstract-assets.abs.xyz/badges/badge-fund-account.png" },
    { id: "badge-4", label: "App Voter", description: "Abstract Badge #4", color: "#2edb84", icon: "🏅", tokenId: "4", image: "https://abstract-assets.abs.xyz/badges/badge-app-voter.png" },
    { id: "badge-5", label: "The Trader", description: "Abstract Badge #5", color: "#2edb84", icon: "🏅", tokenId: "5", image: "https://abstract-assets.abs.xyz/badges/badge-the-trader.png" },
    { id: "badge-10", label: "You're So Early", description: "Abstract Badge #10", color: "#2edb84", icon: "🏅", tokenId: "10", image: "https://abstract-assets.abs.xyz/badges/badge-so-early.png" },
    { id: "badge-16", label: "The Sock Master", description: "Abstract Badge #16", color: "#2edb84", icon: "🏅", tokenId: "16", image: "https://abstract-assets.abs.xyz/badges/badge-sock-master.png" },
    { id: "badge-18", label: "Roach Racer", description: "Abstract Badge #18", color: "#2edb84", icon: "🏅", tokenId: "18", image: "https://abstract-assets.abs.xyz/badges/badge-roach-racing.png" },
    { id: "badge-22", label: "Gacha Goat", description: "Abstract Badge #22", color: "#2edb84", icon: "🏅", tokenId: "22", image: "https://abstract-assets.abs.xyz/badges/badge-gacha-goat.png" },
    { id: "badge-26", label: "The Big Badge", description: "Abstract Badge #26", color: "#2edb84", icon: "🏅", tokenId: "26", image: "https://abstract-assets.abs.xyz/badges/badge-bigcoin.png" },
    { id: "badge-27", label: "Multiplier Mommy", description: "Abstract Badge #27", color: "#2edb84", icon: "🏅", tokenId: "27", image: "https://abstract-assets.abs.xyz/badges/badge-multiplier-mommy.png" },
    { id: "badge-28", label: "Myriad Grand Master", description: "Abstract Badge #28", color: "#2edb84", icon: "🏅", tokenId: "28", image: "https://abstract-assets.abs.xyz/badges/badge-myriad-mastermind.png" },
    { id: "badge-29", label: "Giga Juicy", description: "Abstract Badge #29", color: "#2edb84", icon: "🏅", tokenId: "29", image: "https://abstract-assets.abs.xyz/badges/badge-giga-juicy.png" },
    { id: "badge-31", label: "Abstract Games Survivor", description: "Abstract Badge #31", color: "#2edb84", icon: "🏅", tokenId: "31", image: "https://abstract-assets.abs.xyz/badges/badge-abstract-games-survivor.png" },
    { id: "badge-42", label: "Cambrian Artifact Hunter", description: "Abstract Badge #42", color: "#2edb84", icon: "🏅", tokenId: "42", image: "https://abstract-assets.abs.xyz/badges/badge-cambria-gold-rush.png" },
    { id: "badge-45", label: "Email Notification", description: "Abstract Badge #45", color: "#2edb84", icon: "🏅", tokenId: "45", image: "https://abstract-assets.abs.xyz/badges/badge-email-notification.png" },
    { id: "badge-46", label: "Speed Trader", description: "Abstract Badge #46", color: "#2edb84", icon: "🏅", tokenId: "46", image: "https://abstract-assets.abs.xyz/badges/badge-speed-trader.png" },
    { id: "badge-48", label: "One Year Badge", description: "Abstract Badge #48", color: "#2edb84", icon: "🏅", tokenId: "48", image: "https://abstract-assets.abs.xyz/badges/badge-wrapped.png" },
    { id: "badge-49", label: "The Mogger", description: "Abstract Badge #49", color: "#2edb84", icon: "🏅", tokenId: "49", image: "https://abstract-assets.abs.xyz/badges/badge-mogger.png" }
  ],
  abstractBadgeCount: 19,
  xeetCards: [
    { tokenId: "66", name: "Xeet Card #66", balance: 1 },
    { tokenId: "71", name: "Xeet Card #71", balance: 1 },
    { tokenId: "106", name: "Xeet Card #106", balance: 1 },
    { tokenId: "152", name: "Xeet Card #152", balance: 1 },
    { tokenId: "276", name: "Xeet Card #276", balance: 1 },
    { tokenId: "321", name: "Xeet Card #321", balance: 1 },
    { tokenId: "341", name: "Xeet Card #341", balance: 1 },
    { tokenId: "396", name: "Xeet Card #396", balance: 1 },
    { tokenId: "401", name: "Xeet Card #401", balance: 1 },
    { tokenId: "426", name: "Xeet Card #426", balance: 1 },
    { tokenId: "431", name: "Xeet Card #431", balance: 1 },
    { tokenId: "611", name: "Xeet Card #611", balance: 1 }
  ],
  xeetCardCount: 12,
  nftHoldings: [
    { contractAddress: "0x1e49b0d225c45b22f66bd660841d98e153c7abd5", tokenId: "372", name: "142 NFTs", collectionName: "Web3 Playboys Traits", count: 142, estimatedValueUsd: 142, image: "https://i.seadn.io/s/raw/files/6ed1baab1f8e2d3d0f8b4e9e6a15f35f.png" },
    { contractAddress: "0x09bb4c785165915e66f4a645bc978a6c885a0319", tokenId: "2286", name: "45 NFTs", collectionName: "Web3 Playboys", count: 45, estimatedValueUsd: 4239, image: "https://i.seadn.io/gcs/files/4ad48f7a2e7c4abc81f00c27c4f69d4f.png" },
    { contractAddress: "0x35ffe9d966e35bd1b0e79f0d91e438701ea1c644", tokenId: "70", name: "8 NFTs", collectionName: "Moody Archives", count: 8, image: "https://i.seadn.io/s/raw/files/71df2f30a3e38bf9c8e8f0f3d3a3a3a3.png" },
    { contractAddress: "0x30072084ff8724098cbb65e07f7639ed31af5f66", tokenId: "1308", name: "4 NFTs", collectionName: "DreamilioMaker", count: 4, estimatedValueUsd: 138, image: "https://i.seadn.io/gcs/files/2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a.png" },
    { contractAddress: "0xff4217568f7315b5950c6b244222884434e19ab3", tokenId: "480", name: "2 NFTs", collectionName: "Bearyz", count: 2, estimatedValueUsd: 4, image: "https://i.seadn.io/s/raw/files/8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d.png" }
  ],
  walletScore: 94,
  walletRank: "S",
  walletPercentile: 1,
  personality: { title: "Master Collector", emoji: "🏆", description: "A true NFT connoisseur with an impressive collection" },
  limitedData: false
};

const WALLET_CACHE_KEY = 'wallet-analytics-cache';

// Loading progress stages configuration - matches actual API work
const LOADING_STAGES = [
  { id: 'fetch', label: 'Connecting to Abstract...', range: [0, 20] },
  { id: 'analyze', label: 'Scanning transactions...', range: [20, 50] },
  { id: 'scores', label: 'Analyzing activity...', range: [50, 70] },
  { id: 'nfts', label: 'Loading NFTs & badges...', range: [70, 90] },
  { id: 'finalize', label: 'Almost done...', range: [90, 100] },
] as const;

function LoadingProgress({ progress }: { progress: number }) {
  const currentStageIndex = LOADING_STAGES.findIndex(
    (stage) => progress >= stage.range[0] && progress < stage.range[1]
  );
  const activeStage = currentStageIndex >= 0 ? LOADING_STAGES[currentStageIndex] : LOADING_STAGES[LOADING_STAGES.length - 1];

  return (
    <div className="loading-progress">
      <div className="loading-progress-info">
        <div className="loading-progress-percentage">{Math.round(progress)}%</div>
        <div className="loading-progress-stage">{activeStage.label}</div>
      </div>

      <div className="loading-progress-bar-container">
        <div
          className="loading-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="loading-progress-stages">
        {LOADING_STAGES.map((stage, index) => {
          const isCompleted = progress >= stage.range[1];
          const isActive = progress >= stage.range[0] && progress < stage.range[1];
          const isPending = progress < stage.range[0];

          return (
            <div
              key={stage.id}
              className={`loading-stage-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
            >
              <span className={`loading-stage-icon ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}>
                {isCompleted ? '\u2713' : isActive ? '\u25CF' : '\u25CB'}
              </span>
              <span className="loading-stage-text">{stage.label}</span>
              <span className="loading-stage-percent">{stage.range[1]}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to mask a value with X's, keeping same character count
const maskValue = (value: string): string => {
  // Remove $ and get just the number part
  const numPart = value.replace(/[$,]/g, '');
  const xCount = numPart.length;
  return '$' + 'X'.repeat(xCount);
};

export default function WalletAnalyticsPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [portalData, setPortalData] = useState<AbstractPortalData | null>(null);

  const handleAnalyze = async (walletAddress?: string) => {
    const addr = typeof walletAddress === 'string' ? walletAddress : address;
    if (!addr.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    setError(null);
    setWalletData(null);
    setPortalData(null);

    // Fetch Abstract Portal data in parallel (for official tier)
    fetch(`https://backend.portal.abs.xyz/api/user/address/${addr.trim()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setPortalData(data))
      .catch(() => setPortalData(null));

    // Simulate progress stages while fetching - slower, more realistic progression
    // Wallet analysis typically takes 15-45 seconds depending on wallet activity
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        // Much slower progression to match actual API time
        // Stage 1: Fetching wallet data (0-20%) - ~3 seconds
        if (prev < 20) return prev + 0.7;
        // Stage 2: Analyzing transactions (20-50%) - ~8 seconds
        if (prev < 50) return prev + 0.4;
        // Stage 3: Calculating scores (50-70%) - ~6 seconds
        if (prev < 70) return prev + 0.35;
        // Stage 4: Loading NFT data (70-90%) - ~8 seconds
        if (prev < 90) return prev + 0.25;
        // Stage 5: Finalizing (90-95%) - hold here, don't go to 100 until done
        if (prev < 95) return prev + 0.1;
        return prev; // Hold at 95% until data arrives
      });
    }, 100);

    try {
      const response = await fetch(`/api/wallet-analytics?address=${encodeURIComponent(addr.trim())}`);
      const data = await response.json();

      clearInterval(progressInterval);

      if (!response.ok) {
        setLoadingProgress(0);
        setError(data.error || 'Failed to fetch wallet data');
        return;
      }

      // Quick progress to 100% when data arrives
      setLoadingProgress(90);
      await new Promise(resolve => setTimeout(resolve, 200));
      setLoadingProgress(95);
      await new Promise(resolve => setTimeout(resolve, 150));
      setLoadingProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));

      setWalletData(data);

      // Cache the wallet data for instant loading next time
      try {
        localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify({
          address: addr.trim(),
          data,
          timestamp: Date.now(),
        }));
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      clearInterval(progressInterval);
      setLoadingProgress(0);
      setError('Failed to connect to Abstract network');
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  // Demo wallet is pre-loaded, no need to fetch on mount
  // Only fetch if user changes to a different wallet

  return (
    <ErrorBoundary>
      <main className="container">
        {/* Banner Header */}
        <div className="banner-header">
          <div className="banner-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Wallet Analytics</p>
            </div>
            <NavBar />
          </div>
        </div>

      {/* Input Section with Title */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <img src="/abspfp.png" alt="Abstract" style={{ width: 40, height: 40, borderRadius: '8px' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Abstract Wallet Analytics</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Analyze any wallet on Abstract L2</p>
          </div>
        </div>
        <div className="wallet-input-row">
          <div className="wallet-input-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              Wallet Address
            </label>
            <input
              type="text"
              className="id-input"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              style={{ width: '100%' }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => handleAnalyze()}
            disabled={loading}
            style={{ whiteSpace: 'nowrap' }}
          >
            {loading ? 'Analyzing...' : 'Analyze Wallet'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)', borderRadius: '6px', color: '#e74c3c' }}>
            {error}
          </div>
        )}
      </div>

      {/* Loading Progress */}
      {loading && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <LoadingProgress progress={loadingProgress} />
        </div>
      )}

      {/* Results */}
      {walletData && !loading && (
        <>
          {/* Combined Profile, Score & Tier Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Left: PFP + Name/Description */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                {portalData?.user?.overrideProfilePictureUrl && (
                  <img
                    src={portalData.user.overrideProfilePictureUrl}
                    alt={portalData.user.name || 'Profile'}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '12px',
                      border: `2px solid ${TIER_CONFIG[portalData.user?.tier || 1]?.color || '#888'}`,
                      objectFit: 'cover',
                    }}
                  />
                )}
                {/* Score Circle */}
                {(() => {
                  const scoreColor = walletData.walletScore >= 80 ? '#ffd700' : walletData.walletScore >= 60 ? '#2edb84' : walletData.walletScore >= 40 ? '#3498db' : '#c9a959';
                  return (
                    <div style={{ position: 'relative', width: 80, height: 80 }}>
                      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                        <circle
                          cx="40" cy="40" r="35" fill="none"
                          stroke={scoreColor}
                          strokeWidth="5"
                          strokeDasharray={`${(walletData.walletScore / 100) * 220} 220`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: scoreColor }}>{walletData.walletScore}</div>
                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Score</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Middle: Name, Percentile, Personality, Streaming */}
              <div style={{ flex: 1, minWidth: '140px' }}>
                {portalData?.user && (
                  <div style={{ marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{portalData.user.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{portalData.user.description}</div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Real percentile based on Abstract tier distribution */}
                  {portalData?.user?.tier && portalData.user.tier >= 2 && (
                    <div style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.5rem',
                      background: 'rgba(46, 219, 132, 0.15)',
                      border: '1px solid rgba(46, 219, 132, 0.3)',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#2edb84',
                    }}>
                      Top {
                        portalData.user.tier === 7 ? '0.001' :
                        portalData.user.tier === 6 ? '0.001' :
                        portalData.user.tier === 5 ? '0.01' :
                        portalData.user.tier === 4 ? '0.07' :
                        portalData.user.tier === 3 ? '0.9' :
                        portalData.user.tier === 2 ? '10' : '100'
                      }%
                    </div>
                  )}
                  {portalData?.user?.hasStreamingAccess && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.5rem',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '10px',
                      fontSize: '0.65rem',
                      color: '#a78bfa',
                    }}>
                      <span>📡</span> Streaming
                    </div>
                  )}
                </div>
                {walletData.personality && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '1rem' }}>{walletData.personality.emoji}</span>
                    <span style={{ fontSize: '0.8rem', color: '#2edb84', fontWeight: 600 }}>{walletData.personality.title}</span>
                  </div>
                )}
              </div>

              {/* Tier Badge */}
              {portalData?.user && (
                <div style={{
                  padding: '0.5rem 1rem',
                  background: TIER_CONFIG[portalData.user.tier]?.gradient || 'linear-gradient(135deg, #888, #666)',
                  borderRadius: '10px',
                  boxShadow: `0 4px 15px ${TIER_CONFIG[portalData.user.tier]?.color || '#888'}30`,
                  textAlign: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: '0.5rem', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abstract Tier</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#000' }}>
                    {TIER_CONFIG[portalData.user.tier]?.name || `Tier ${portalData.user.tier}`} {((portalData.user.tierV2 - 1) % 3) + 1}
                  </div>
                </div>
              )}

            </div>

            {/* Address */}
            <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: 'rgba(255,255,255,0.6)' }}>
                {walletData.address}
              </div>
            </div>

            {/* Limited Data Notice */}
            {walletData.limitedData && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '6px', fontSize: '0.7rem', color: '#ffc107' }}>
                Some stats are estimated. For full analytics, an Abscan API key is needed.
              </div>
            )}

            {/* Stats Grid */}
            <div className="wallet-stats-grid" style={{ marginTop: '1rem' }}>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{(walletData.transactionCount ?? 0).toLocaleString()}</div>
                <div className="wallet-stat-label">Transactions</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.activeDays}</div>
                <div className="wallet-stat-label">Active Days</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.walletAgeDays ?? 0} days</div>
                <div className="wallet-stat-label">Wallet Age</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{(walletData.nftCount ?? 0).toLocaleString()}</div>
                <div className="wallet-stat-label">NFTs Held</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.abstractBadgeCount || 0}</div>
                <div className="wallet-stat-label">Badges</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.contractsInteracted}</div>
                <div className="wallet-stat-label">Apps Used</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.tradingVolumeUsd}</div>
                <div className="wallet-stat-label">Volume</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.totalGasUsedUsd}</div>
                <div className="wallet-stat-label">Gas Spent</div>
              </div>
            </div>
          </div>

          {/* Abstract Badges */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#2edb84', fontSize: '0.9rem' }}>Abstract Badges</h3>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                {walletData.abstractBadgeCount || 0} badge{walletData.abstractBadgeCount !== 1 ? 's' : ''}
              </span>
            </div>
            {walletData.badges && walletData.badges.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {walletData.badges.map((badge) => (
                  <a
                    key={badge.id}
                    href={`https://opensea.io/assets/abstract/0xbc176ac2373614f9858a118917d83b139bcb3f8c/${badge.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    title={badge.description}
                  >
                    {badge.image ? (
                      <img
                        src={badge.image}
                        alt={badge.label}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '8px',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '2rem' }}>{badge.icon}</span>
                    )}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.8)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}>
                      {badge.label}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No Abstract Badges found. Earn badges by completing activities on the{' '}
                <a href="https://abs.xyz/portal" target="_blank" rel="noopener noreferrer" style={{ color: '#2edb84' }}>
                  Abstract Portal
                </a>
              </div>
            )}
          </div>

          {/* Xeet Creator Cards */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src="https://i2c.seadn.io/collection/xeet-creator-cards/image_type_logo/b2b3ef6100871f21a24e968da0d24c/bcb2b3ef6100871f21a24e968da0d24c.png"
                  alt="Xeet"
                  style={{ width: 24, height: 24, borderRadius: '4px' }}
                />
                <h3 style={{ margin: 0, color: '#00cccc', fontSize: '0.9rem' }}>Xeet Creator Cards ({walletData.xeetCardCount || 0})</h3>
              </div>
            </div>
            {walletData.xeetCards && walletData.xeetCards.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {walletData.xeetCards.map((card) => (
                  <a
                    key={card.tokenId}
                    href={`https://opensea.io/assets/abstract/0xec27d2237432d06981e1f18581494661517e1bd3/${card.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: 'rgba(0, 204, 204, 0.05)',
                      border: '1px solid rgba(0, 204, 204, 0.2)',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    title={card.name}
                  >
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: '8px',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #00cccc, #2edb84)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                      }}>
                        🎴
                      </div>
                    )}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.8)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {card.name}
                    </span>
                    {card.balance > 1 && (
                      <span style={{
                        fontSize: '0.6rem',
                        color: '#00cccc',
                        fontWeight: 600,
                      }}>
                        x{card.balance}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No Xeet Creator Cards found. Collect cards on{' '}
                <a href="https://opensea.io/collection/xeet-creator-cards" target="_blank" rel="noopener noreferrer" style={{ color: '#00cccc' }}>
                  OpenSea
                </a>
              </div>
            )}
          </div>

          {/* Skills & Portfolio - Side by Side */}
          <div className="wallet-skills-portfolio-grid" style={{ marginBottom: '1.5rem' }}>
            {/* Runescape-style Skills Panel */}
            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#c9a959', textAlign: 'center', fontFamily: 'monospace' }}>Skills</h4>
              <SkillsPanel
                skills={calculateSkillLevels(walletData)}
                tier={portalData?.user?.tier}
                walletAddress={walletData.address}
              />
            </div>

            {/* Combined Portfolio & Holdings */}
            <div className="card" style={{ padding: '1rem' }}>
              {(() => {
                const ethValue = parseFloat(walletData.balanceUsd?.replace(/[^0-9.]/g, '') || '0');
                const nftEstValue = walletData.nftHoldings?.reduce((sum, nft) => sum + (nft.estimatedValueUsd || (nft.count * 5)), 0) || 0;
                const holdingsNftCount = walletData.nftHoldings?.reduce((sum, nft) => sum + nft.count, 0) || 0;
                const otherNftsValue = Math.max(0, walletData.nftCount - holdingsNftCount) * 3;
                const totalNftValue = nftEstValue + otherNftsValue;
                const totalValue = ethValue + totalNftValue;

                const portfolioData = [
                  { name: 'ETH', value: ethValue, color: '#627eea', percent: totalValue > 0 ? (ethValue / totalValue * 100).toFixed(1) : '0' },
                  { name: 'NFTs', value: totalNftValue, color: '#00cccc', percent: totalValue > 0 ? (totalNftValue / totalValue * 100).toFixed(1) : '0' },
                ];

                return (
                  <>
                    {/* Portfolio Header with Pie Chart */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: 80, height: 80, flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={portfolioData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value">
                              {portfolioData.filter(d => d.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>Portfolio Value</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.6rem', marginTop: '0.25rem' }}>
                          {portfolioData.map((item, i) => (
                            <div key={i} style={{ color: item.color, fontWeight: 600 }}>
                              {item.name}: {item.percent}%
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Holdings List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {/* ETH Balance */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img
                            src="https://assets.coingecko.com/coins/images/279/small/ethereum.png"
                            alt="ETH"
                            style={{ width: 24, height: 24, borderRadius: '50%' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>Ethereum</div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>{walletData.balanceFormatted}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#627eea' }}>{walletData.balanceUsd}</div>
                      </div>

                      {/* Top NFT Holdings */}
                      {walletData.nftHoldings && walletData.nftHoldings.slice(0, 3).map((nft) => (
                        <div key={`${nft.contractAddress}-${nft.tokenId}`} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img
                              src={`/nft-collections/${nft.contractAddress.toLowerCase()}.png`}
                              alt={nft.name}
                              style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', background: 'linear-gradient(135deg, #00cccc, #2edb84)' }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.fallback) {
                                  target.dataset.fallback = '1';
                                  target.src = nft.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${nft.collectionName}`;
                                } else {
                                  target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${nft.collectionName}`;
                                }
                              }}
                            />
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{nft.collectionName}</div>
                              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>{nft.count > 1 ? `${nft.count} NFTs` : ''}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#00cccc' }}>
                            {nft.estimatedValueUsd ? `$${nft.estimatedValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `${nft.count}x`}
                          </div>
                        </div>
                      ))}

                      {(!walletData.nftHoldings || walletData.nftHoldings.length === 0) && walletData.nftCount > 0 && (
                        <div style={{
                          padding: '0.5rem',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 6,
                          textAlign: 'center',
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: '0.7rem'
                        }}>
                          {walletData.nftCount} NFTs
                        </div>
                      )}
                    </div>

                  </>
                );
              })()}
            </div>
          </div>

          {/* Top Apps */}
          {walletData.favoriteApps && walletData.favoriteApps.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#2edb84' }}>Top Apps ({Math.min(walletData.favoriteApps.length, 15)})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
                {walletData.favoriteApps.slice(0, 15).map((app, index) => {
                  const appInfo = getAppInfo(app.address);
                  const displayName = appInfo?.name || app.name;
                  const categoryColor = appInfo ? (CATEGORY_COLORS[appInfo.category] || '#2edb84') : '#888';

                  return (
                    <a
                      key={app.address}
                      href={`https://abscan.org/address/${app.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.08)',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(46, 219, 132, 0.2)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={appInfo?.icon || getAppIcon(displayName) || getAppIcon(app.name) || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2edb84&color=000&size=64&bold=true`}
                          alt={displayName}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2edb84&color=000&size=64&bold=true`;
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{displayName}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {appInfo && (
                              <span style={{
                                fontSize: '0.55rem',
                                padding: '0.1rem 0.3rem',
                                borderRadius: 4,
                                background: `${categoryColor}20`,
                                color: categoryColor,
                                textTransform: 'capitalize',
                              }}>
                                {appInfo.category}
                              </span>
                            )}
                            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                              {app.address.slice(0, 6)}...{app.address.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2edb84' }}>{app.interactions} txs</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{app.percentage.toFixed(1)}%</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explorer Link */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <a
              href={`https://abscan.org/address/${walletData.address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2edb84', textDecoration: 'none', fontSize: '0.85rem' }}
            >
              View on Abscan Explorer &rarr;
            </a>
          </div>
        </>
      )}
      </main>
    </ErrorBoundary>
  );
}
