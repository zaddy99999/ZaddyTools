'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface Podcast {
  id: string;
  name: string;
  author: string;
  artwork: string;
  url: string;
  feedUrl: string;
  genre: string;
  episodeCount: number;
  category: 'crypto' | 'ai';
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PodcastList() {
  const [activeTab, setActiveTab] = useState<'crypto' | 'ai'>('crypto');

  const { data: podcasts, isLoading } = useSWR<Podcast[]>(
    '/api/podcasts',
    fetcher,
    { refreshInterval: 1800000 }
  );

  const filteredPodcasts = podcasts?.filter(p => p.category === activeTab) || [];

  if (isLoading) {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🎙️</span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Top Podcasts</span>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => setActiveTab('crypto')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'crypto' ? '#2edb84' : 'rgba(255,255,255,0.1)',
              color: activeTab === 'crypto' ? '#000' : 'rgba(255,255,255,0.7)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Crypto
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'ai' ? '#2edb84' : 'rgba(255,255,255,0.1)',
              color: activeTab === 'ai' ? '#000' : 'rgba(255,255,255,0.7)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            AI & Tech
          </button>
        </div>
      </div>

      {/* Podcast Grid - Large Artwork */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        {filteredPodcasts.map((podcast) => (
          <a
            key={podcast.id}
            href={podcast.url}
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
              e.currentTarget.style.background = 'rgba(46, 219, 132, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(46, 219, 132, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <img
              src={podcast.artwork}
              alt={podcast.name}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '8px',
                objectFit: 'cover',
                marginBottom: '0.5rem',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/ZaddyPFP.png';
              }}
            />
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', lineHeight: 1.2, marginBottom: '0.2rem' }}>
              {podcast.name.length > 30 ? podcast.name.slice(0, 30) + '...' : podcast.name}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>
              {podcast.author.length > 25 ? podcast.author.slice(0, 25) + '...' : podcast.author}
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Data from Apple Podcasts</span>
      </div>
    </div>
  );
}
