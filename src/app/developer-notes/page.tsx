'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

interface UpdateEntry {
  title: string;
  description: string;
  type: 'feature' | 'fix' | 'improvement' | 'refactor';
}

interface DayUpdate {
  date: string;
  updates: UpdateEntry[];
}

// Fallback hardcoded data (will be replaced by API data when available)
const fallbackUpdates: DayUpdate[] = [
  {
    date: 'February 17, 2025',
    updates: [
      {
        title: 'Combined Top Wallets & All Wallets',
        description: 'Merged Top Wallets into All Wallets section. Now shows all Silver+ wallets (198k+) with tier filters, search, sorting by tier/txns/badges, and 500 wallet limit with scrolling.',
        type: 'feature',
      },
      {
        title: 'Silver Wallet Enrichment',
        description: 'Started scraping 180k silver tier wallets with profile pictures and transaction counts using 15 parallel workers.',
        type: 'feature',
      },
      {
        title: 'Media Player Controls Redesign',
        description: 'Moved play/pause and mute buttons to bottom time bar. Week navigation arrows now below the date display.',
        type: 'improvement',
      },
      {
        title: 'Heatmap Image Fallbacks',
        description: 'Fixed heatmap PFP loading for tokens like SOL by switching to foreignObject with HTML img and proper error handling.',
        type: 'fix',
      },
      {
        title: 'NFT Leaderboard 0% Fix',
        description: 'NFT leaderboard now shows "-" instead of "0.0%" when there\'s no price change data.',
        type: 'fix',
      },
      {
        title: 'Suggestion Status Messages',
        description: 'Added descriptive error messages when suggesting handles: shows if pending, approved, or rejected (with count).',
        type: 'improvement',
      },
      {
        title: 'Admin Override for Suggestions',
        description: 'Admin can now add names even if previously rejected. Regular users still see rejection messages.',
        type: 'feature',
      },
      {
        title: 'Pending Filter Fix',
        description: 'Fixed approved items showing in pending list by normalizing status comparison (trim + lowercase).',
        type: 'fix',
      },
    ],
  },
  {
    date: 'February 16, 2025',
    updates: [
      {
        title: 'NFT / Meme Heatmap Combined',
        description: 'Combined NFT and Meme treemaps into a single component with toggle. Added MCap/Volume size metric toggle. NFTs show by default.',
        type: 'feature',
      },
      {
        title: 'Market Heatmap PFPs',
        description: 'Added profile pictures to Market Heatmap coins with local fallbacks and error handling.',
        type: 'improvement',
      },
      {
        title: 'Coin Whitelist',
        description: 'Added whitelist for Market Heatmap to prevent scam tokens from appearing. Only approved coins show up.',
        type: 'feature',
      },
      {
        title: 'Abstract TVL via DeFi Llama',
        description: 'Switched Abstract Dashboard TVL data source from L2Beat to DeFi Llama for more conservative numbers.',
        type: 'improvement',
      },
      {
        title: 'Abstract Weekly News Recap',
        description: 'Added video player module to Abstract Dashboard for weekly news recap videos.',
        type: 'feature',
      },
      {
        title: 'Developer Notes Page',
        description: 'Added this page to track development updates and changes.',
        type: 'feature',
      },
      {
        title: 'Admin Analytics API',
        description: 'Created analytics tracking API endpoint for admin dashboard.',
        type: 'feature',
      },
    ],
  },
  {
    date: 'February 15, 2025',
    updates: [
      {
        title: 'Abstract Token PFPs',
        description: 'Downloaded and saved token profile pictures locally in /public/tokens/ for fallback when API fails.',
        type: 'improvement',
      },
      {
        title: 'Whitelist System',
        description: 'Implemented Google Sheets-based whitelist for NFTs and tokens on Abstract Dashboard.',
        type: 'feature',
      },
      {
        title: 'Token/NFT Leaderboards',
        description: 'Added Top Abstract NFTs and Top Abstract Tokens leaderboard tables.',
        type: 'feature',
      },
    ],
  },
  {
    date: 'February 14, 2025',
    updates: [
      {
        title: 'Abstract Dashboard Launch',
        description: 'Initial launch of the Abstract chain dashboard with tier stats, TVL, and activity metrics.',
        type: 'feature',
      },
      {
        title: 'Tier Cards',
        description: 'Added 3D animated tier cards showing user distribution across Bronze to Ethereal tiers.',
        type: 'feature',
      },
      {
        title: 'Elite Wallets Leaderboard',
        description: 'Added top wallets leaderboard with tier badges and XP display.',
        type: 'feature',
      },
      {
        title: 'Recommended People',
        description: 'Added recommended Abstract community members to follow.',
        type: 'feature',
      },
    ],
  },
  {
    date: 'February 13, 2025',
    updates: [
      {
        title: 'Market Analysis Page',
        description: 'Created comprehensive market analysis page with multiple data modules.',
        type: 'feature',
      },
      {
        title: 'Draggable Dashboard',
        description: 'Implemented drag-and-drop reordering for dashboard modules with localStorage persistence.',
        type: 'feature',
      },
      {
        title: 'Fear & Greed Index',
        description: 'Added crypto Fear & Greed Index display.',
        type: 'feature',
      },
      {
        title: 'ETF Flows',
        description: 'Added Bitcoin and Ethereum ETF flow tracking.',
        type: 'feature',
      },
    ],
  },
];

const typeColors: Record<string, { bg: string; text: string }> = {
  feature: { bg: 'rgba(46, 219, 132, 0.15)', text: '#2edb84' },
  fix: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  improvement: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  refactor: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
};

export default function DeveloperNotesPage() {
  const [devUpdates, setDevUpdates] = useState<DayUpdate[]>(fallbackUpdates);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotes() {
      try {
        const res = await fetch('/api/dev-notes');
        const data = await res.json();
        if (data.notes && data.notes.length > 0) {
          setDevUpdates(data.notes);
        }
      } catch (err) {
        console.error('Error fetching dev notes:', err);
        // Keep fallback data
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, []);

  return (
    <main className="container">
      <div className="banner-header">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Developer Notes</p>
          </div>
          <NavBar />
        </div>
      </div>

      <div style={{ padding: '1rem 0', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Development Updates</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Track recent changes, new features, and improvements to ZaddyTools.
        </p>

        {/* Updates Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {devUpdates.map((day, dayIdx) => (
            <div
              key={dayIdx}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(46, 219, 132, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#2edb84',
                  flexShrink: 0,
                }} />
                <h2 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#2edb84',
                  margin: 0,
                }}>
                  {day.date}
                </h2>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  {day.updates.length} update{day.updates.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {day.updates.map((update, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '4px',
                      background: typeColors[update.type].bg,
                      color: typeColors[update.type].text,
                      flexShrink: 0,
                      marginTop: '0.1rem',
                    }}>
                      {update.type}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, marginBottom: '0.2rem' }}>{update.title}</h3>
                      <p style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        margin: 0,
                        lineHeight: 1.4,
                      }}>
                        {update.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '1rem',
          background: 'rgba(46, 219, 132, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(46, 219, 132, 0.2)',
        }}>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
            Have suggestions or found a bug? Reach out on{' '}
            <a
              href="https://x.com/zaddyfi"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2edb84' }}
            >
              X @zaddyfi
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
