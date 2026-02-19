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

// No fallback data - only show approved notes from the API
const fallbackUpdates: DayUpdate[] = [];

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
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{update.title}</h3>
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          background: typeColors[update.type].bg,
                          color: typeColors[update.type].text,
                          flexShrink: 0,
                        }}>
                          {update.type}
                        </span>
                      </div>
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
