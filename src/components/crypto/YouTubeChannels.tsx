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

// Popular crypto education, news & trading YouTube channels
const CHANNELS: Channel[] = [
  // Education
  { name: 'Coin Bureau', handle: '@CoinBureau', avatar: '/youtube-pfp/coin-bureau.jpg', subscribers: '2.4M', description: 'In-depth research & analysis', category: 'education' },
  { name: 'Whiteboard Crypto', handle: '@WhiteboardCrypto', avatar: '/youtube-pfp/whiteboard-crypto.jpg', subscribers: '780K', description: 'Concepts explained simply', category: 'education' },
  { name: 'Finematics', handle: '@Finematics', avatar: '/youtube-pfp/finematics.jpg', subscribers: '450K', description: 'DeFi deep dives', category: 'education' },
  { name: 'Andrei Jikh', handle: '@AndreiJikh', avatar: '/youtube-pfp/andreijikh.jpg', subscribers: '2.2M', description: 'Finance & crypto basics', category: 'education' },
  // News
  { name: 'Bankless', handle: '@Bankless', avatar: '/youtube-pfp/bankless.jpg', subscribers: '280K', description: 'Crypto news & interviews', category: 'news' },
  { name: 'The Defiant', handle: '@TheDefiant', avatar: '/youtube-pfp/the-defiant.jpg', subscribers: '95K', description: 'DeFi news & analysis', category: 'news' },
  { name: 'Altcoin Daily', handle: '@AltcoinDaily', avatar: '/youtube-pfp/altcoin-daily.jpg', subscribers: '1.4M', description: 'Daily crypto updates', category: 'news' },
  { name: 'Anthony Pompliano', handle: '@apompliano', avatar: '/youtube-pfp/anthonypompliano.jpg', subscribers: '500K', description: 'Bitcoin & macro news', category: 'news' },
  // Trading
  { name: 'Benjamin Cowen', handle: '@intocryptoverse', avatar: '/youtube-pfp/benjamin-cowen.jpg', subscribers: '790K', description: 'Data-driven analysis', category: 'trading' },
  { name: 'DataDash', handle: '@DataDash', avatar: '/youtube-pfp/datadash.jpg', subscribers: '400K', description: 'Technical analysis', category: 'trading' },
  { name: 'CryptosRUs', handle: '@CryptosRUs', avatar: '/youtube-pfp/cryptosrus.jpg', subscribers: '600K', description: 'Daily market updates', category: 'trading' },
  { name: 'Crypto Jebb', handle: '@CryptoJebb', avatar: '/youtube-pfp/cryptojebb.jpg', subscribers: '300K', description: 'Chart analysis', category: 'trading' },
  { name: 'Raoul Pal', handle: '@RealVisionFinance', avatar: '/youtube-pfp/raulpal.jpg', subscribers: '1M', description: 'Macro investing', category: 'trading' },
  { name: 'Max Maher', handle: '@MaxMaher', avatar: '/youtube-pfp/maxmaher.jpg', subscribers: '800K', description: 'Crypto & finance', category: 'trading' },
  { name: 'Crypto Wendy O', handle: '@CryptoWendyO', avatar: '/youtube-pfp/cryptowendyo.jpg', subscribers: '200K', description: 'Trading strategies', category: 'trading' },
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
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredChannels = activeTab === 'all' ? CHANNELS : CHANNELS.filter(c => c.category === activeTab);

  return (
    <div className="youtube-channels-container" style={{ padding: '1rem' }}>
      {/* Header */}
      <div className="youtube-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', color: '#ff0000' }}>▶</span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>YouTube Channels</span>
        </div>
        <div className="youtube-filters" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {(['all', 'education', 'news', 'dev'] as CategoryKey[]).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className="youtube-filter-btn"
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

      {/* Channel Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
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
                background: 'rgba(255,255,255,0.1)',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=ff0000&color=fff&size=200`;
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
