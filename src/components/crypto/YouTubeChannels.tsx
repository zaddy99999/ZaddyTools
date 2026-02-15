'use client';

import { useState, useEffect } from 'react';

interface Channel {
  name: string;
  handle: string;
  avatar: string;
  subscribers: string;
  description: string;
  category: 'education' | 'news' | 'trading' | 'dev';
}

const getLocalAvatar = (name: string) => `/youtube-pfp/${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.jpg`;

const CHANNELS: Channel[] = [
  // Education
  { name: 'Coin Bureau', handle: '@CoinBureau', avatar: getLocalAvatar('Coin Bureau'), subscribers: '2.4M', description: 'In-depth research & analysis', category: 'education' },
  { name: 'Whiteboard Crypto', handle: '@WhiteboardCrypto', avatar: getLocalAvatar('Whiteboard Crypto'), subscribers: '780K', description: 'Concepts explained simply', category: 'education' },
  { name: 'Finematics', handle: '@Finematics', avatar: getLocalAvatar('Finematics'), subscribers: '450K', description: 'DeFi deep dives', category: 'education' },
  // News & Podcasts
  { name: 'Bankless', handle: '@Bankless', avatar: getLocalAvatar('Bankless'), subscribers: '280K', description: 'Crypto news & interviews', category: 'news' },
  { name: 'Unchained Crypto', handle: '@UnchainedCrypto', avatar: getLocalAvatar('Unchained Crypto'), subscribers: '120K', description: 'Laura Shin interviews', category: 'news' },
  { name: 'The Defiant', handle: '@TheDefiant', avatar: getLocalAvatar('The Defiant'), subscribers: '95K', description: 'DeFi news & analysis', category: 'news' },
  { name: 'Real Vision', handle: '@RealVisionFinance', avatar: getLocalAvatar('Real Vision'), subscribers: '1.1M', description: 'Macro & crypto insights', category: 'news' },
  { name: 'What Bitcoin Did', handle: '@WhatBitcoinDid', avatar: getLocalAvatar('What Bitcoin Did'), subscribers: '180K', description: 'Peter McCormack podcast', category: 'news' },
  { name: 'The Pomp Podcast', handle: '@AnthonyPompliano', avatar: getLocalAvatar('The Pomp Podcast'), subscribers: '490K', description: 'Anthony Pompliano', category: 'news' },
  { name: 'Up Only', handle: '@UpOnlyTV', avatar: getLocalAvatar('Up Only'), subscribers: '45K', description: 'Cobie & Ledger', category: 'news' },
  // Trading & Analysis
  { name: 'Benjamin Cowen', handle: '@intocryptoverse', avatar: getLocalAvatar('Benjamin Cowen'), subscribers: '790K', description: 'Data-driven analysis', category: 'trading' },
  // Dev
  { name: 'Patrick Collins', handle: '@PatrickAlphaC', avatar: getLocalAvatar('Patrick Collins'), subscribers: '280K', description: 'Smart contract development', category: 'dev' },
  { name: 'Dapp University', handle: '@DappUniversity', avatar: getLocalAvatar('Dapp University'), subscribers: '340K', description: 'Web3 development tutorials', category: 'dev' },
  { name: 'Smart Contract Programmer', handle: '@smartcontractprogrammer', avatar: getLocalAvatar('Smart Contract Programmer'), subscribers: '120K', description: 'Solidity tutorials', category: 'dev' },
];

const CATEGORY_COLORS: Record<string, string> = {
  education: '#3b82f6',
  news: '#2edb84',
  trading: '#f59e0b',
  dev: '#a855f7',
};

const CATEGORY_LABELS: Record<string, string> = {
  education: 'Learn',
  news: 'News',
  trading: 'Analysis',
  dev: 'Build',
};

type CategoryKey = 'all' | 'education' | 'news' | 'trading' | 'dev';

export default function YouTubeChannels() {
  const [activeTab, setActiveTab] = useState<CategoryKey>('all');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [checkedImages, setCheckedImages] = useState(false);

  // Pre-check which images exist
  useEffect(() => {
    const checkImages = async () => {
      const failed = new Set<string>();
      await Promise.all(
        CHANNELS.map(async (channel) => {
          try {
            const response = await fetch(channel.avatar, { method: 'HEAD' });
            if (!response.ok) {
              failed.add(channel.handle);
            }
          } catch {
            failed.add(channel.handle);
          }
        })
      );
      setFailedImages(failed);
      setCheckedImages(true);
    };
    checkImages();
  }, []);

  // Filter out channels with no PFP
  const validChannels = CHANNELS.filter(c => !failedImages.has(c.handle));
  const filteredChannels = activeTab === 'all' ? validChannels : validChannels.filter(c => c.category === activeTab);

  if (!checkedImages) {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.25rem', color: '#ff0000' }}>▶</span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>YouTube Channels</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', color: '#ff0000' }}>▶</span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>YouTube Channels</span>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['all', 'education', 'news', 'dev'] as CategoryKey[]).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === cat ? '#ff0000' : 'rgba(255,255,255,0.1)',
                color: activeTab === cat ? '#fff' : 'rgba(255,255,255,0.7)',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Grid - Match Podcast UI */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        {filteredChannels.map((channel) => (
          <a
            key={channel.handle}
            href={`https://youtube.com/${channel.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '0.5rem',
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <img
              src={channel.avatar}
              alt={channel.name}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '8px',
                objectFit: 'cover',
                marginBottom: '0.5rem',
              }}
            />
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', lineHeight: 1.2, marginBottom: '0.2rem' }}>
              {channel.name.length > 20 ? channel.name.slice(0, 20) + '...' : channel.name}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>
              {channel.subscribers} subscribers
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Curated crypto YouTube channels</span>
      </div>
    </div>
  );
}
