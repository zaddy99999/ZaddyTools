'use client';

interface WalletData {
  transactionCount: number;
  walletAgeDays: number | null;
  activeDays: number;
  contractsInteracted: number;
  tokenCount: number;
  nftCount: number;
  ethReceived: number;
  ethSent: number;
  abstractBadgeCount?: number;
  xeetCardCount?: number;
  favoriteApps?: { name: string; interactions: number }[];
  walletScore?: number;
  netPnl?: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'activity' | 'trading' | 'collecting' | 'social' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  check: (data: WalletData) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  // Activity Achievements
  { id: 'first-steps', name: 'First Steps', description: 'Make your first transaction', icon: '👣', category: 'activity', tier: 'bronze', check: (d) => d.transactionCount >= 1 },
  { id: 'getting-started', name: 'Getting Started', description: 'Complete 10 transactions', icon: '🚶', category: 'activity', tier: 'bronze', check: (d) => d.transactionCount >= 10 },
  { id: 'active-user', name: 'Active User', description: 'Complete 100 transactions', icon: '🏃', category: 'activity', tier: 'silver', check: (d) => d.transactionCount >= 100 },
  { id: 'power-user', name: 'Power User', description: 'Complete 500 transactions', icon: '⚡', category: 'activity', tier: 'gold', check: (d) => d.transactionCount >= 500 },
  { id: 'transaction-king', name: 'Transaction King', description: 'Complete 1000+ transactions', icon: '👑', category: 'activity', tier: 'diamond', check: (d) => d.transactionCount >= 1000 },

  // Time-based
  { id: 'early-adopter', name: 'Early Adopter', description: 'Wallet older than 30 days', icon: '🌱', category: 'activity', tier: 'bronze', check: (d) => (d.walletAgeDays || 0) >= 30 },
  { id: 'veteran', name: 'Veteran', description: 'Wallet older than 180 days', icon: '🎖️', category: 'activity', tier: 'silver', check: (d) => (d.walletAgeDays || 0) >= 180 },
  { id: 'og', name: 'OG', description: 'Wallet older than 365 days', icon: '🏆', category: 'activity', tier: 'gold', check: (d) => (d.walletAgeDays || 0) >= 365 },
  { id: 'consistent', name: 'Consistent', description: 'Active for 30+ days', icon: '📅', category: 'activity', tier: 'silver', check: (d) => d.activeDays >= 30 },
  { id: 'dedicated', name: 'Dedicated', description: 'Active for 100+ days', icon: '💪', category: 'activity', tier: 'gold', check: (d) => d.activeDays >= 100 },

  // Trading
  { id: 'trader', name: 'Trader', description: 'Interact with 5+ contracts', icon: '📊', category: 'trading', tier: 'bronze', check: (d) => d.contractsInteracted >= 5 },
  { id: 'defi-explorer', name: 'DeFi Explorer', description: 'Interact with 20+ contracts', icon: '🔍', category: 'trading', tier: 'silver', check: (d) => d.contractsInteracted >= 20 },
  { id: 'defi-master', name: 'DeFi Master', description: 'Interact with 50+ contracts', icon: '🧙', category: 'trading', tier: 'gold', check: (d) => d.contractsInteracted >= 50 },
  { id: 'diversified', name: 'Diversified', description: 'Hold 5+ different tokens', icon: '🎨', category: 'trading', tier: 'bronze', check: (d) => d.tokenCount >= 5 },
  { id: 'portfolio-pro', name: 'Portfolio Pro', description: 'Hold 20+ different tokens', icon: '💼', category: 'trading', tier: 'silver', check: (d) => d.tokenCount >= 20 },
  { id: 'in-profit', name: 'In Profit', description: 'Positive P&L', icon: '📈', category: 'trading', tier: 'silver', check: (d) => (d.netPnl || 0) > 0 },
  { id: 'whale', name: 'Whale', description: 'Received 10+ ETH total', icon: '🐋', category: 'trading', tier: 'gold', check: (d) => d.ethReceived >= 10 },
  { id: 'mega-whale', name: 'Mega Whale', description: 'Received 100+ ETH total', icon: '🐳', category: 'trading', tier: 'diamond', check: (d) => d.ethReceived >= 100 },

  // Collecting
  { id: 'collector', name: 'Collector', description: 'Own 1+ NFT', icon: '🖼️', category: 'collecting', tier: 'bronze', check: (d) => d.nftCount >= 1 },
  { id: 'art-lover', name: 'Art Lover', description: 'Own 10+ NFTs', icon: '🎭', category: 'collecting', tier: 'silver', check: (d) => d.nftCount >= 10 },
  { id: 'nft-whale', name: 'NFT Whale', description: 'Own 50+ NFTs', icon: '🦈', category: 'collecting', tier: 'gold', check: (d) => d.nftCount >= 50 },
  { id: 'hoarder', name: 'Hoarder', description: 'Own 100+ NFTs', icon: '🏰', category: 'collecting', tier: 'diamond', check: (d) => d.nftCount >= 100 },

  // Abstract Social
  { id: 'badge-holder', name: 'Badge Holder', description: 'Earn 1+ Abstract badge', icon: '🏅', category: 'social', tier: 'bronze', check: (d) => (d.abstractBadgeCount || 0) >= 1 },
  { id: 'badge-collector', name: 'Badge Collector', description: 'Earn 5+ Abstract badges', icon: '🎀', category: 'social', tier: 'silver', check: (d) => (d.abstractBadgeCount || 0) >= 5 },
  { id: 'badge-master', name: 'Badge Master', description: 'Earn 10+ Abstract badges', icon: '🎪', category: 'social', tier: 'gold', check: (d) => (d.abstractBadgeCount || 0) >= 10 },
  { id: 'xeet-holder', name: 'Xeet Holder', description: 'Own 1+ Xeet card', icon: '🃏', category: 'social', tier: 'bronze', check: (d) => (d.xeetCardCount || 0) >= 1 },
  { id: 'xeet-collector', name: 'Xeet Collector', description: 'Own 5+ Xeet cards', icon: '🎴', category: 'social', tier: 'silver', check: (d) => (d.xeetCardCount || 0) >= 5 },

  // Special
  { id: 'app-lover', name: 'App Lover', description: 'Use 5+ different apps', icon: '📱', category: 'special', tier: 'silver', check: (d) => (d.favoriteApps?.length || 0) >= 5 },
  { id: 'high-score', name: 'High Score', description: 'Wallet score 50+', icon: '🎯', category: 'special', tier: 'silver', check: (d) => (d.walletScore || 0) >= 50 },
  { id: 'elite', name: 'Elite', description: 'Wallet score 80+', icon: '💎', category: 'special', tier: 'gold', check: (d) => (d.walletScore || 0) >= 80 },
  { id: 'perfect', name: 'Perfect', description: 'Wallet score 99', icon: '✨', category: 'special', tier: 'diamond', check: (d) => (d.walletScore || 0) >= 99 },
];

const TIER_COLORS = {
  bronze: { bg: 'rgba(205, 127, 50, 0.15)', border: 'rgba(205, 127, 50, 0.4)', text: '#cd7f32' },
  silver: { bg: 'rgba(192, 192, 192, 0.15)', border: 'rgba(192, 192, 192, 0.4)', text: '#c0c0c0' },
  gold: { bg: 'rgba(255, 215, 0, 0.15)', border: 'rgba(255, 215, 0, 0.4)', text: '#ffd700' },
  diamond: { bg: 'rgba(185, 242, 255, 0.15)', border: 'rgba(185, 242, 255, 0.4)', text: '#b9f2ff' },
};

const CATEGORY_LABELS = {
  activity: 'Activity',
  trading: 'Trading',
  collecting: 'Collecting',
  social: 'Social',
  special: 'Special',
};

interface AchievementsProps {
  walletData: WalletData;
}

export default function Achievements({ walletData }: AchievementsProps) {
  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.check(walletData));
  const lockedAchievements = ACHIEVEMENTS.filter(a => !a.check(walletData));

  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  // Group by category
  const categories = ['activity', 'trading', 'collecting', 'social', 'special'] as const;

  return (
    <div className="achievements-panel">
      <div className="achievements-header">
        <h3>Achievements</h3>
        <div className="achievements-progress">
          <span className="progress-text">{unlockedCount}/{totalCount}</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="progress-percent">{progressPercent}%</span>
        </div>
      </div>

      <div className="achievements-grid">
        {/* Unlocked first */}
        {unlockedAchievements.map(achievement => (
          <div
            key={achievement.id}
            className={`achievement-card unlocked ${achievement.tier}`}
            style={{
              background: TIER_COLORS[achievement.tier].bg,
              borderColor: TIER_COLORS[achievement.tier].border,
            }}
            title={achievement.description}
          >
            <span className="achievement-icon">{achievement.icon}</span>
            <span className="achievement-name" style={{ color: TIER_COLORS[achievement.tier].text }}>
              {achievement.name}
            </span>
          </div>
        ))}

        {/* Locked */}
        {lockedAchievements.map(achievement => (
          <div
            key={achievement.id}
            className="achievement-card locked"
            title={achievement.description}
          >
            <span className="achievement-icon">🔒</span>
            <span className="achievement-name">{achievement.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
