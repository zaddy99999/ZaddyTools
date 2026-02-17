'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount, useDisconnect } from 'wagmi';

// Whitelisted wallet address (only this wallet can access admin)
const WHITELISTED_WALLET = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24'.toLowerCase();

interface Suggestion {
  rowIndex: number;
  timestamp: string;
  projectName: string;
  giphyUrl?: string;
  tiktokUrl?: string;
  category: 'web2' | 'web3';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  toolType?: string;
  twitterLink?: string;
  source?: string;
  handle?: string;
  rejectionCount?: number;
  isExistingItem?: boolean;
}

type AdminTab = 'suggestions' | 'dev-notes';

export default function AdminDashboard() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState<string | null>(null);

  // Abstract wallet connection
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Check if wallet is whitelisted - this is the ONLY auth required
  const isWalletWhitelisted = address?.toLowerCase() === WHITELISTED_WALLET;
  const isAuthed = isConnected && isWalletWhitelisted;

  // Fetch suggestions when wallet is connected and whitelisted
  useEffect(() => {
    if (isAuthed) {
      fetchSuggestions();
    }
  }, [isAuthed, filter]);

  const handleLogout = () => {
    setSuggestions([]);
    disconnect();
  };

  const fetchSuggestions = async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/admin/suggestions${statusParam}`, {
        headers: { 'x-wallet-address': address || '' },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (rowIndex: number, status: 'pending' | 'approved' | 'rejected', addToList = false) => {
    if (!isAuthed || !address) return;
    const suggestion = suggestions.find(s => s.rowIndex === rowIndex);
    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ rowIndex, status, addToList, suggestion }),
      });
      if (!res.ok) throw new Error('Failed to update');

      // Update local state
      setSuggestions(prev =>
        prev.map(s => s.rowIndex === rowIndex ? { ...s, status } : s)
      );
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  // Login screen - requires whitelisted wallet only
  if (!isAuthed) {
    return (
      <main className="container">
        <div className="banner-header">
          <div className="banner-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Admin Dashboard</p>
            </div>
            <NavBar />
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 140px)'
        }}>
          <div className="card" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
            <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Admin Access</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              Connect your authorized Abstract wallet to access the admin dashboard
            </p>

            {!isConnected ? (
              <button
                onClick={() => login()}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00d4aa 0%, #00a888 100%)',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '1rem',
                }}
              >
                <img src="/AbstractLogo.png" alt="" style={{ width: 22, height: 22 }} />
                Connect with Abstract
              </button>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}>
                  <span style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <button
                    onClick={() => disconnect()}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Disconnect
                  </button>
                </div>
                {!isWalletWhitelisted && (
                  <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 107, 107, 0.1)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                  }}>
                    <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
                      This wallet is not authorized to access the admin dashboard
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="banner-header">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Admin Dashboard</p>
          </div>
          <NavBar />
        </div>
      </div>

      <div style={{ padding: '1rem 0' }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: filter === f ? '#2edb84' : 'rgba(255,255,255,0.1)',
                color: filter === f ? '#000' : 'rgba(255,255,255,0.7)',
                fontWeight: filter === f ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
          <button
            onClick={fetchSuggestions}
            style={{
              marginLeft: 'auto',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 107, 107, 0.5)',
              background: 'transparent',
              color: '#ff6b6b',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>

        {/* Suggestions List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Loading suggestions...
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No {filter === 'all' ? '' : filter} suggestions found
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '60px' }}>Profile</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Project</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Source</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>URLs</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Notes</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr key={s.rowIndex} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Twitter Profile Picture */}
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      {s.handle && (
                        <a
                          href={s.twitterLink || `https://x.com/${s.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block' }}
                        >
                          <img
                            src={`https://unavatar.io/twitter/${s.handle}`}
                            alt={s.handle}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              border: s.isExistingItem ? '2px solid #ffc107' : '2px solid transparent',
                              background: '#1a1a1a',
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.handle || s.projectName)}&background=1a1a1a&color=2edb84&size=80`;
                            }}
                          />
                        </a>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <a
                          href={s.twitterLink || `https://x.com/${s.handle || s.projectName.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}
                        >
                          {s.projectName}
                        </a>
                        {s.isExistingItem && (
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: 'rgba(255, 193, 7, 0.2)',
                            color: '#ffc107',
                          }}>
                            ALREADY ADDED
                          </span>
                        )}
                        {(s.rejectionCount || 0) > 0 && (
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: (s.rejectionCount || 0) >= 3 ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 107, 107, 0.15)',
                            color: '#ff6b6b',
                          }}>
                            {s.rejectionCount}x REJECTED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                        {s.timestamp && !isNaN(new Date(s.timestamp).getTime())
                          ? new Date(s.timestamp).toLocaleDateString()
                          : s.timestamp || 'No date'}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      <span style={{
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        background: 'rgba(46, 219, 132, 0.15)',
                        color: '#2edb84',
                      }}>
                        {s.source || s.toolType || 'unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        background: s.category === 'web3' ? 'rgba(138, 43, 226, 0.2)' : 'rgba(0, 204, 255, 0.2)',
                        color: s.category === 'web3' ? '#a855f7' : '#00ccff',
                      }}>
                        {s.category}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <a
                          href={s.twitterLink || `https://x.com/${s.handle || s.projectName.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#1DA1F2', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          @{s.handle || s.projectName.replace('@', '')}
                        </a>
                        {s.giphyUrl && (
                          <a href={s.giphyUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2edb84' }}>
                            GIPHY
                          </a>
                        )}
                        {s.tiktokUrl && (
                          <a href={s.tiktokUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#ff6b6b' }}>
                            TikTok
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', maxWidth: '200px' }}>
                      {s.notes || '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: s.status === 'approved' ? 'rgba(46, 219, 132, 0.2)' :
                                   s.status === 'rejected' ? 'rgba(255, 107, 107, 0.2)' :
                                   'rgba(255, 193, 7, 0.2)',
                        color: s.status === 'approved' ? '#2edb84' :
                               s.status === 'rejected' ? '#ff6b6b' :
                               '#ffc107',
                      }}>
                        {s.status === 'approved' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                        {s.status === 'rejected' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        )}
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {s.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {(s.toolType?.includes('tier-maker') || !s.toolType) && (
                            <button
                              onClick={() => updateStatus(s.rowIndex, 'approved', true)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '4px',
                                border: 'none',
                                background: '#2edb84',
                                color: '#000',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Approve + Add
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(s.rowIndex, 'approved', false)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '4px',
                              border: '1px solid #2edb84',
                              background: 'transparent',
                              color: '#2edb84',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(s.rowIndex, 'rejected')}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#ff6b6b',
                              color: '#000',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateStatus(s.rowIndex, 'pending')}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
