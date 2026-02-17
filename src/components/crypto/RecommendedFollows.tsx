'use client';

import { useState, useEffect, useRef } from 'react';

interface Person {
  handle: string;
  name?: string;
  category?: string;
  priority?: boolean;
}

interface Project {
  handle: string;
  name?: string;
  category?: string;
  priority?: boolean;
}

export default function RecommendedFollows() {
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recommendedTab, setRecommendedTab] = useState<'people' | 'projects'>('people');
  const [suggestInput, setSuggestInput] = useState('');
  const [suggestStatus, setSuggestStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [suggestError, setSuggestError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch people and projects
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [peopleRes, projectsRes] = await Promise.all([
          fetch('/api/recommended-people'),
          fetch('/api/tier-maker'),
        ]);

        if (peopleRes.ok) {
          const peopleData = await peopleRes.json();
          setPeople(Array.isArray(peopleData) ? peopleData : []);
        }

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(Array.isArray(projectsData) ? projectsData : []);
        }
      } catch (err) {
        console.error('Error fetching recommended data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSuggest = async () => {
    if (!suggestInput.trim()) return;

    setSuggestStatus('submitting');
    setSuggestError('');

    try {
      const res = await fetch('/api/suggest-follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: suggestInput.trim(),
          type: recommendedTab === 'people' ? 'person' : 'project'
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuggestStatus('success');
        setSuggestInput('');
        setTimeout(() => setSuggestStatus('idle'), 2000);
      } else {
        setSuggestStatus('error');
        setSuggestError(data.error || 'Failed to submit');
        setTimeout(() => {
          setSuggestStatus('idle');
          setSuggestError('');
        }, 3000);
      }
    } catch {
      setSuggestStatus('error');
      setSuggestError('Network error');
      setTimeout(() => {
        setSuggestStatus('idle');
        setSuggestError('');
      }, 3000);
    }
  };

  // Sort by priority first, then keep original order
  const sortedPeople = [...people].sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return 0;
  });
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return 0;
  });
  const itemsToShow = recommendedTab === 'people' ? sortedPeople : sortedProjects;
  const size = 50;
  const border = 2;

  return (
    <div style={{
      background: '#000',
      borderRadius: '12px',
      border: '1px solid rgba(167, 139, 250, 0.3)',
      padding: '1rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa', margin: 0 }}>
          Recommended Follows
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setRecommendedTab('people')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: recommendedTab === 'people' ? 'rgba(167, 139, 250, 0.3)' : 'transparent',
                color: recommendedTab === 'people' ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
            >
              People
            </button>
            <button
              onClick={() => setRecommendedTab('projects')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: recommendedTab === 'projects' ? 'rgba(167, 139, 250, 0.3)' : 'transparent',
                color: recommendedTab === 'projects' ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
            >
              Projects
            </button>
          </div>

          {/* Suggest Input */}
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="@handle"
              value={suggestInput}
              onChange={(e) => setSuggestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && suggestInput.trim()) {
                  handleSuggest();
                }
              }}
              style={{
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid rgba(167, 139, 250, 0.4)',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                fontSize: '0.7rem',
                width: '100px',
              }}
            />
            {/* Search Button */}
            <button
              onClick={() => {
                if (searchTimeout.current) {
                  clearTimeout(searchTimeout.current);
                  searchTimeout.current = null;
                }
                if (searchTerm) {
                  setSearchTerm('');
                  return;
                }
                if (!suggestInput.trim()) return;
                setSearchTerm(suggestInput.trim().toLowerCase().replace(/^@/, ''));
                searchTimeout.current = setTimeout(() => {
                  setSearchTerm('');
                  searchTimeout.current = null;
                }, 30000);
              }}
              title={searchTerm ? 'Clear search' : 'Search for handle'}
              style={{
                padding: '0.35rem',
                borderRadius: '6px',
                border: searchTerm ? '1px solid #2edb84' : '1px solid rgba(167, 139, 250, 0.4)',
                background: searchTerm ? 'rgba(46, 219, 132, 0.3)' : 'rgba(167, 139, 250, 0.1)',
                color: '#fff',
                cursor: (suggestInput.trim() || searchTerm) ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (suggestInput.trim() || searchTerm) ? 1 : 0.5,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={searchTerm ? '#2edb84' : 'rgba(167, 139, 250, 0.8)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            {/* Suggest Button */}
            <button
              onClick={handleSuggest}
              disabled={suggestStatus === 'submitting' || !suggestInput.trim()}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                border: 'none',
                background: suggestStatus === 'success' ? '#2edb84' : suggestStatus === 'error' ? '#ef4444' : 'rgba(46, 219, 132, 0.8)',
                color: '#000',
                fontWeight: 600,
                cursor: suggestStatus === 'submitting' ? 'wait' : 'pointer',
                fontSize: '0.6rem',
                opacity: !suggestInput.trim() ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {suggestStatus === 'submitting' ? '...' : suggestStatus === 'success' ? 'Added!' : suggestStatus === 'error' ? 'Error' : 'Suggest'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {suggestError && (
        <div style={{
          marginBottom: '0.75rem',
          padding: '0.5rem',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '6px',
          fontSize: '0.7rem',
          color: '#ef4444',
        }}>
          {suggestError}
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'relative' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            Loading...
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            justifyContent: 'center',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '0.5rem',
            paddingBottom: '2rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(167, 139, 250, 0.3) transparent',
          }}>
            {itemsToShow.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                No {recommendedTab} to show yet
              </div>
            ) : (
              itemsToShow.map((item) => {
                const isMatch = searchTerm && (
                  item.handle.toLowerCase().includes(searchTerm) ||
                  (item.name && item.name.toLowerCase().includes(searchTerm))
                );
                return (
                  <a
                    key={`${recommendedTab}-${item.handle}`}
                    href={`https://x.com/${item.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${item.name || item.handle} (@${item.handle})`}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: isMatch ? `${border + 1}px solid #2edb84` : `${border}px solid rgba(46, 219, 132, 0.5)`,
                      boxShadow: isMatch ? undefined : '0 2px 8px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      flexShrink: 0,
                      zIndex: isMatch ? 20 : 1,
                      animation: isMatch ? 'greenFire 0.8s ease-in-out infinite' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isMatch) {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.zIndex = '10';
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(46, 219, 132, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMatch) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.zIndex = '1';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                      }
                    }}
                  >
                    <img
                      src={`/pfp/${item.handle}.jpg`}
                      alt={item.name || item.handle}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = '1';
                          target.src = `https://unavatar.io/twitter/${item.handle}`;
                        } else {
                          target.onerror = null;
                          target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${item.name || item.handle}`;
                        }
                      }}
                    />
                  </a>
                );
              })
            )}
          </div>
        )}

        {/* Scroll indicator */}
        {itemsToShow.length > 30 && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: '0.5rem',
          }}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(167, 139, 250, 0.6)', pointerEvents: 'auto' }}>
              scroll for more
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
