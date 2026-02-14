'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import ErrorBoundary, { CardErrorBoundary } from '@/components/ErrorBoundary';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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
    slayer: Math.min(99, Math.max(1, Math.floor((100 - (data.walletPercentile || 50)) * 0.99))),
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

function SkillsPanel({ skills }: { skills: WalletSkills }) {
  const totalLevel = getTotalLevel(skills);

  return (
    <div style={{
      position: 'relative',
      width: IMG_WIDTH,
      height: IMG_HEIGHT,
      backgroundImage: 'url(/rsskills.png)',
      backgroundSize: `${IMG_WIDTH}px ${IMG_HEIGHT}px`,
      backgroundRepeat: 'no-repeat',
    }}>
      {/* Skill levels overlay */}
      {SKILL_POSITIONS.map(({ key, x, y }) => {
        const level = skills[key];
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
  );
}

// Pre-cached demo wallet data for instant loading
const DEMO_WALLET_ADDRESS = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24';
const CACHED_DEMO_DATA: WalletData = {
  address: DEMO_WALLET_ADDRESS,
  balance: "527414148986414",
  balanceFormatted: "0.0005 ETH",
  balanceUsd: "$1.04",
  transactionCount: 4523,
  firstTxDate: "2025-01-28",
  lastTxDate: "2026-02-14",
  walletAgeDays: 382,
  activeDays: 156,
  contractsInteracted: 47,
  tokenCount: 21,
  nftCount: 105,
  totalGasUsed: "0.020272 ETH",
  totalGasUsedUsd: "$39.93",
  tradingVolume: "55.7883 ETH",
  tradingVolumeUsd: "$127,141",
  ethReceived: 17.527911647753726,
  ethReceivedUsd: "$79,546",
  ethSent: 8.749454864400557,
  ethSentUsd: "$47,595",
  netPnl: 31910.835517361676,
  netPnlUsd: "+$31,911",
  isProfitable: true,
  ethPriceUsd: 1969.47,
  favoriteApps: [
    { address: "0x980596ac24d0ca1e82a0a1d7ffaa6803acd2708c", name: "0x9805...708c", interactions: 972, percentage: 49 },
    { address: "0x3272596f776470d2d7c3f7dff3dc50888b7d8967", name: "0x3272...8967", interactions: 577, percentage: 29 },
    { address: "0x3439153eb7af838ad19d56e1571fbd09333c2809", name: "WETH", interactions: 112, percentage: 6 },
    { address: "0x0351b76923992c2afe0f040d22b43ef0b8773d24", name: "AccountProxy", interactions: 90, percentage: 5 },
    { address: "0x11614ee1ef07dee4ac28893a00f6f63b13223906", name: "0x1161...3906", interactions: 62, percentage: 3 }
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
    { id: "badge-45", label: "The Email Notification Badge", description: "Abstract Badge #45", color: "#2edb84", icon: "🏅", tokenId: "45", image: "https://abstract-assets.abs.xyz/badges/badge-email-notification.png" },
    { id: "badge-46", label: "The Speed Trader Badge", description: "Abstract Badge #46", color: "#2edb84", icon: "🏅", tokenId: "46", image: "https://abstract-assets.abs.xyz/badges/badge-speed-trader.png" },
    { id: "badge-48", label: "The One Year Badge", description: "Abstract Badge #48", color: "#2edb84", icon: "🏅", tokenId: "48", image: "https://abstract-assets.abs.xyz/badges/badge-wrapped.png" },
    { id: "badge-49", label: "Badge #49", description: "Abstract Badge #49", color: "#2edb84", icon: "🏅", tokenId: "49" }
  ],
  abstractBadgeCount: 19,
  xeetCards: [],
  xeetCardCount: 0,
  nftHoldings: [
    { contractAddress: '0x1', tokenId: '1', name: 'Hamieverse Genesis #123', collectionName: 'Hamieverse Genesis', count: 3, estimatedValueUsd: 1125, image: 'https://i.seadn.io/gcs/files/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png' },
    { contractAddress: '0x2', tokenId: '2', name: 'Gigaverse ROM #456', collectionName: 'Gigaverse ROMs', count: 2, estimatedValueUsd: 400, image: 'https://i.seadn.io/gcs/files/b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7.png' },
    { contractAddress: '0x3', tokenId: '3', name: 'FinalBosu #789', collectionName: 'FinalBosu', count: 1, estimatedValueUsd: 625, image: 'https://i.seadn.io/gcs/files/c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8.png' },
    { contractAddress: '0x4', tokenId: '4', name: 'Glowbud #012', collectionName: 'Glowbuds', count: 5, estimatedValueUsd: 250, image: 'https://i.seadn.io/gcs/files/d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8g9.png' },
    { contractAddress: '0x5', tokenId: '5', name: 'Bearish #345', collectionName: 'Bearish', count: 2, estimatedValueUsd: 250, image: 'https://i.seadn.io/gcs/files/e5f6a7b8c9d0e1f2a3b4c5d6e7f8g9h0.png' },
  ],
  walletScore: 82,
  walletRank: "A",
  walletPercentile: 3,
  personality: { title: "Master Collector", emoji: "🏆", description: "A true NFT connoisseur with an impressive collection" },
  limitedData: false
};

const WALLET_CACHE_KEY = 'wallet-analytics-cache';

// Loading progress stages configuration
const LOADING_STAGES = [
  { id: 'fetch', label: 'Fetching wallet data...', range: [0, 20] },
  { id: 'analyze', label: 'Analyzing transactions...', range: [20, 50] },
  { id: 'scores', label: 'Calculating scores...', range: [50, 70] },
  { id: 'nfts', label: 'Loading NFT data...', range: [70, 90] },
  { id: 'finalize', label: 'Finalizing...', range: [90, 100] },
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
  const [address, setAddress] = useState(DEMO_WALLET_ADDRESS);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(CACHED_DEMO_DATA);
  const [portalData, setPortalData] = useState<AbstractPortalData | null>(null);
  const [pnlHidden, setPnlHidden] = useState(false);

  // Fetch portal data for initial demo wallet (quick request)
  useEffect(() => {
    fetch(`https://backend.portal.abs.xyz/api/user/address/${DEMO_WALLET_ADDRESS}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setPortalData(data))
      .catch(() => setPortalData(null));
  }, []);

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

    // Simulate progress stages while fetching
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        // Progress slowly through stages, cap at 85% until actual data arrives
        if (prev < 20) return prev + 2;
        if (prev < 45) return prev + 1.5;
        if (prev < 65) return prev + 1;
        if (prev < 85) return prev + 0.5;
        return prev; // Hold at 85% until data arrives
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
              <img src="/ZaddyPFP.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
              <div>
                <h1 style={{ marginBottom: 0 }}>ZaddyTools</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Wallet Analytics</p>
              </div>
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
          {/* Official Abstract Tier */}
          {portalData?.user && (
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {portalData.user.overrideProfilePictureUrl && (
                    <img
                      src={portalData.user.overrideProfilePictureUrl}
                      alt={portalData.user.name}
                      style={{ width: 56, height: 56, borderRadius: '12px', border: `2px solid ${TIER_CONFIG[portalData.user.tier]?.color || '#888'}` }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{portalData.user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{portalData.user.description}</div>
                  </div>
                </div>
                <div style={{
                  padding: '0.75rem 1.5rem',
                  background: TIER_CONFIG[portalData.user.tier]?.gradient || 'linear-gradient(135deg, #888, #666)',
                  borderRadius: '12px',
                  boxShadow: `0 4px 20px ${TIER_CONFIG[portalData.user.tier]?.color || '#888'}40`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Abstract Tier</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000' }}>
                    {TIER_CONFIG[portalData.user.tier]?.name || `Tier ${portalData.user.tier}`} {((portalData.user.tierV2 - 1) % 3) + 1}
                  </div>
                </div>
              </div>
              {portalData.user.hasStreamingAccess && (
                <div style={{
                  marginTop: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.6rem',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  color: '#a78bfa',
                }}>
                  <span>📡</span> Streaming Access
                </div>
              )}
            </div>
          )}

          {/* Combined Score, Personality & P&L Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Left: Score Circle */}
              {(() => {
                const scoreColor = walletData.walletScore >= 80 ? '#ffd700' : walletData.walletScore >= 60 ? '#2edb84' : walletData.walletScore >= 40 ? '#3498db' : '#c9a959';
                return (
                  <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                    <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="45" cy="45" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                      <circle
                        cx="45" cy="45" r="40" fill="none"
                        stroke={scoreColor}
                        strokeWidth="6"
                        strokeDasharray={`${(walletData.walletScore / 100) * 251.3} 251.3`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: scoreColor }}>{walletData.walletScore}</div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Score</div>
                    </div>
                  </div>
                );
              })()}

              {/* Middle: Percentile & Personality */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                {walletData.walletPercentile && (
                  <div style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(46, 219, 132, 0.15)',
                    border: '1px solid rgba(46, 219, 132, 0.3)',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#2edb84',
                    marginBottom: '0.5rem',
                  }}>
                    Top {walletData.walletPercentile}%
                  </div>
                )}
                {walletData.personality && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{walletData.personality.emoji}</span>
                    <span style={{ fontSize: '0.9rem', color: '#2edb84', fontWeight: 600 }}>{walletData.personality.title}</span>
                  </div>
                )}
              </div>

              {/* Right: P&L */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>Net P&L</span>
                  <button
                    onClick={() => setPnlHidden(!pnlHidden)}
                    style={{
                      width: '32px',
                      height: '16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: pnlHidden ? 'rgba(255,255,255,0.2)' : 'rgba(46, 219, 132, 0.4)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}
                    title={pnlHidden ? 'Show P&L' : 'Hide P&L'}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: pnlHidden ? '2px' : '16px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: walletData.isProfitable ? '#2edb84' : '#e74c3c',
                  textShadow: walletData.isProfitable ? '0 0 15px rgba(46, 219, 132, 0.3)' : '0 0 15px rgba(231, 76, 60, 0.3)',
                }}>
                  {pnlHidden ? maskValue(walletData.netPnlUsd) : walletData.netPnlUsd}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                  <span style={{ color: '#2edb84' }}>{pnlHidden ? maskValue(walletData.ethReceivedUsd) : walletData.ethReceivedUsd}</span>
                  <span style={{ margin: '0 0.3rem' }}>→</span>
                  <span style={{ color: '#e74c3c' }}>{pnlHidden ? maskValue(walletData.ethSentUsd) : walletData.ethSentUsd}</span>
                </div>
              </div>
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
                <div className="wallet-stat-value">{walletData.transactionCount.toLocaleString()}</div>
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
                <div className="wallet-stat-value">{walletData.nftCount.toLocaleString()}</div>
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
            {walletData.badges.length > 0 ? (
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
              <SkillsPanel skills={calculateSkillLevels(walletData)} />
            </div>

            {/* Portfolio Estimate */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#2edb84', textAlign: 'center' }}>Portfolio Estimate</h4>

            {(() => {
              // Calculate portfolio values from actual data
              const ethValue = parseFloat(walletData.balanceUsd?.replace(/[^0-9.]/g, '') || '0');

              // Sum actual NFT values from holdings, fallback to $5 avg for NFTs without floor data
              const nftEstValue = walletData.nftHoldings?.reduce((sum, nft) => {
                return sum + (nft.estimatedValueUsd || (nft.count * 5));
              }, 0) || 0;

              // Add value for NFTs not in holdings (badges, xeet cards, etc)
              const holdingsNftCount = walletData.nftHoldings?.reduce((sum, nft) => sum + nft.count, 0) || 0;
              const otherNftsValue = Math.max(0, walletData.nftCount - holdingsNftCount) * 3; // $3 avg for badges/misc

              const totalNftValue = nftEstValue + otherNftsValue;
              const totalValue = ethValue + totalNftValue;

              const portfolioData = [
                { name: 'ETH', value: ethValue, color: '#627eea', percent: totalValue > 0 ? (ethValue / totalValue * 100).toFixed(1) : '0' },
                { name: 'NFTs', value: totalNftValue, color: '#00cccc', percent: totalValue > 0 ? (totalNftValue / totalValue * 100).toFixed(1) : '0' },
              ];

              return (
                <div style={{ textAlign: 'center' }}>
                  {/* Total Value */}
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Estimated Total</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', textShadow: '0 0 20px rgba(46, 219, 132, 0.3)' }}>
                    ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  {/* Pie Chart */}
                  <div style={{ height: 140, margin: '0.5rem 0' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolioData.filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {portfolioData.filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Breakdown bars */}
                  <div>
                    {portfolioData.map((item, i) => (
                      <div key={i} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                          <span style={{ color: item.color, fontWeight: 600 }}>{item.name}</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>${item.value.toLocaleString()} ({item.percent}%)</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${item.percent}%`,
                            background: item.color,
                            borderRadius: 3,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            </div>
          </div>

          {/* Top Holdings & P&L */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#2edb84' }}>Top Holdings</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* ETH Balance */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #627eea, #3c3c3d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                    Ξ
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Ethereum</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{walletData.balanceFormatted}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{walletData.balanceUsd}</div>
                </div>
              </div>

              {/* Top NFT Holdings */}
              {walletData.nftHoldings && walletData.nftHoldings.slice(0, 4).map((nft) => (
                <div key={`${nft.contractAddress}-${nft.tokenId}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {nft.image ? (
                      <img src={nft.image} alt={nft.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, #00cccc, #2edb84)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>
                        NFT
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{nft.collectionName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{nft.count > 1 ? `${nft.count} NFTs` : nft.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {nft.estimatedValueUsd ? (
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2edb84' }}>
                        ${nft.estimatedValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#00cccc' }}>{nft.count} held</div>
                    )}
                  </div>
                </div>
              ))}

              {(!walletData.nftHoldings || walletData.nftHoldings.length === 0) && walletData.nftCount > 0 && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.8rem'
                }}>
                  {walletData.nftCount} NFTs in collection
                </div>
              )}
            </div>

            {/* P&L Summary */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: walletData.isProfitable ? 'rgba(46, 219, 132, 0.1)' : 'rgba(231, 76, 60, 0.1)',
              borderRadius: 12,
              border: `1px solid ${walletData.isProfitable ? 'rgba(46, 219, 132, 0.2)' : 'rgba(231, 76, 60, 0.2)'}`
            }}>
              <div className="wallet-pnl-grid">
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Total Received</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2edb84' }}>{pnlHidden ? maskValue(walletData.ethReceivedUsd) : walletData.ethReceivedUsd}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Total Sent</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e74c3c' }}>{pnlHidden ? maskValue(walletData.ethSentUsd) : walletData.ethSentUsd}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Gas Spent</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f39c12' }}>{pnlHidden ? maskValue(walletData.totalGasUsedUsd) : walletData.totalGasUsedUsd}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Net P&L</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: walletData.isProfitable ? '#2edb84' : '#e74c3c' }}>{pnlHidden ? maskValue(walletData.netPnlUsd) : walletData.netPnlUsd}</div>
                </div>
              </div>
            </div>
          </div>

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
