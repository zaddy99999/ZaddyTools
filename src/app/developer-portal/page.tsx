'use client';

import { useState, useEffect, useRef } from 'react';
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

interface DevNote {
  id: number;
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'fix' | 'improvement' | 'refactor';
  status: 'pending' | 'approved';
  createdAt: string;
}

type AdminTab = 'suggestions' | 'dev-notes';

type SortColumn = 'project' | 'source' | 'category' | 'status' | 'date' | 'notes';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Suggestion>>({});
  const [approveDropdownRow, setApproveDropdownRow] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; dropUp: boolean; viewportHeight: number } | null>(null);
  const [currentDropdownSuggestion, setCurrentDropdownSuggestion] = useState<Suggestion | null>(null);
  const [approveOptions, setApproveOptions] = useState<{
    recommendedFollows: boolean;
    tierList: boolean;
    socialAnalytics: boolean;
    teamBuilder: boolean;
    priority: boolean;
  }>({ recommendedFollows: false, tierList: false, socialAnalytics: false, teamBuilder: false, priority: false });

  // Admin tab state
  const [activeTab, setActiveTab] = useState<AdminTab>('suggestions');

  // Dev notes state
  const [devNotes, setDevNotes] = useState<DevNote[]>([]);
  const [devNotesFilter, setDevNotesFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [previewNotes, setPreviewNotes] = useState<DevNote[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingPreviewIndex, setEditingPreviewIndex] = useState<number | null>(null);

  // Quick add suggestion state
  const [quickAddHandle, setQuickAddHandle] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  // Quick add suggestion
  const handleQuickAdd = async (type: 'person' | 'project') => {
    if (!isAuthed || !address || !quickAddHandle.trim()) return;
    setQuickAddLoading(true);
    setError(null);
    try {
      const handle = quickAddHandle.trim().replace(/^@/, '');
      const source = type === 'person' ? 'quick-add-people' : 'quick-add-project';
      const res = await fetch('/api/admin/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          projectName: handle,
          handle: handle,
          category: 'web3',
          source: source,
          status: 'pending',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add suggestion');
        return;
      }
      setQuickAddHandle('');
      fetchSuggestions();
    } catch (err) {
      console.error('Error adding suggestion:', err);
      setError('Failed to add suggestion');
    } finally {
      setQuickAddLoading(false);
    }
  };

  // Remove suggestion (delete without rejecting)
  const removeSuggestion = async (rowIndex: number) => {
    if (!isAuthed || !address) return;
    try {
      const res = await fetch(`/api/admin/suggestions?rowIndex=${rowIndex}`, {
        method: 'DELETE',
        headers: { 'x-wallet-address': address },
      });
      if (!res.ok) throw new Error('Failed to remove');
      setSuggestions(prev => prev.filter(s => s.rowIndex !== rowIndex));
    } catch (err) {
      console.error('Error removing suggestion:', err);
      setError('Failed to remove suggestion');
    }
  };

  // Write directly to sheet (uses recommendedFollows by default)
  const writeToSheet = async (suggestion: Suggestion) => {
    if (!isAuthed || !address) return;
    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          rowIndex: suggestion.rowIndex,
          status: 'approved',
          suggestion,
          approveOptions: {
            recommendedFollows: true,
            tierList: false,
            socialAnalytics: false,
            teamBuilder: false,
            priority: false,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to write');
      // Update local state
      setSuggestions(prev => prev.map(s =>
        s.rowIndex === suggestion.rowIndex ? { ...s, status: 'approved' as const } : s
      ));
    } catch (err) {
      console.error('Error writing to sheet:', err);
      setError('Failed to write to sheet');
    }
  };

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Helper to check if handle is valid (will have working PFP)
  const isValidHandle = (s: Suggestion) => {
    const handle = (s.handle || s.projectName || '')
      .replace(/^@/, '')
      .replace(/\s+/g, '')
      .replace(/[^\w]/g, '');
    return handle.length > 0 && /^[a-zA-Z0-9_]+$/.test(handle);
  };

  // Sort suggestions
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    // Always sort broken PFPs (invalid handles) to the bottom
    const aValid = isValidHandle(a);
    const bValid = isValidHandle(b);
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;

    if (!sortColumn) return 0;

    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortColumn) {
      case 'project':
        aVal = (a.projectName || '').toLowerCase();
        bVal = (b.projectName || '').toLowerCase();
        break;
      case 'source':
        aVal = (a.source || a.toolType || '').toLowerCase();
        bVal = (b.source || b.toolType || '').toLowerCase();
        break;
      case 'category':
        aVal = a.category;
        bVal = b.category;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'date':
        aVal = new Date(a.timestamp || 0).getTime();
        bVal = new Date(b.timestamp || 0).getTime();
        break;
      case 'notes':
        aVal = (a.notes || '').toLowerCase();
        bVal = (b.notes || '').toLowerCase();
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Abstract wallet connection
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Check if wallet is whitelisted - this is the ONLY auth required
  const isWalletWhitelisted = address?.toLowerCase() === WHITELISTED_WALLET;
  const isAuthed = isConnected && isWalletWhitelisted;

  // Fetch suggestions when wallet is connected and whitelisted
  useEffect(() => {
    if (isAuthed && activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [isAuthed, filter, activeTab]);

  // Fetch dev notes when tab is active
  useEffect(() => {
    if (isAuthed && activeTab === 'dev-notes') {
      fetchDevNotes();
    }
  }, [isAuthed, devNotesFilter, activeTab]);

  const handleLogout = () => {
    setSuggestions([]);
    setDevNotes([]);
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

  const fetchDevNotes = async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const statusParam = devNotesFilter === 'all' ? '' : `?status=${devNotesFilter}`;
      const res = await fetch(`/api/admin/dev-notes${statusParam}`, {
        headers: { 'x-wallet-address': address || '' },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDevNotes(data.notes || []);
    } catch (err) {
      console.error('Error fetching dev notes:', err);
      setError('Failed to load dev notes');
    } finally {
      setLoading(false);
    }
  };

  const deleteDevNote = async (id: number) => {
    if (!isAuthed || !address) return;
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/admin/dev-notes?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-wallet-address': address },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDevNotes(prev => prev.filter(n => n.id !== id));
      setSelectedNotes(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Error deleting dev note:', err);
      setError('Failed to delete dev note');
    }
  };

  const toggleNoteSelection = (id: number) => {
    setSelectedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllNotes = () => {
    const pendingIds = devNotes.filter(n => n.status === 'pending').map(n => n.id);
    setSelectedNotes(new Set(pendingIds));
  };

  const clearSelection = () => {
    setSelectedNotes(new Set());
  };

  const generatePreview = async () => {
    if (!isAuthed || !address || selectedNotes.size === 0) return;
    setAiLoading(true);
    try {
      const selected = devNotes.filter(n => selectedNotes.has(n.id));
      const previews: DevNote[] = [];

      for (const note of selected) {
        const res = await fetch('/api/admin/dev-notes/ai-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
          body: JSON.stringify({
            title: note.title,
            description: note.description,
            instruction: aiInstruction || undefined,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        previews.push({
          ...note,
          title: data.title,
          description: data.description,
        });
      }

      setPreviewNotes(previews);
      setShowPreview(true);
      setAiInstruction('');
    } catch (err) {
      console.error('Error generating preview:', err);
      setError('Failed to generate preview');
    } finally {
      setAiLoading(false);
    }
  };

  const approvePreviewedNotes = async () => {
    if (!isAuthed || !address || previewNotes.length === 0) return;
    setAiLoading(true);
    try {
      for (const note of previewNotes) {
        const res = await fetch('/api/admin/dev-notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
          body: JSON.stringify({
            id: note.id,
            title: note.title,
            description: note.description,
            status: 'approved',
          }),
        });
        if (!res.ok) throw new Error('Failed to approve');
      }
      // Clear state and refresh
      setShowPreview(false);
      setPreviewNotes([]);
      setSelectedNotes(new Set());
      setEditingPreviewIndex(null);
      fetchDevNotes();
    } catch (err) {
      console.error('Error approving notes:', err);
      setError('Failed to approve notes');
    } finally {
      setAiLoading(false);
    }
  };

  const updatePreviewNote = (index: number, updates: Partial<DevNote>) => {
    setPreviewNotes(prev => prev.map((n, i) => i === index ? { ...n, ...updates } : n));
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

      // Update local state - remove from view if status no longer matches filter
      setSuggestions(prev => {
        if (filter === 'all') {
          // Just update the status
          return prev.map(s => s.rowIndex === rowIndex ? { ...s, status } : s);
        } else {
          // Remove from view since it no longer matches the filter
          return prev.filter(s => s.rowIndex !== rowIndex);
        }
      });
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  // Determine if suggestion is for a person or project based on source/toolType
  const isPerson = (s: Suggestion) => {
    const source = (s.source || s.toolType || '').toLowerCase();
    // If it explicitly says "project", it's not a person
    if (source.includes('project')) return false;
    // Otherwise check for person-related keywords
    return source.includes('people') || source.includes('person') || source.includes('build-your-team') || source.includes('recommended-follows') || source.includes('follow');
  };

  const openApproveDropdown = (suggestion: Suggestion, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropUp = rect.top > viewportHeight / 2;

    setDropdownPosition({
      top: dropUp ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(10, rect.right - 200), // Align right edge, but keep on screen
      dropUp,
      viewportHeight,
    });
    setApproveDropdownRow(suggestion.rowIndex);
    setCurrentDropdownSuggestion(suggestion);
    setApproveOptions({ recommendedFollows: false, tierList: false, socialAnalytics: false, teamBuilder: false, priority: false });
  };

  const closeApproveDropdown = () => {
    setApproveDropdownRow(null);
    setDropdownPosition(null);
    setCurrentDropdownSuggestion(null);
    setApproveOptions({ recommendedFollows: false, tierList: false, socialAnalytics: false, teamBuilder: false, priority: false });
  };

  const submitApproval = async (s: Suggestion) => {
    if (!isAuthed || !address) return;
    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          rowIndex: s.rowIndex,
          status: 'approved',
          suggestion: s,
          approveOptions,
        }),
      });
      if (!res.ok) throw new Error('Failed to approve');

      // Remove from view if filter is pending
      setSuggestions(prev => {
        if (filter === 'all') {
          return prev.map(item => item.rowIndex === s.rowIndex ? { ...item, status: 'approved' } : item);
        } else {
          return prev.filter(item => item.rowIndex !== s.rowIndex);
        }
      });
      closeApproveDropdown();
    } catch (err) {
      console.error('Error approving:', err);
      setError('Failed to approve');
    }
  };

  const startEditing = (s: Suggestion) => {
    setEditingRow(s.rowIndex);
    setEditData({
      projectName: s.projectName,
      handle: s.handle,
      category: s.category,
      notes: s.notes,
      source: s.source,
    });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditData({});
  };

  const saveEdit = async (rowIndex: number) => {
    if (!isAuthed || !address) return;
    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ rowIndex, editData }),
      });
      if (!res.ok) throw new Error('Failed to save edit');

      // Update local state
      setSuggestions(prev =>
        prev.map(s => s.rowIndex === rowIndex ? { ...s, ...editData } : s)
      );
      setEditingRow(null);
      setEditData({});
    } catch (err) {
      console.error('Error saving edit:', err);
      setError('Failed to save edit');
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
        {/* Main Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('suggestions')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'suggestions' ? '#2edb84' : 'transparent',
              color: activeTab === 'suggestions' ? '#000' : 'rgba(255,255,255,0.7)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Suggestions
          </button>
          <button
            onClick={() => setActiveTab('dev-notes')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'dev-notes' ? '#2edb84' : 'transparent',
              color: activeTab === 'dev-notes' ? '#000' : 'rgba(255,255,255,0.7)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Dev Notes
          </button>
          <button
            onClick={handleLogout}
            style={{
              marginLeft: 'auto',
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

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <>
            {/* Filter Tabs with Quick Add */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="@handle"
                  value={quickAddHandle}
                  onChange={(e) => setQuickAddHandle(e.target.value)}
                  style={{
                    width: '120px',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.8rem',
                  }}
                />
                <button
                  onClick={() => handleQuickAdd('person')}
                  disabled={quickAddLoading || !quickAddHandle.trim()}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: quickAddHandle.trim() ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: quickAddHandle.trim() ? 'pointer' : 'not-allowed',
                    opacity: quickAddLoading ? 0.6 : 1,
                  }}
                >
                  {quickAddLoading ? '...' : '+ Ppl'}
                </button>
                <button
                  onClick={() => handleQuickAdd('project')}
                  disabled={quickAddLoading || !quickAddHandle.trim()}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: quickAddHandle.trim() ? '#f97316' : 'rgba(249, 115, 22, 0.3)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: quickAddHandle.trim() ? 'pointer' : 'not-allowed',
                    opacity: quickAddLoading ? 0.6 : 1,
                  }}
                >
                  {quickAddLoading ? '...' : '+ Proj'}
                </button>
                <button
                  onClick={fetchSuggestions}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Refresh
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Migrate People sheet columns D,E,F -> E,G,H? This shifts old data to new column positions.')) return;
                    try {
                      const res = await fetch('/api/admin/suggestions', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-wallet-address': address || '',
                        },
                        body: JSON.stringify({ action: 'migrate-people-columns' }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        alert(data.message || 'Migration complete');
                      } else {
                        alert('Error: ' + (data.error || 'Migration failed'));
                      }
                    } catch (err) {
                      alert('Error: Migration failed');
                    }
                  }}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,193,7,0.3)',
                    background: 'transparent',
                    color: '#ffc107',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  Migrate Cols
                </button>
              </div>
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
                  <th style={{ padding: '0.5rem', paddingLeft: '1rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '60px' }}></th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>pfp</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>handle</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>page</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>type</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSuggestions.map((s) => (
                  <tr key={s.rowIndex} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Twitter Profile Picture */}
                    <td style={{ padding: '0.5rem', paddingLeft: '1rem', textAlign: 'center', width: '60px' }}>
                      {(() => {
                        // Clean handle - remove spaces, emojis, and invalid chars
                        const cleanHandle = (s.handle || s.projectName || '')
                          .replace(/^@/, '')
                          .replace(/\s+/g, '')
                          .replace(/[^\w]/g, '');
                        const isValidHandle = cleanHandle.length > 0 && /^[a-zA-Z0-9_]+$/.test(cleanHandle);
                        const displayName = s.projectName || s.handle || '?';
                        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.slice(0, 2))}&background=1a1a1a&color=2edb84&size=80`;

                        return (
                          <a
                            href={s.twitterLink || (isValidHandle ? `https://x.com/${cleanHandle}` : '#')}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-block' }}
                          >
                            <img
                              src={isValidHandle ? `https://unavatar.io/twitter/${cleanHandle}` : fallbackUrl}
                              alt={displayName}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                border: s.isExistingItem ? '2px solid #ffc107' : '2px solid transparent',
                                background: '#1a1a1a',
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = fallbackUrl;
                              }}
                            />
                          </a>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {editingRow === s.rowIndex ? (
                        <input
                          type="text"
                          value={editData.projectName || ''}
                          onChange={(e) => setEditData({ ...editData, projectName: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.4rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(46, 219, 132, 0.5)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: '0.85rem',
                          }}
                        />
                      ) : (
                        <>
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
                        </>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {editingRow === s.rowIndex ? (
                        <select
                          value={editData.source || s.source || ''}
                          onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                          style={{
                            padding: '0.3rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(46, 219, 132, 0.5)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: '0.75rem',
                          }}
                        >
                          <option value="quick-add-people">quick-add-people</option>
                          <option value="quick-add-project">quick-add-project</option>
                          <option value="recommended-follows">recommended-follows</option>
                          <option value="tier-maker-people">tier-maker-people</option>
                          <option value="tier-maker-projects">tier-maker-projects</option>
                          <option value="build-your-team">build-your-team</option>
                          <option value="social-analytics">social-analytics</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          background: 'rgba(46, 219, 132, 0.15)',
                          color: '#2edb84',
                        }}>
                          {s.source || s.toolType || 'unknown'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {editingRow === s.rowIndex ? (
                        <select
                          value={(editData.source || s.source || '').includes('people') || (editData.source || s.source || '').includes('person') || (editData.source || s.source || '').includes('follow') || (editData.source || s.source || '').includes('team') ? 'person' : 'project'}
                          onChange={(e) => {
                            const newSource = e.target.value === 'person' ? 'quick-add-people' : 'quick-add-project';
                            setEditData({ ...editData, source: newSource });
                          }}
                          style={{
                            padding: '0.3rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(46, 219, 132, 0.5)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: '0.75rem',
                          }}
                        >
                          <option value="person">Person</option>
                          <option value="project">Project</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          background: isPerson(s) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                          color: isPerson(s) ? '#3b82f6' : '#f97316',
                        }}>
                          {isPerson(s) ? 'Person' : 'Project'}
                        </span>
                      )}
                    </td>
                    {/* status column */}
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        background: s.status === 'approved' ? 'rgba(46, 219, 132, 0.2)' : s.status === 'rejected' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                        color: s.status === 'approved' ? '#2edb84' : s.status === 'rejected' ? '#ff6b6b' : '#ffc107',
                      }}>
                        {s.status || 'pending'}
                      </span>
                    </td>
                    {/* type column - approve/reject */}
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      {s.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (approveDropdownRow === s.rowIndex) {
                                closeApproveDropdown();
                              } else {
                                openApproveDropdown(s, e);
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#2edb84',
                              color: '#000',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => updateStatus(s.rowIndex, 'rejected')}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#ff6b6b',
                              color: '#000',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateStatus(s.rowIndex, 'pending')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,193,7,0.5)',
                            background: 'transparent',
                            color: '#ffc107',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </td>
                    {/* actions column - edit/remove */}
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      {editingRow === s.rowIndex ? (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => saveEdit(s.rowIndex)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#2edb84',
                              color: '#000',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.2)',
                              background: 'transparent',
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                            }}
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => startEditing(s)}
                            title="Edit"
                            style={{
                              padding: '0.25rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.2)',
                              background: 'transparent',
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                            }}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => removeSuggestion(s.rowIndex)}
                            title="Remove"
                            style={{
                              padding: '0.25rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.2)',
                              background: 'transparent',
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                            }}
                          >
                            ✕
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openApproveDropdown(s, e);
                            }}
                            title="Write to sheet"
                            style={{
                              padding: '0.25rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(46, 219, 132, 0.3)',
                              background: 'transparent',
                              color: '#2edb84',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                            }}
                          >
                            ⟳
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
          </>
        )}

        {/* Dev Notes Tab */}
        {activeTab === 'dev-notes' && (
          <>
            {/* Preview Mode */}
            {showPreview ? (
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#a855f7' }}>Preview ({previewNotes.length} items)</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => { setShowPreview(false); setPreviewNotes([]); setEditingPreviewIndex(null); }}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                      }}
                    >
                      Back
                    </button>
                    <button
                      onClick={approvePreviewedNotes}
                      disabled={aiLoading}
                      style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#2edb84',
                        color: '#000',
                        fontWeight: 600,
                        cursor: aiLoading ? 'not-allowed' : 'pointer',
                        opacity: aiLoading ? 0.6 : 1,
                      }}
                    >
                      {aiLoading ? 'Approving...' : 'Approve All'}
                    </button>
                  </div>
                </div>

                {previewNotes.map((note, idx) => (
                  <div
                    key={note.id}
                    style={{
                      padding: '1rem',
                      marginBottom: '0.75rem',
                      background: 'rgba(168, 85, 247, 0.05)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      borderRadius: '8px',
                    }}
                  >
                    {editingPreviewIndex === idx ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          type="text"
                          value={note.title}
                          onChange={(e) => updatePreviewNote(idx, { title: e.target.value })}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        />
                        <textarea
                          value={note.description}
                          onChange={(e) => updatePreviewNote(idx, { description: e.target.value })}
                          rows={2}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            resize: 'vertical',
                          }}
                        />
                        <button
                          onClick={() => setEditingPreviewIndex(null)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '4px',
                            border: 'none',
                            background: '#2edb84',
                            color: '#000',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: 'fit-content',
                          }}
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <span style={{ color: 'rgba(168, 85, 247, 0.8)', fontWeight: 600, minWidth: '24px' }}>{idx + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '3px',
                              background: note.type === 'feature' ? 'rgba(46, 219, 132, 0.15)' :
                                         note.type === 'fix' ? 'rgba(239, 68, 68, 0.15)' :
                                         note.type === 'improvement' ? 'rgba(59, 130, 246, 0.15)' :
                                         'rgba(168, 85, 247, 0.15)',
                              color: note.type === 'feature' ? '#2edb84' :
                                     note.type === 'fix' ? '#ef4444' :
                                     note.type === 'improvement' ? '#3b82f6' : '#a855f7',
                            }}>
                              {note.type}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{note.title}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                            {note.description}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingPreviewIndex(idx)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Filter Bar */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(['pending', 'approved', 'all'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setDevNotesFilter(f); setSelectedNotes(new Set()); }}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: devNotesFilter === f ? '#2edb84' : 'rgba(255,255,255,0.1)',
                        color: devNotesFilter === f ? '#000' : 'rgba(255,255,255,0.7)',
                        fontWeight: devNotesFilter === f ? 600 : 400,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                  <button
                    onClick={fetchDevNotes}
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
                </div>

                {/* Selection Actions - minimal row */}
                {devNotesFilter === 'pending' && devNotes.filter(n => n.status === 'pending').length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      {selectedNotes.size} selected
                    </span>
                    <button
                      onClick={selectAllNotes}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Notes List - Grouped by Date */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                      Loading dev notes...
                    </div>
                  ) : devNotes.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                      No {devNotesFilter === 'all' ? '' : devNotesFilter} dev notes found
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {(() => {
                        // Group notes by date
                        const grouped: { [date: string]: DevNote[] } = {};
                        devNotes.forEach(note => {
                          const date = note.date || 'No date';
                          if (!grouped[date]) grouped[date] = [];
                          grouped[date].push(note);
                        });

                        return Object.entries(grouped).map(([date, notes]) => (
                          <div key={date}>
                            {/* Date Header */}
                            <div style={{
                              padding: '0.5rem 1rem',
                              background: 'rgba(255,255,255,0.03)',
                              borderBottom: '1px solid rgba(255,255,255,0.08)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.5)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}>
                              {date}
                            </div>
                            {/* Notes for this date */}
                            {notes.map((note) => (
                              <div
                                key={note.id}
                                style={{
                                  display: 'flex',
                                  gap: '0.75rem',
                                  padding: '0.6rem 1rem',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  background: selectedNotes.has(note.id) ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                                  alignItems: 'center',
                                }}
                              >
                                {/* Checkbox for pending items */}
                                {note.status === 'pending' && (
                                  <input
                                    type="checkbox"
                                    checked={selectedNotes.has(note.id)}
                                    onChange={() => toggleNoteSelection(note.id)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#a855f7', flexShrink: 0 }}
                                  />
                                )}

                                {/* Type badge */}
                                <span style={{
                                  fontSize: '0.55rem',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: '3px',
                                  flexShrink: 0,
                                  background: note.type === 'feature' ? 'rgba(46, 219, 132, 0.15)' :
                                             note.type === 'fix' ? 'rgba(239, 68, 68, 0.15)' :
                                             note.type === 'improvement' ? 'rgba(59, 130, 246, 0.15)' :
                                             'rgba(168, 85, 247, 0.15)',
                                  color: note.type === 'feature' ? '#2edb84' :
                                         note.type === 'fix' ? '#ef4444' :
                                         note.type === 'improvement' ? '#3b82f6' : '#a855f7',
                                }}>
                                  {note.type}
                                </span>

                                {/* Content - compact */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{note.title}</span>
                                    {note.status === 'approved' && (
                                      <span style={{
                                        fontSize: '0.5rem',
                                        fontWeight: 600,
                                        padding: '0.1rem 0.3rem',
                                        borderRadius: '3px',
                                        background: 'rgba(46, 219, 132, 0.15)',
                                        color: '#2edb84',
                                      }}>
                                        APPROVED
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {note.description}
                                  </p>
                                </div>

                                {/* Delete button */}
                                <button
                                  onClick={() => deleteDevNote(note.id)}
                                  style={{
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: 'rgba(255, 107, 107, 0.15)',
                                    color: '#ff6b6b',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* AI Chatbar at bottom */}
                {devNotesFilter === 'pending' && devNotes.filter(n => n.status === 'pending').length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '12px',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                        <circle cx="7.5" cy="14.5" r="1.5"/>
                        <circle cx="16.5" cy="14.5" r="1.5"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Tell the agent how to format the notes..."
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && selectedNotes.size > 0 && generatePreview()}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={generatePreview}
                      disabled={selectedNotes.size === 0 || aiLoading}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: selectedNotes.size === 0 ? 'rgba(168, 85, 247, 0.3)' : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: selectedNotes.size === 0 || aiLoading ? 'not-allowed' : 'pointer',
                        opacity: aiLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      {aiLoading ? (
                        'Generating...'
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                          Send
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Fixed Approval Dropdown Portal */}
      {approveDropdownRow !== null && dropdownPosition && currentDropdownSuggestion && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeApproveDropdown}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              background: 'transparent',
            }}
          />
          {/* Dropdown */}
          <div
            style={{
              position: 'fixed',
              ...(dropdownPosition.dropUp
                ? { bottom: dropdownPosition.viewportHeight - dropdownPosition.top }
                : { top: dropdownPosition.top }),
              left: dropdownPosition.left,
              background: '#1a1a1a',
              border: '1px solid rgba(46, 219, 132, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              zIndex: 9999,
              minWidth: '200px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div>Add to: {isPerson(currentDropdownSuggestion) ? '(Person)' : '(Project)'}</div>
              <div style={{ marginTop: '0.25rem', color: '#ffc107' }}>
                Applied for: {currentDropdownSuggestion.source || currentDropdownSuggestion.toolType || 'unknown'}
              </div>
            </div>
            {(() => {
              const source = (currentDropdownSuggestion.source || currentDropdownSuggestion.toolType || '').toLowerCase();
              const appliedFor = {
                recommendedFollows: source.includes('recommended') || source.includes('follow'),
                tierList: source.includes('tier'),
                socialAnalytics: source.includes('social') || source.includes('analytics'),
                teamBuilder: source.includes('team') || source.includes('build'),
              };
              return (
                <>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#fff',
                    background: appliedFor.recommendedFollows ? 'rgba(255, 193, 7, 0.15)' : 'transparent',
                    borderRadius: '4px',
                  }}>
                    <input
                      type="checkbox"
                      checked={approveOptions.recommendedFollows}
                      onChange={(e) => setApproveOptions({ ...approveOptions, recommendedFollows: e.target.checked })}
                      style={{ accentColor: '#2edb84', width: 16, height: 16 }}
                    />
                    Recommended Follows
                    {appliedFor.recommendedFollows && <span style={{ color: '#ffc107', fontSize: '0.7rem', marginLeft: 'auto' }}>applied</span>}
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#fff',
                    background: appliedFor.tierList ? 'rgba(255, 193, 7, 0.15)' : 'transparent',
                    borderRadius: '4px',
                  }}>
                    <input
                      type="checkbox"
                      checked={approveOptions.tierList}
                      onChange={(e) => setApproveOptions({ ...approveOptions, tierList: e.target.checked })}
                      style={{ accentColor: '#2edb84', width: 16, height: 16 }}
                    />
                    Tier List
                    {appliedFor.tierList && <span style={{ color: '#ffc107', fontSize: '0.7rem', marginLeft: 'auto' }}>applied</span>}
                  </label>
                  {!isPerson(currentDropdownSuggestion) && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#fff',
                      background: appliedFor.socialAnalytics ? 'rgba(255, 193, 7, 0.15)' : 'transparent',
                      borderRadius: '4px',
                    }}>
                      <input
                        type="checkbox"
                        checked={approveOptions.socialAnalytics}
                        onChange={(e) => setApproveOptions({ ...approveOptions, socialAnalytics: e.target.checked })}
                        style={{ accentColor: '#2edb84', width: 16, height: 16 }}
                      />
                      Social Analytics
                      {appliedFor.socialAnalytics && <span style={{ color: '#ffc107', fontSize: '0.7rem', marginLeft: 'auto' }}>applied</span>}
                    </label>
                  )}
                  {isPerson(currentDropdownSuggestion) && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#fff',
                      background: appliedFor.teamBuilder ? 'rgba(255, 193, 7, 0.15)' : 'transparent',
                      borderRadius: '4px',
                    }}>
                      <input
                        type="checkbox"
                        checked={approveOptions.teamBuilder}
                        onChange={(e) => setApproveOptions({ ...approveOptions, teamBuilder: e.target.checked })}
                        style={{ accentColor: '#2edb84', width: 16, height: 16 }}
                      />
                      Team Builder
                      {appliedFor.teamBuilder && <span style={{ color: '#ffc107', fontSize: '0.7rem', marginLeft: 'auto' }}>applied</span>}
                    </label>
                  )}
                  {/* Priority checkbox - always visible */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#fff',
                    marginTop: '0.25rem',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '0.5rem',
                  }}>
                    <input
                      type="checkbox"
                      checked={approveOptions.priority}
                      onChange={(e) => setApproveOptions({ ...approveOptions, priority: e.target.checked })}
                      style={{ accentColor: '#ffc107', width: 16, height: 16 }}
                    />
                    <span style={{ color: '#ffc107' }}>Priority</span>
                  </label>
                </>
              );
            })()}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={() => submitApproval(currentDropdownSuggestion)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#2edb84',
                  color: '#000',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
              <button
                onClick={closeApproveDropdown}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
