'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

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
}

/**
 * SECURITY WARNING: Client-side authentication is inherently vulnerable to XSS attacks.
 *
 * Current implementation stores a session token (not the actual secret) in localStorage.
 * The actual admin key validation happens server-side via the /api/admin/auth endpoint.
 *
 * For production environments, consider:
 * 1. Using httpOnly cookies set by the server for session management
 * 2. Implementing a proper session-based authentication system
 * 3. Adding CSRF protection tokens
 * 4. Moving to a server component with middleware-based auth
 *
 * The localStorage token is a session identifier, NOT the actual admin secret.
 * All sensitive operations are validated server-side with the x-admin-key header.
 */

// Session token stored locally (not the actual secret - server validates the real key)
const AUTH_SESSION_KEY = 'admin-session-token';

export default function AdminDashboard() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authKey, setAuthKey] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on load
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_SESSION_KEY);
    if (storedToken) {
      // Validate the session token with the server
      validateSession(storedToken);
    }
  }, []);

  // Validate session token with server
  const validateSession = async (token: string) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken: token }),
      });
      if (res.ok) {
        setSessionToken(token);
        setIsAuthed(true);
      } else {
        // Invalid session, clear it
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch (err) {
      console.error('Session validation failed:', err);
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  };

  // Fetch suggestions when authed
  useEffect(() => {
    if (isAuthed && sessionToken) {
      fetchSuggestions();
    }
  }, [isAuthed, filter, sessionToken]);

  const handleLogin = async () => {
    try {
      // Authenticate with server - server validates the actual admin key
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminKey: authKey }),
      });

      if (res.ok) {
        const data = await res.json();
        // Store session token (NOT the actual admin key) in localStorage
        // This token is validated server-side on subsequent requests
        const token = data.sessionToken || crypto.randomUUID();
        localStorage.setItem(AUTH_SESSION_KEY, token);
        setSessionToken(token);
        setIsAuthed(true);
        setError(null);
        setAuthKey(''); // Clear the input immediately
      } else {
        setError('Invalid admin key');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    setSessionToken(null);
    setIsAuthed(false);
    setSuggestions([]);
  };

  const fetchSuggestions = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/admin/suggestions${statusParam}`, {
        headers: { 'x-admin-session': sessionToken },
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
    if (!sessionToken) return;
    const suggestion = suggestions.find(s => s.rowIndex === rowIndex);
    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': sessionToken,
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

  // Login screen
  if (!isAuthed) {
    return (
      <main className="container">
        <div className="banner-header">
          <div className="banner-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/ZaddyPFP.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
              <div>
                <h1 style={{ marginBottom: 0 }}>ZaddyTools</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Admin Dashboard</p>
              </div>
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
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Admin Login</h2>
            <input
              type="password"
              value={authKey}
              onChange={(e) => setAuthKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter admin key"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: '1rem',
                marginBottom: '1rem',
              }}
            />
            {error && (
              <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
            )}
            <button
              onClick={handleLogin}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: '#2edb84',
                color: '#000',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Login
            </button>
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
            <img src="/ZaddyPFP.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
            <div>
              <h1 style={{ marginBottom: 0 }}>ZaddyTools</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Admin Dashboard</p>
            </div>
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
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Project</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Tool</th>
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
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{s.projectName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(s.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{s.toolType || 'social-clips'}</td>
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
                        background: s.status === 'approved' ? 'rgba(46, 219, 132, 0.2)' :
                                   s.status === 'rejected' ? 'rgba(255, 107, 107, 0.2)' :
                                   'rgba(255, 193, 7, 0.2)',
                        color: s.status === 'approved' ? '#2edb84' :
                               s.status === 'rejected' ? '#ff6b6b' :
                               '#ffc107',
                      }}>
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
