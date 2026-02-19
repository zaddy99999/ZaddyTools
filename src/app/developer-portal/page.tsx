'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount, useDisconnect } from 'wagmi';
import { createPortal } from 'react-dom';

// Icons for developer portal sidebar
const SuggestionsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const DevNotesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const PagesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

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
  status: 'pending' | 'approved' | 'rejected' | 'published';
  createdAt: string;
}

type AdminTab = 'suggestions' | 'dev-notes' | 'analytics' | 'pages';

interface AnalyticsData {
  stats: {
    todayViews: number;
    weekViews: number;
    monthViews: number;
    totalViews: number;
  };
  pageViews: { page: string; count: number }[];
  toolUsage: { tool: string; count: number }[];
  dailyData: { date: string; views: number }[];
}

type SortColumn = 'project' | 'source' | 'category' | 'status' | 'date' | 'notes';
type SortDirection = 'asc' | 'desc';

// Sensitive content patterns to check in dev notes
const SENSITIVE_PATTERNS = [
  // Admin/internal references
  { pattern: /admin/i, reason: 'mentions admin (gives hackers ideas)' },
  { pattern: /portal/i, reason: 'mentions portal (internal reference)' },
  { pattern: /dashboard/i, reason: 'mentions dashboard (internal reference)' },
  { pattern: /whitelist/i, reason: 'mentions whitelist (security detail)' },
  { pattern: /backend/i, reason: 'mentions backend (internal architecture)' },
  { pattern: /api\s*(key|secret|token)/i, reason: 'mentions API credentials' },
  { pattern: /secret/i, reason: 'mentions secrets' },
  { pattern: /password/i, reason: 'mentions passwords' },
  { pattern: /auth(entication|orization)?/i, reason: 'mentions auth system details' },

  // Wallet/crypto sensitive
  { pattern: /0x[a-fA-F0-9]{40}/i, reason: 'contains wallet address' },
  { pattern: /private\s*key/i, reason: 'mentions private keys' },

  // Internal paths/URLs
  { pattern: /\/api\//i, reason: 'exposes API routes' },
  { pattern: /localhost/i, reason: 'mentions localhost' },
  { pattern: /\.env/i, reason: 'mentions environment files' },
  { pattern: /google.*sheet/i, reason: 'mentions internal data storage' },
  { pattern: /spreadsheet/i, reason: 'mentions internal data storage' },

  // Security terms
  { pattern: /exploit/i, reason: 'mentions exploits' },
  { pattern: /vulnerab/i, reason: 'mentions vulnerabilities' },
  { pattern: /hack/i, reason: 'mentions hacking' },
  { pattern: /injection/i, reason: 'mentions injection attacks' },
  { pattern: /bypass/i, reason: 'mentions bypassing security' },
];

// Check if note content contains sensitive information
function checkSensitiveContent(title: string, description: string): { hasSensitive: boolean; reasons: string[] } {
  const content = `${title} ${description}`.toLowerCase();
  const reasons: string[] = [];

  for (const { pattern, reason } of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      reasons.push(reason);
    }
  }

  return { hasSensitive: reasons.length > 0, reasons };
}

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
  const [devNotesFilter, setDevNotesFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'published'>('pending');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [previewNotes, setPreviewNotes] = useState<DevNote[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingPreviewIndex, setEditingPreviewIndex] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showPublishPreview, setShowPublishPreview] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Quick add suggestion state
  const [quickAddHandle, setQuickAddHandle] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  // Add dev note state
  const [newNoteDate, setNewNoteDate] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteDescription, setNewNoteDescription] = useState('');
  const [newNoteType, setNewNoteType] = useState<'feature' | 'fix' | 'improvement' | 'refactor'>('feature');
  const [addNoteLoading, setAddNoteLoading] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Page management state
  interface PageConfig {
    path: string;
    name: string;
    category: string;
    status: 'live' | 'paused' | 'testing' | 'maintenance';
    updatedAt: string;
    message?: string;
  }
  const [pages, setPages] = useState<PageConfig[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pageUpdateLoading, setPageUpdateLoading] = useState<string | null>(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Sidebar effects
  useEffect(() => {
    setSidebarMounted(true);
  }, []);

  const isSidebarExpandedTop = !sidebarCollapsed || sidebarHover;
  useEffect(() => {
    if (isSidebarExpandedTop) {
      document.body.classList.remove('sidebar-collapsed');
      document.body.classList.add('sidebar-expanded');
    } else {
      document.body.classList.remove('sidebar-expanded');
      document.body.classList.add('sidebar-collapsed');
    }
    return () => {
      document.body.classList.remove('sidebar-collapsed', 'sidebar-expanded');
    };
  }, [isSidebarExpandedTop]);

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

  // Fetch analytics when tab is active
  useEffect(() => {
    if (isAuthed && activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [isAuthed, activeTab]);

  // Fetch pages when tab is active
  useEffect(() => {
    if (isAuthed && activeTab === 'pages') {
      fetchPages();
    }
  }, [isAuthed, activeTab]);

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

  const fetchAnalytics = async () => {
    if (!isAuthed || !address) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { 'x-wallet-address': address },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchPages = async () => {
    if (!isAuthed || !address) return;
    setPagesLoading(true);
    try {
      const res = await fetch('/api/admin/pages', {
        headers: { 'x-wallet-address': address },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPages(data.pages || []);
    } catch (err) {
      console.error('Error fetching pages:', err);
    } finally {
      setPagesLoading(false);
    }
  };

  const updatePageStatus = async (path: string, status: 'live' | 'paused' | 'testing' | 'maintenance', message?: string) => {
    if (!isAuthed || !address) return;
    setPageUpdateLoading(path);
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ path, status, message }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Update local state
      setPages(prev => prev.map(p => p.path === path ? { ...p, status, updatedAt: data.page.updatedAt, message } : p));
    } catch (err) {
      console.error('Error updating page:', err);
      setError('Failed to update page status');
    } finally {
      setPageUpdateLoading(null);
    }
  };

  const addNewDevNote = async () => {
    if (!isAuthed || !address || !newNoteTitle.trim() || !newNoteDescription.trim()) return;
    setAddNoteLoading(true);
    try {
      const date = newNoteDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const res = await fetch('/api/admin/dev-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          date,
          title: newNoteTitle.trim(),
          description: newNoteDescription.trim(),
          type: newNoteType,
          status: 'pending',
        }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      // Clear form and refresh
      setNewNoteTitle('');
      setNewNoteDescription('');
      setNewNoteType('feature');
      setShowAddNote(false);
      fetchDevNotes();
    } catch (err) {
      console.error('Error adding dev note:', err);
      setError('Failed to add dev note');
    } finally {
      setAddNoteLoading(false);
    }
  };

  const deleteDevNote = async (id: number) => {
    if (!isAuthed || !address) return;
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

  const rejectDevNote = async (id: number) => {
    if (!isAuthed || !address) return;
    try {
      const res = await fetch('/api/admin/dev-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
        body: JSON.stringify({ id, status: 'rejected' }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      // Remove from current view (can be seen in rejected tab)
      setDevNotes(prev => prev.filter(n => n.id !== id));
      setSelectedNotes(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Error rejecting dev note:', err);
      setError('Failed to reject dev note');
    }
  };

  const editSingleNote = async (noteId: number, instruction: string) => {
    if (!isAuthed || !address || !instruction.trim()) return;
    const note = devNotes.find(n => n.id === noteId);
    if (!note) return;

    setEditLoading(true);
    try {
      const res = await fetch('/api/admin/dev-notes/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
        body: JSON.stringify({
          notes: [{ title: note.title, description: note.description, type: note.type }],
          instruction,
        }),
      });
      const data = await res.json();
      if (data.edited && data.edited.length > 0) {
        const edited = data.edited[0];
        // Update the note directly
        await fetch('/api/admin/dev-notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
          body: JSON.stringify({
            id: noteId,
            title: edited.title,
            description: edited.description,
          }),
        });
        setDevNotes(prev => prev.map(n => n.id === noteId ? { ...n, title: edited.title, description: edited.description } : n));
      }
      setEditingNoteId(null);
      setEditInstruction('');
    } catch (err) {
      console.error('Error editing note:', err);
      setError('Failed to edit note');
    } finally {
      setEditLoading(false);
    }
  };

  const publishApprovedNotes = async () => {
    if (!isAuthed || !address) return;
    const approvedNotes = devNotes.filter(n => n.status === 'approved');
    if (approvedNotes.length === 0) return;

    try {
      // Update all approved notes to 'published' status
      for (const note of approvedNotes) {
        await fetch('/api/admin/dev-notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
          body: JSON.stringify({ id: note.id, status: 'published' }),
        });
      }
      setShowPublishPreview(false);
      fetchDevNotes();
    } catch (err) {
      console.error('Error publishing notes:', err);
      setError('Failed to publish notes');
    }
  };

  // Chat with AI to edit notes by reference number
  const handleAiChat = async () => {
    if (!isAuthed || !address || !aiInstruction.trim()) return;

    // When chat is visible, we're on pending filter, so devNotes = pending notes
    const pendingNotes = devNotes;
    const userMessage = aiInstruction.trim();

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiInstruction('');
    setAiLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);

    try {
      // Parse which notes are referenced (e.g., "#1", "note 2", "1,2,3", "all")
      const allMatch = /\ball\b/i.test(userMessage);
      const numberMatches = userMessage.match(/#?(\d+)/g);

      let targetNotes: DevNote[] = [];
      let targetNumbers: number[] = [];

      if (pendingNotes.length > 0) {
        if (allMatch) {
          targetNotes = pendingNotes;
          targetNumbers = pendingNotes.map((_, i) => i + 1);
        } else if (numberMatches) {
          const numbers = numberMatches.map(m => parseInt(m.replace('#', '')));
          targetNumbers = numbers.filter(n => n >= 1 && n <= pendingNotes.length);
          targetNotes = targetNumbers.map(n => pendingNotes[n - 1]);
        }
      }

      if (targetNotes.length === 0) {
        // No specific notes referenced - use general chat
        try {
          const chatRes = await fetch('/api/admin/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
            body: JSON.stringify({
              message: userMessage,
              chatHistory: chatMessages.slice(-10),
              context: `Admin dashboard - Developer Notes section. There are ${pendingNotes.length} pending notes.`,
            }),
          });
          const chatData = await chatRes.json();
          if (chatData.error) {
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `Error: ${chatData.error}`
            }]);
          } else {
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: chatData.response || 'Sorry, I could not process that request.'
            }]);
          }
        } catch (chatErr) {
          console.error('Chat error:', chatErr);
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Sorry, I could not connect to the chat service.'
          }]);
        }
        setAiLoading(false);
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 50);
        return;
      }

      // Send to AI for editing
      const res = await fetch('/api/admin/dev-notes/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
        body: JSON.stringify({
          notes: targetNotes.map(n => ({ id: n.id, title: n.title, description: n.description, type: n.type })),
          instruction: userMessage,
          chatHistory: chatMessages.slice(-6),
        }),
      });
      const data = await res.json();

      if (data.error) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error from AI: ${data.error}`
        }]);
        setAiLoading(false);
        return;
      }

      if (data.edited && data.edited.length > 0) {
        const editCount = Math.min(data.edited.length, targetNotes.length);

        for (let i = 0; i < editCount; i++) {
          const edited = data.edited[i];
          const originalNote = targetNotes[i];
          if (!originalNote || !edited) continue;

          const patchRes = await fetch('/api/admin/dev-notes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
            body: JSON.stringify({
              id: originalNote.id,
              title: edited.title,
              description: edited.description,
            }),
          });
          if (!patchRes.ok) {
            const patchData = await patchRes.json();
            throw new Error(patchData.error || 'Failed to save note');
          }

          // Update local state immediately for this note
          setDevNotes(prev => prev.map(n =>
            n.id === originalNote.id
              ? { ...n, title: edited.title, description: edited.description }
              : n
          ));
        }

        // Add AI response to chat with preview of changes
        const editedList = targetNumbers.map(n => `#${n}`).join(', ');
        const preview = data.edited[0] ? `"${data.edited[0].title}" - "${data.edited[0].description.substring(0, 60)}..."` : '';
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Updated ${editedList}: ${preview}`
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: 'I tried to edit the notes but something went wrong. Please try again.'
        }]);
      }
    } catch (err) {
      console.error('Error in AI chat:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
    } finally {
      setAiLoading(false);
      // Scroll to bottom after response
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 50);
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
    // Explicit "project" keyword → project
    if (source.includes('project')) return false;
    // Explicit person keywords → person (including "follow" since recommended-follows are people)
    if (source.includes('people') || source.includes('person') || source.includes('build-your-team') || source.includes('follow')) return true;
    // Ambiguous → default to project
    return false;
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
              <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 40, width: 'auto' }} />
              <span style={{ color: '#2edb84', fontWeight: 600, fontSize: '0.9rem' }}>Developer Portal</span>
            </div>
            <a
              href="/"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: '0.85rem',
              }}
            >
              Back to Site
            </a>
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

  const devNavItems = [
    { id: 'suggestions' as const, label: 'Suggestions', icon: <SuggestionsIcon /> },
    { id: 'dev-notes' as const, label: 'Dev Notes', icon: <DevNotesIcon /> },
    { id: 'analytics' as const, label: 'Analytics', icon: <AnalyticsIcon /> },
    { id: 'pages' as const, label: 'Pages', icon: <PagesIcon /> },
  ];

  // Mobile menu elements
  const mobileElements = sidebarMounted ? (
    <>
      <div className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
            <span /><span /><span />
          </span>
        </button>
        <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 28 }} />
        </a>
        <span style={{ color: '#2edb84', fontSize: '0.75rem', fontWeight: 600 }}>DEV</span>
      </div>
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <button className="mobile-close" onClick={() => setMobileMenuOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="mobile-menu-links">
          <span className="mobile-section">Developer Portal</span>
          {devNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
              className={`mobile-link ${activeTab === item.id ? 'active' : ''}`}
            >
              <span className="mobile-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <div className="mobile-divider" />
          <a href="/" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
            <span className="mobile-link-icon"><BackIcon /></span>
            <span>Back to Site</span>
          </a>
          <button onClick={handleLogout} className="mobile-link" style={{ color: '#ff6b6b' }}>
            <span className="mobile-link-icon"><LogoutIcon /></span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* Mobile elements via portal */}
      {sidebarMounted && createPortal(mobileElements, document.body)}

      {/* Desktop Sidebar */}
      <nav
        className={`sidebar ${!isSidebarExpandedTop ? 'collapsed' : ''}`}
        onMouseEnter={() => sidebarCollapsed && setSidebarHover(true)}
        onMouseLeave={() => setSidebarHover(false)}
      >
        <div className="sidebar-brand">
          <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={isSidebarExpandedTop ? "/ZaddyToolsPFPandLogo.png" : "/ZaddyPFP.png"}
              alt="ZaddyTools"
              className="sidebar-logo-combo"
              style={{ cursor: 'pointer', height: isSidebarExpandedTop ? '36px' : '32px', width: 'auto', transition: 'all 0.2s' }}
            />
          </a>
          {isSidebarExpandedTop && (
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title="Collapse menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>

        <div className="sidebar-links">
          <span className="sidebar-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isSidebarExpandedTop ? 'flex-start' : 'center' }}>
            {isSidebarExpandedTop ? 'Developer Portal' : 'DEV'}
          </span>

          {devNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              title={item.label}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}

          {isSidebarExpandedTop && <div className="sidebar-divider" />}

          <a
            href="/"
            className="sidebar-link"
            title="Back to Site"
          >
            <span className="sidebar-icon"><BackIcon /></span>
            <span className="sidebar-label">Back to Site</span>
          </a>

          <button
            onClick={handleLogout}
            className="sidebar-link"
            title="Logout"
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#ff6b6b' }}
          >
            <span className="sidebar-icon"><LogoutIcon /></span>
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </nav>

      <main className="container">
        <div style={{ paddingTop: '1rem' }}>

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
              <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
                {/* Notes Section - Scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
                {/* Filter Bar */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(['pending', 'approved', 'published', 'rejected', 'all'] as const).map((f) => (
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
                    onClick={() => setShowAddNote(!showAddNote)}
                    style={{
                      marginLeft: 'auto',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: showAddNote ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.8)',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {showAddNote ? 'Cancel' : '+ Add Note'}
                  </button>
                  <button
                    onClick={fetchDevNotes}
                    style={{
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
                  {devNotesFilter === 'approved' && devNotes.filter(n => n.status === 'approved').length > 0 && (
                    <button
                      onClick={() => setShowPublishPreview(true)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#2edb84',
                        color: '#000',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Preview & Publish
                    </button>
                  )}
                </div>

                {/* Publish Preview Modal */}
                {showPublishPreview && (() => {
                  const approvedNotes = devNotes.filter(n => n.status === 'approved');
                  const sensitiveNotes = approvedNotes.filter(n => checkSensitiveContent(n.title, n.description).hasSensitive);
                  const hasSensitiveContent = sensitiveNotes.length > 0;

                  return (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '1.5rem',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${hasSensitiveContent ? 'rgba(255, 165, 0, 0.5)' : 'rgba(46, 219, 132, 0.3)'}`,
                    borderRadius: '12px',
                  }}>
                    {hasSensitiveContent && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        marginBottom: '1rem',
                        background: 'rgba(255, 165, 0, 0.15)',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '8px',
                      }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#ffa500', fontWeight: 600 }}>
                          ⚠ Warning: {sensitiveNotes.length} note{sensitiveNotes.length > 1 ? 's' : ''} flagged as potentially sensitive
                        </p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'rgba(255, 165, 0, 0.8)' }}>
                          Review notes marked with ⚠ SENSITIVE before publishing. You can still publish after manual review.
                        </p>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: hasSensitiveContent ? '#ffa500' : '#2edb84' }}>
                        Publish Preview ({approvedNotes.length} notes)
                      </h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setShowPublishPreview(false)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (hasSensitiveContent) {
                              if (confirm(`⚠️ ${sensitiveNotes.length} note(s) have sensitive content warnings.\n\nAre you sure you want to publish anyway?`)) {
                                publishApprovedNotes();
                              }
                            } else {
                              publishApprovedNotes();
                            }
                          }}
                          style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            border: hasSensitiveContent ? '1px solid rgba(255, 165, 0, 0.5)' : 'none',
                            background: hasSensitiveContent ? 'rgba(255, 165, 0, 0.2)' : '#2edb84',
                            color: hasSensitiveContent ? '#ffa500' : '#000',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {hasSensitiveContent ? `Publish Anyway (${sensitiveNotes.length} ⚠️)` : 'Publish All'}
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
                      This is how the notes will appear on the public Developer Notes page:
                    </p>
                    {/* Preview in exact public format */}
                    {(() => {
                      const grouped: { [date: string]: DevNote[] } = {};
                      approvedNotes.forEach(note => {
                        const date = note.date || 'No date';
                        if (!grouped[date]) grouped[date] = [];
                        grouped[date].push(note);
                      });

                      const typeColors: Record<string, { bg: string; text: string }> = {
                        feature: { bg: 'rgba(46, 219, 132, 0.15)', text: '#2edb84' },
                        fix: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
                        improvement: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
                        refactor: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
                      };

                      return Object.entries(grouped).map(([date, notes]) => (
                        <div
                          key={date}
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(46, 219, 132, 0.3)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            marginBottom: '0.75rem',
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
                            <h4 style={{
                              fontSize: '1.1rem',
                              fontWeight: 600,
                              color: '#2edb84',
                              margin: 0,
                            }}>
                              {date}
                            </h4>
                            <span style={{
                              marginLeft: 'auto',
                              fontSize: '0.75rem',
                              color: 'rgba(255,255,255,0.4)',
                            }}>
                              {notes.length} update{notes.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {notes.map((note) => (
                              <div
                                key={note.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.75rem',
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                    <h5 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{note.title}</h5>
                                    <span style={{
                                      fontSize: '0.6rem',
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                      padding: '0.2rem 0.4rem',
                                      borderRadius: '4px',
                                      background: typeColors[note.type]?.bg || 'rgba(168, 85, 247, 0.15)',
                                      color: typeColors[note.type]?.text || '#a855f7',
                                      flexShrink: 0,
                                    }}>
                                      {note.type}
                                    </span>
                                  </div>
                                  <p style={{
                                    fontSize: '0.8rem',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    margin: 0,
                                    lineHeight: 1.4,
                                  }}>
                                    {note.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  );
                })()}

                {/* Add Note Form */}
                {showAddNote && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '8px',
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Date (e.g., February 17, 2025)"
                        value={newNoteDate}
                        onChange={(e) => setNewNoteDate(e.target.value)}
                        style={{
                          flex: '1 1 200px',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(0,0,0,0.3)',
                          color: '#fff',
                          fontSize: '0.85rem',
                        }}
                      />
                      <select
                        value={newNoteType}
                        onChange={(e) => setNewNoteType(e.target.value as typeof newNoteType)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(0,0,0,0.3)',
                          color: '#fff',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value="feature">Feature</option>
                        <option value="fix">Fix</option>
                        <option value="improvement">Improvement</option>
                        <option value="refactor">Refactor</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Title"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginBottom: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    />
                    <textarea
                      placeholder="Description"
                      value={newNoteDescription}
                      onChange={(e) => setNewNoteDescription(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginBottom: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        resize: 'vertical',
                      }}
                    />
                    <button
                      onClick={addNewDevNote}
                      disabled={addNoteLoading || !newNoteTitle.trim() || !newNoteDescription.trim()}
                      style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: (!newNoteTitle.trim() || !newNoteDescription.trim()) ? 'rgba(46, 219, 132, 0.3)' : '#2edb84',
                        color: '#000',
                        fontWeight: 600,
                        cursor: addNoteLoading ? 'wait' : 'pointer',
                        opacity: addNoteLoading ? 0.6 : 1,
                      }}
                    >
                      {addNoteLoading ? 'Adding...' : 'Add Note'}
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
                        // Group notes by date but track global index for reference numbers
                        const grouped: { [date: string]: { note: DevNote; globalIndex: number }[] } = {};
                        let globalIdx = 0;
                        devNotes.forEach(note => {
                          const date = note.date || 'No date';
                          if (!grouped[date]) grouped[date] = [];
                          globalIdx++;
                          grouped[date].push({ note, globalIndex: globalIdx });
                        });

                        return Object.entries(grouped).map(([date, notesWithIndex]) => (
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
                            {notesWithIndex.map(({ note, globalIndex }) => (
                              <React.Fragment key={note.id}>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.75rem',
                                  padding: '0.6rem 1rem',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  background: 'transparent',
                                  alignItems: 'center',
                                }}
                              >
                                {/* Reference number */}
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: 'rgba(168, 85, 247, 0.8)',
                                  minWidth: '20px',
                                  flexShrink: 0,
                                }}>
                                  #{globalIndex}
                                </span>

                                {/* Content - compact */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {(() => {
                                    const sensitiveCheck = checkSensitiveContent(note.title, note.description);
                                    return (
                                      <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{note.title}</span>
                                          {/* Type badge - after title */}
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
                                          {note.status === 'rejected' && (
                                            <span style={{
                                              fontSize: '0.5rem',
                                              fontWeight: 600,
                                              padding: '0.1rem 0.3rem',
                                              borderRadius: '3px',
                                              background: 'rgba(255, 107, 107, 0.15)',
                                              color: '#ff6b6b',
                                            }}>
                                              REJECTED
                                            </span>
                                          )}
                                          {sensitiveCheck.hasSensitive && (
                                            <span
                                              title={sensitiveCheck.reasons.join(', ')}
                                              style={{
                                                fontSize: '0.5rem',
                                                fontWeight: 600,
                                                padding: '0.1rem 0.3rem',
                                                borderRadius: '3px',
                                                background: 'rgba(255, 165, 0, 0.2)',
                                                color: '#ffa500',
                                                cursor: 'help',
                                              }}
                                            >
                                              ⚠ SENSITIVE
                                            </span>
                                          )}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {note.description}
                                        </p>
                                        {sensitiveCheck.hasSensitive && (
                                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.65rem', color: '#ffa500', lineHeight: 1.2 }}>
                                            Issues: {sensitiveCheck.reasons.join(', ')}
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                  {note.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          // One-click approve
                                          fetch('/api/admin/dev-notes', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json', 'x-wallet-address': address || '' },
                                            body: JSON.stringify({ id: note.id, status: 'approved' }),
                                          }).then(() => {
                                            setDevNotes(prev => prev.filter(n => n.id !== note.id));
                                          });
                                        }}
                                        style={{
                                          padding: '0.2rem 0.4rem',
                                          borderRadius: '4px',
                                          border: 'none',
                                          background: 'rgba(46, 219, 132, 0.15)',
                                          color: '#2edb84',
                                          fontSize: '0.65rem',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingNoteId(editingNoteId === note.id ? null : note.id);
                                          setEditInstruction('');
                                        }}
                                        style={{
                                          padding: '0.2rem 0.4rem',
                                          borderRadius: '4px',
                                          border: 'none',
                                          background: editingNoteId === note.id ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.15)',
                                          color: '#a855f7',
                                          fontSize: '0.65rem',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Edit
                                      </button>
                                    </>
                                  )}
                                  {note.status !== 'rejected' && (
                                    <button
                                      onClick={() => rejectDevNote(note.id)}
                                      style={{
                                        padding: '0.2rem 0.4rem',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: 'rgba(255, 193, 7, 0.15)',
                                        color: '#ffc107',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Reject
                                    </button>
                                  )}
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
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {/* Inline Edit Input */}
                              {editingNoteId === note.id && (
                                <div style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  padding: '0.5rem 1rem 0.75rem 1rem',
                                  marginLeft: note.status === 'pending' ? '24px' : '0',
                                  borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
                                  background: 'rgba(168, 85, 247, 0.05)',
                                }}>
                                  <input
                                    type="text"
                                    placeholder="Describe how to edit this note..."
                                    value={editInstruction}
                                    onChange={(e) => setEditInstruction(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && editInstruction.trim() && editSingleNote(note.id, editInstruction)}
                                    style={{
                                      flex: 1,
                                      padding: '0.4rem 0.6rem',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(168, 85, 247, 0.3)',
                                      background: 'rgba(0,0,0,0.3)',
                                      color: '#fff',
                                      fontSize: '0.8rem',
                                      outline: 'none',
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => editSingleNote(note.id, editInstruction)}
                                    disabled={!editInstruction.trim() || editLoading}
                                    style={{
                                      padding: '0.4rem 0.75rem',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: !editInstruction.trim() ? 'rgba(168, 85, 247, 0.3)' : '#a855f7',
                                      color: '#fff',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: !editInstruction.trim() || editLoading ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    {editLoading ? 'Editing...' : 'Apply'}
                                  </button>
                                  <button
                                    onClick={() => { setEditingNoteId(null); setEditInstruction(''); }}
                                    style={{
                                      padding: '0.4rem 0.6rem',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      background: 'transparent',
                                      color: 'rgba(255,255,255,0.6)',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                              </React.Fragment>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                </div>

                {/* AI Chat Interface - Fixed at bottom */}
                {devNotesFilter === 'pending' && (
                  <div style={{
                    flexShrink: 0,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '12px',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(10px)',
                  }}>
                    {/* Chat Messages */}
                    {chatMessages.length > 0 && (
                      <div
                        ref={chatContainerRef}
                        style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
                        }}
                      >
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <div style={{
                              maxWidth: '80%',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '12px',
                              background: msg.role === 'user'
                                ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
                                : 'rgba(255,255,255,0.1)',
                              color: '#fff',
                              fontSize: '0.8rem',
                              lineHeight: 1.4,
                              whiteSpace: 'pre-wrap',
                            }}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {aiLoading && (
                          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{
                              padding: '0.5rem 0.75rem',
                              borderRadius: '12px',
                              background: 'rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '0.8rem',
                            }}>
                              Thinking...
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Input Bar */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      padding: '0.75rem',
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
                        placeholder={chatMessages.length === 0 ? "Edit notes with AI... (e.g. 'make #1 shorter' or 'fix all')" : "Reply..."}
                        value={aiInstruction}
                        onChange={(e) => setAiInstruction(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && aiInstruction.trim() && !aiLoading && handleAiChat()}
                        disabled={aiLoading}
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
                        onClick={handleAiChat}
                        disabled={!aiInstruction.trim() || aiLoading}
                        style={{
                          padding: '0.6rem 1.25rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: !aiInstruction.trim() || aiLoading ? 'rgba(168, 85, 247, 0.3)' : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: !aiInstruction.trim() || aiLoading ? 'not-allowed' : 'pointer',
                          opacity: aiLoading ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        {aiLoading ? (
                          'Processing...'
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
                      {chatMessages.length > 0 && (
                        <button
                          onClick={() => setChatMessages([])}
                          style={{
                            padding: '0.6rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Clear chat"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Website Analytics</h3>
              <button
                onClick={fetchAnalytics}
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

            {analyticsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Loading analytics...
              </div>
            ) : !analyticsData ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                No analytics data available
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2edb84' }}>{analyticsData.stats.todayViews}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Today</div>
                  </div>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{analyticsData.stats.weekViews}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>This Week</div>
                  </div>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#a855f7' }}>{analyticsData.stats.monthViews}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>This Month</div>
                  </div>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f97316' }}>{analyticsData.stats.totalViews}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>All Time</div>
                  </div>
                </div>

                {/* Chart - Views Over Time */}
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Views (Last 14 Days)</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                    {analyticsData.dailyData.map((day, i) => {
                      const maxViews = Math.max(...analyticsData.dailyData.map(d => d.views), 1);
                      const height = (day.views / maxViews) * 100;
                      return (
                        <div
                          key={day.date}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: `${Math.max(height, 2)}%`,
                              background: i === analyticsData.dailyData.length - 1 ? '#2edb84' : 'rgba(46, 219, 132, 0.5)',
                              borderRadius: '2px 2px 0 0',
                              minHeight: '4px',
                              transition: 'height 0.3s ease',
                            }}
                            title={`${day.date}: ${day.views} views`}
                          />
                          <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                            {day.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Two Column Layout for Page Views and Tool Usage */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {/* Page Views */}
                  <div className="card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Top Pages</h4>
                    {analyticsData.pageViews.length === 0 ? (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No page data yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {analyticsData.pageViews.map((pv, i) => (
                          <div key={pv.page} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', width: '18px' }}>{i + 1}.</span>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${(pv.count / analyticsData.pageViews[0].count) * 100}%`,
                                  background: 'rgba(59, 130, 246, 0.3)',
                                  padding: '0.4rem 0.6rem',
                                  fontSize: '0.8rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {pv.page || '/'}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3b82f6', minWidth: '40px', textAlign: 'right' }}>{pv.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tool Usage */}
                  <div className="card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Tool Usage</h4>
                    {analyticsData.toolUsage.length === 0 ? (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No tool usage data yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {analyticsData.toolUsage.map((tu, i) => (
                          <div key={tu.tool} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', width: '18px' }}>{i + 1}.</span>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${(tu.count / analyticsData.toolUsage[0].count) * 100}%`,
                                  background: 'rgba(168, 85, 247, 0.3)',
                                  padding: '0.4rem 0.6rem',
                                  fontSize: '0.8rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {tu.tool}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a855f7', minWidth: '40px', textAlign: 'right' }}>{tu.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Page Management</h3>
              <button
                onClick={fetchPages}
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

            {pagesLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Loading pages...
              </div>
            ) : pages.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                No pages found
              </div>
            ) : (
              <>
                {/* Status Legend */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2edb84' }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Live</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316' }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Testing</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fbbf24' }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Paused</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Maintenance</span>
                  </div>
                </div>

                {/* Pages grouped by category */}
                {['Main', 'Abstract', 'Other'].map(category => {
                  const categoryPages = pages.filter(p => p.category === category);
                  if (categoryPages.length === 0) return null;
                  return (
                    <div key={category} style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {category}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {categoryPages.map(page => {
                          const statusColors: Record<string, string> = {
                            live: '#2edb84',
                            testing: '#f97316',
                            paused: '#fbbf24',
                            maintenance: '#ef4444',
                          };
                          const isUpdating = pageUpdateLoading === page.path;
                          return (
                            <div
                              key={page.path}
                              className="card"
                              style={{
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                opacity: isUpdating ? 0.6 : 1,
                              }}
                            >
                              {/* Status indicator */}
                              <div
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: statusColors[page.status] || '#666',
                                  flexShrink: 0,
                                }}
                              />

                              {/* Page info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{page.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{page.path}</div>
                                {page.message && (
                                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                                    {page.message}
                                  </div>
                                )}
                              </div>

                              {/* Status buttons */}
                              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                {(['live', 'testing', 'paused', 'maintenance'] as const).map(status => (
                                  <button
                                    key={status}
                                    onClick={() => updatePageStatus(page.path, status)}
                                    disabled={isUpdating || page.status === status}
                                    style={{
                                      padding: '0.35rem 0.6rem',
                                      borderRadius: '4px',
                                      border: page.status === status
                                        ? `2px solid ${statusColors[status]}`
                                        : '1px solid rgba(255,255,255,0.15)',
                                      background: page.status === status
                                        ? `${statusColors[status]}20`
                                        : 'transparent',
                                      color: page.status === status
                                        ? statusColors[status]
                                        : 'rgba(255,255,255,0.5)',
                                      fontSize: '0.7rem',
                                      fontWeight: page.status === status ? 600 : 400,
                                      cursor: isUpdating || page.status === status ? 'default' : 'pointer',
                                      textTransform: 'capitalize',
                                      opacity: isUpdating ? 0.5 : 1,
                                    }}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
    </>
  );
}
