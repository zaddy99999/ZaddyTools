'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

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

interface WalletStats {
  silver: number;
  gold: number;
  platinum: number;
  diamond: number;
  obsidian: number;
  total: number;
}

type TierFilter = 'all' | 'obsidian' | 'diamond' | 'platinum' | 'gold' | 'silver';
type SortType = 'tier' | 'badges' | 'name';

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Obsidian: { bg: 'linear-gradient(135deg, #1a1a2e, #3a3a5a)', text: '#a0a0c0', border: '#4a4a6a' },
  Diamond: { bg: 'linear-gradient(135deg, #b9f2ff, #e0f7ff)', text: '#1a1a2e', border: '#7dd3e8' },
  Platinum: { bg: 'linear-gradient(135deg, #e5e4e2, #d4d4d2)', text: '#2a2a2a', border: '#c0bfbd' },
  Gold: { bg: 'linear-gradient(135deg, #ffd700, #ffec8b)', text: '#2a2a2a', border: '#daa520' },
  Silver: { bg: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)', text: '#2a2a2a', border: '#a0a0a0' },
};

const TIER_NAMES: Record<number, string> = {
  6: 'Obsidian',
  5: 'Diamond',
  4: 'Platinum',
  3: 'Gold',
  2: 'Silver',
};

export default function AllWalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortType, setSortType] = useState<SortType>('tier');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 100;

  useEffect(() => {
    const fetchWallets = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          tier: tierFilter,
          page: String(page),
          limit: String(limit),
        });
        if (searchQuery) {
          params.set('search', searchQuery);
        }

        const res = await fetch(`/api/all-wallets?${params}`);
        if (res.ok) {
          const data = await res.json();
          // Get wallets from the appropriate key
          const walletData = data.all || data[tierFilter] || [];
          setWallets(walletData);
          setStats(data.stats);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages);
            setTotal(data.pagination.total);
          }
        }
      } catch (e) {
        console.error('Failed to fetch wallets:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, [tierFilter, page, searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [tierFilter, searchQuery]);

  // Sort wallets
  const sortedWallets = [...wallets].sort((a, b) => {
    if (sortType === 'tier') {
      // Primary: tierV2 (includes tier + subtier)
      if (b.tierV2 !== a.tierV2) return b.tierV2 - a.tierV2;
      // Tiebreaker: badge count
      return b.badges - a.badges;
    }
    if (sortType === 'badges') return b.badges - a.badges;
    if (sortType === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const getTierName = (tier: number) => TIER_NAMES[tier] || 'Unknown';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <NavBar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2edb84', marginBottom: '0.5rem' }}>
            All Wallets
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
            Silver tier and above ({stats?.total?.toLocaleString() || '...'} wallets)
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {(['obsidian', 'diamond', 'platinum', 'gold', 'silver'] as const).map((tier) => {
              const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
              const colors = TIER_COLORS[tierName];
              return (
                <div
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: tierFilter === tier ? 'rgba(46, 219, 132, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${tierFilter === tier ? '#2edb84' : colors.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: colors.bg,
                    color: colors.text,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}>
                    {tierName}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                    {stats[tier].toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* Tier Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Tier:</span>
            {(['all', 'obsidian', 'diamond', 'platinum', 'gold', 'silver'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: tierFilter === tier ? 'none' : '1px solid rgba(46, 219, 132, 0.4)',
                  background: tierFilter === tier ? '#2edb84' : 'rgba(46, 219, 132, 0.1)',
                  color: tierFilter === tier ? '#000' : 'rgba(255,255,255,0.9)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                }}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Sort:</span>
            {(['tier', 'badges', 'name'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortType(sort)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: sortType === sort ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  background: sortType === sort ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  color: sortType === sort ? '#fff' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                }}
              >
                {sort}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by name or wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Wallet List */}
        <div style={{
          background: '#000',
          borderRadius: '12px',
          border: '1px solid rgba(46, 219, 132, 0.2)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Loading wallets...
            </div>
          ) : sortedWallets.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No wallets found
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '40px 44px 1fr 80px 60px 60px',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
              }}>
                <div>#</div>
                <div></div>
                <div>Name</div>
                <div style={{ textAlign: 'center' }}>Tier</div>
                <div style={{ textAlign: 'center' }}>Badges</div>
                <div style={{ textAlign: 'center' }}>Stream</div>
              </div>

              {/* Wallets */}
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {sortedWallets.map((wallet, index) => {
                  const tierName = getTierName(wallet.tier);
                  const colors = TIER_COLORS[tierName] || TIER_COLORS.Gold;
                  const subTier = ((wallet.tierV2 - 1) % 3) + 1;
                  const displayName = wallet.name.startsWith('0x') && wallet.name.length > 20
                    ? `${wallet.name.slice(0, 6)}...${wallet.name.slice(-4)}`
                    : wallet.name;
                  const globalIndex = (page - 1) * limit + index + 1;

                  return (
                    <a
                      key={wallet.id}
                      href={`https://portal.abs.xyz/profile/${wallet.wallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 44px 1fr 80px 60px 60px',
                        gap: '0.75rem',
                        padding: '0.65rem 1rem',
                        alignItems: 'center',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        {globalIndex}
                      </span>
                      <img
                        src={wallet.pfp || `https://api.dicebear.com/7.x/identicon/svg?seed=${wallet.wallet}`}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1a2e', objectFit: 'cover' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${wallet.wallet}`;
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}>
                          {displayName}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                          {wallet.wallet.slice(0, 6)}...{wallet.wallet.slice(-4)}
                        </span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: colors.bg,
                          color: colors.text,
                        }}>
                          {tierName} {subTier}
                        </span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a78bfa' }}>
                          {wallet.badges}
                        </span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {wallet.streaming ? (
                          <span style={{ fontSize: '0.75rem', color: '#2edb84' }}>✓</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>-</span>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '1.5rem',
          }}>
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: page === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                color: page === 1 ? 'rgba(255,255,255,0.3)' : '#fff',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
              }}
            >
              First
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: page === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                color: page === 1 ? 'rgba(255,255,255,0.3)' : '#fff',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Prev
            </button>
            <span style={{ padding: '0 1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              Page {page} of {totalPages} ({total.toLocaleString()} results)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: page === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                color: page === totalPages ? 'rgba(255,255,255,0.3)' : '#fff',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: page === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                color: page === totalPages ? 'rgba(255,255,255,0.3)' : '#fff',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Last
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
