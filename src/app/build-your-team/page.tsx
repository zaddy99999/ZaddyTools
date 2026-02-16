'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import NavBar from '@/components/NavBar';

interface Person {
  handle: string;
  name?: string;
  category?: string;
  priority?: boolean;
}

interface Tier {
  id: string;
  price: number;
  slots: (Person | null)[]; // Always 5 slots, null = empty
}

// All images are stored locally in /public/pfp/ - no external API calls needed
const getAvatar = (handle: string) => `/pfp/${handle.toLowerCase()}.jpg`;

// Fallback chain: local pfp -> unavatar.io -> dicebear
const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>, handle: string) => {
  const target = e.target as HTMLImageElement;
  const currentSrc = target.src;

  // If local pfp failed, try unavatar.io
  if (currentSrc.includes('/pfp/')) {
    target.src = `https://unavatar.io/twitter/${handle}`;
    return;
  }

  // If unavatar failed, use dicebear
  if (currentSrc.includes('unavatar.io')) {
    target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${handle}`;
    return;
  }
};

type Mode = 'pick' | 'create';

export default function BuildYourTeam() {
  const [mode, setMode] = useState<Mode>('pick');
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Build Your Team');
  const [budget, setBudget] = useState(15);
  const [tiers, setTiers] = useState<Tier[]>([
    { id: '5', price: 5, slots: [null, null, null, null, null] },
    { id: '4', price: 4, slots: [null, null, null, null, null] },
    { id: '3', price: 3, slots: [null, null, null, null, null] },
    { id: '2', price: 2, slots: [null, null, null, null, null] },
    { id: '1', price: 1, slots: [null, null, null, null, null] },
  ]);
  const [selectedPicks, setSelectedPicks] = useState<Record<string, Person | null>>({});
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [isSpinning, setIsSpinning] = useState(false);
  const [draggedPerson, setDraggedPerson] = useState<{ person: Person; fromTierId?: string; fromSlotIndex?: number } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ tierId: string; slotIndex: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetch('/api/recommended-people')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Deduplicate by handle
          const seen = new Set<string>();
          const uniqueData = data.filter((p: Person) => {
            const key = p.handle.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setAllPeople(uniqueData);
          // Auto-distribute people into tiers on load
          distributePeople(uniqueData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Default top tier people (in order)
  const DEFAULT_TOP_TIER = ['zaddyfi', 'mariannehere', 'gmb_aob', 'mindfulmarketog', 'proofofely'];

  const distributePeople = (people: Person[]) => {
    // Deduplicate by handle
    const seen = new Set<string>();
    const uniquePeople = people.filter(p => {
      const key = p.handle.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Find default top tier people first
    const topTierPeople: Person[] = [];
    DEFAULT_TOP_TIER.forEach(handle => {
      const person = uniquePeople.find(p => p.handle.toLowerCase() === handle.toLowerCase());
      if (person) topTierPeople.push(person);
    });

    // Get remaining priority people (not in default top tier)
    const topTierHandles = new Set(topTierPeople.map(p => p.handle.toLowerCase()));
    const otherPriority = uniquePeople
      .filter(p => p.priority && !topTierHandles.has(p.handle.toLowerCase()))
      .sort((a, b) => a.handle.localeCompare(b.handle));

    // Combine: default top tier + other priority people
    const priority = [...topTierPeople, ...otherPriority];
    const nonPriority = uniquePeople
      .filter(p => !p.priority && !topTierHandles.has(p.handle.toLowerCase()))
      .sort((a, b) => a.handle.localeCompare(b.handle));

    // Helper to create 5-slot array
    const makeSlots = (arr: Person[]): (Person | null)[] => {
      const slots: (Person | null)[] = [null, null, null, null, null];
      arr.slice(0, 5).forEach((p, i) => { slots[i] = p; });
      return slots;
    };

    // Top 3 tiers ($5, $4, $3): priority people only
    // Bottom 2 tiers ($2, $1): non-priority people
    setTiers([
      { id: '5', price: 5, slots: makeSlots(priority.slice(0, 5)) },
      { id: '4', price: 4, slots: makeSlots(priority.slice(5, 10)) },
      { id: '3', price: 3, slots: makeSlots(priority.slice(10, 15)) },
      { id: '2', price: 2, slots: makeSlots(nonPriority.slice(0, 5)) },
      { id: '1', price: 1, slots: makeSlots(nonPriority.slice(5, 10)) },
    ]);

    // Reset picks
    setSelectedPicks({});
  };

  // Get all people currently in tiers
  const peopleInTiers = useMemo(() => {
    const handles = new Set<string>();
    tiers.forEach(tier => tier.slots.forEach(p => { if (p) handles.add(p.handle); }));
    return handles;
  }, [tiers]);

  // Pool = everyone not in a tier
  const poolPeople = useMemo(() => {
    return allPeople.filter(p => !peopleInTiers.has(p.handle));
  }, [allPeople, peopleInTiers]);

  // Selected handles
  const selectedHandles = new Set(
    Object.values(selectedPicks)
      .filter((p): p is Person => p !== null)
      .map(p => p.handle)
  );

  const totalSpent = Object.entries(selectedPicks)
    .filter(([, person]) => person !== null)
    .reduce((sum, [tierId]) => {
      const tier = tiers.find(t => t.id === tierId);
      return sum + (tier?.price || 0);
    }, 0);

  const teamSize = Object.values(selectedPicks).filter(p => p !== null).length;

  const handleSelect = (tierId: string, person: Person) => {
    setSelectedPicks(prev => ({
      ...prev,
      [tierId]: prev[tierId]?.handle === person.handle ? null : person,
    }));
  };

  const handleRandomize = () => {
    setIsSpinning(true);
    setTimeout(() => {
      // Deduplicate by handle
      const seen = new Set<string>();
      const uniquePeople = allPeople.filter(p => {
        const key = p.handle.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Find default top tier people first (keep them in top row)
      const topTierPeople: Person[] = [];
      DEFAULT_TOP_TIER.forEach(handle => {
        const person = uniquePeople.find(p => p.handle.toLowerCase() === handle.toLowerCase());
        if (person) topTierPeople.push(person);
      });

      // Shuffle remaining priority and non-priority separately
      const topTierHandles = new Set(topTierPeople.map(p => p.handle.toLowerCase()));
      const otherPriority = [...uniquePeople.filter(p => p.priority && !topTierHandles.has(p.handle.toLowerCase()))].sort(() => Math.random() - 0.5);
      const priority = [...topTierPeople, ...otherPriority];
      const nonPriority = [...uniquePeople.filter(p => !p.priority && !topTierHandles.has(p.handle.toLowerCase()))].sort(() => Math.random() - 0.5);

      // Helper to create 5-slot array
      const makeSlots = (arr: Person[]): (Person | null)[] => {
        const slots: (Person | null)[] = [null, null, null, null, null];
        arr.slice(0, 5).forEach((p, i) => { slots[i] = p; });
        return slots;
      };

      // Top 3 tiers ($5, $4, $3): priority people only
      // Bottom 2 tiers ($2, $1): non-priority people
      const newTiers = [
        { id: '5', price: 5, slots: makeSlots(priority.slice(0, 5)) },
        { id: '4', price: 4, slots: makeSlots(priority.slice(5, 10)) },
        { id: '3', price: 3, slots: makeSlots(priority.slice(10, 15)) },
        { id: '2', price: 2, slots: makeSlots(nonPriority.slice(0, 5)) },
        { id: '1', price: 1, slots: makeSlots(nonPriority.slice(5, 10)) },
      ];

      setTiers(newTiers);
      // Clear selections since everything changed
      setSelectedPicks({});
      setIsSpinning(false);
    }, 500);
  };

  const handleAddTier = () => {
    const newPrice = Math.max(...tiers.map(t => t.price), 0) + 1;
    const newId = `tier-${Date.now()}`;
    setTiers(prev => [{ id: newId, price: newPrice, slots: [null, null, null, null, null] }, ...prev]);
  };

  const handleDeleteTier = (tierId: string) => {
    if (tiers.length <= 1) return;
    setTiers(prev => prev.filter(t => t.id !== tierId));
    setSelectedPicks(prev => {
      const next = { ...prev };
      delete next[tierId];
      return next;
    });
  };

  const handleChangeTierPrice = (tierId: string, newPrice: number) => {
    setTiers(prev => prev.map(t => t.id === tierId ? { ...t, price: Math.max(1, newPrice) } : t));
  };

  const handleAddPersonToSlot = (tierId: string, slotIndex: number, person: Person) => {
    // Allow any person to be dragged anywhere (full creative freedom)
    setTiers(prev => {
      return prev.map(t => {
        const newSlots = [...t.slots];

        // First, clear any existing instance of this person from all slots (case-insensitive)
        newSlots.forEach((p, i) => {
          if (p && p.handle.toLowerCase() === person.handle.toLowerCase()) {
            // Don't clear if this is the target slot we're adding to
            if (!(t.id === tierId && i === slotIndex)) {
              newSlots[i] = null;
            }
          }
        });

        // Then, if this is the target tier, place the person in the slot
        if (t.id === tierId) {
          newSlots[slotIndex] = person;
        }

        return { ...t, slots: newSlots };
      });
    });
  };

  const handleRemovePersonFromSlot = (tierId: string, slotIndex: number) => {
    setTiers(prev => prev.map(t => {
      if (t.id !== tierId) return t;
      const newSlots = [...t.slots];
      const person = newSlots[slotIndex];
      newSlots[slotIndex] = null;

      // Also remove from picks if selected
      if (person && selectedPicks[tierId]?.handle === person.handle) {
        setSelectedPicks(p => ({ ...p, [tierId]: null }));
      }

      return { ...t, slots: newSlots };
    }));
  };

  // Drag and drop handlers
  const handleDragStart = (person: Person, fromTierId?: string, fromSlotIndex?: number) => {
    setDraggedPerson({ person, fromTierId, fromSlotIndex });
  };

  const handleDragEnd = () => {
    setDraggedPerson(null);
    setDragOverSlot(null);
  };

  const handleSlotDragOver = (e: React.DragEvent, tierId: string, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlot({ tierId, slotIndex });
  };

  const handleSlotDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleSlotDrop = (e: React.DragEvent, targetTierId: string, targetSlotIndex: number) => {
    e.preventDefault();
    if (!draggedPerson) {
      setDraggedPerson(null);
      setDragOverSlot(null);
      return;
    }

    const { person: draggedPersonData, fromTierId, fromSlotIndex } = draggedPerson;

    setTiers(prev => {
      // Find the person currently in the target slot (if any)
      const targetTier = prev.find(t => t.id === targetTierId);
      const personInTargetSlot = targetTier?.slots[targetSlotIndex] || null;

      return prev.map(tier => {
        const newSlots = [...tier.slots];

        // If this is the SOURCE tier (where we dragged FROM)
        if (fromTierId && tier.id === fromTierId && fromSlotIndex !== undefined) {
          // If same tier and same slot, do nothing
          if (fromTierId === targetTierId && fromSlotIndex === targetSlotIndex) {
            return tier;
          }
          // Put the swapped person (from target) into the source slot
          newSlots[fromSlotIndex] = personInTargetSlot;
        }

        // If this is the TARGET tier (where we're dropping TO)
        if (tier.id === targetTierId) {
          newSlots[targetSlotIndex] = draggedPersonData;
        }

        return { ...tier, slots: newSlots };
      });
    });

    setDraggedPerson(null);
    setDragOverSlot(null);
  };

  const handleCopyTeam = async () => {
    if (!gridRef.current || copyStatus === 'copying') return;
    setCopyStatus('copying');

    try {
      // Convert all images to base64 first via proxy (for CORS)
      const images = gridRef.current.querySelectorAll('img');
      const originalSrcs: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        originalSrcs[i] = img.src;

        // Skip if already base64
        if (img.src.startsWith('data:')) continue;

        try {
          const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(img.src)}`);
          if (res.ok) {
            const blob = await res.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            img.src = base64;
          }
        } catch {
          // Keep original
        }
      }

      // Small delay for images to update
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
      });

      // Restore original sources
      for (let i = 0; i < images.length; i++) {
        images[i].src = originalSrcs[i];
      }

      // Copy to clipboard
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('No blob')), 'image/png');
      });

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to generate image:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const resetAll = () => {
    setSelectedPicks({});
    distributePeople(allPeople);
  };

  // Template definitions - pre-made board configurations
  interface Template {
    id: string;
    name: string;
    description: string;
    budget: number;
    title: string;
    // Handle names for each tier (will be matched against allPeople)
    tierHandles: string[][];
  }

  const templates: Template[] = [
    {
      id: 'og-crew',
      name: 'OG Crew',
      description: 'The original Abstract legends',
      budget: 15,
      title: 'Build Your Dream Team',
      tierHandles: [
        ['zaddyfi', 'mariannehere', 'gmb_aob', 'mindfulmarketog', 'proofofely'],
        ['0xcygaar', 'thepeengwin', 'brianhong', 'coffeedev', 'web3karina'],
        ['crypto3rain', 'flewtrades', 'nathnnfts', 'dreweth', 'heynat'],
        ['boredpengubull', 'cashbowie', 'deko1x', 'ejrweb3', 'lucanetz'],
        ['azino_x', 'badlynasty', 'bearypower', 'crisnochris', 'dailax'],
      ],
    },
    {
      id: 'alpha-hunters',
      name: 'Alpha Hunters',
      description: 'Top alpha callers',
      budget: 15,
      title: 'Alpha Hunter Squad',
      tierHandles: [
        ['mindfulmarketog', 'proofofely', 'flewtrades', 'crypto3rain', 'cyrotrading'],
        ['zaddyfi', 'gmb_aob', '0xcygaar', 'thepeengwin', 'dreweth'],
        ['mariannehere', 'brianhong', 'coffeedev', 'nathnnfts', 'heynat'],
        ['intelligenceiy', 'jpgkenny', 'karuptkp', 'maxdesigns16', 'nftriles'],
        ['red__crypto', 'salamander12_', 'sauciii', 'shivst3r', 'wiredwisely'],
      ],
    },
    {
      id: 'community-vibes',
      name: 'Community Vibes',
      description: 'Best community builders',
      budget: 15,
      title: 'Community All-Stars',
      tierHandles: [
        ['mariannehere', 'web3karina', 'thepeengwin', 'heynat', 'zaddyfi'],
        ['gmb_aob', 'brianhong', 'mindfulmarketog', 'proofofely', 'coffeedev'],
        ['0xcygaar', 'nathnnfts', 'flewtrades', 'crypto3rain', 'dreweth'],
        ['lola03art', 'jennn_sol', 'justmeg', 'magicmikeeditss', 'toriribolla'],
        ['elenionchain', 'ghayzal_sol', 'hoangry', 'lilstaffx', 'meta_tomix'],
      ],
    },
  ];

  const loadTemplate = (template: Template) => {
    // Helper to find person by handle
    const findPerson = (handle: string): Person | null => {
      return allPeople.find(p => p.handle.toLowerCase() === handle.toLowerCase()) || null;
    };

    // Build tiers from template
    const newTiers: Tier[] = template.tierHandles.map((handles, index) => {
      const price = 5 - index; // $5, $4, $3, $2, $1
      const slots: (Person | null)[] = [null, null, null, null, null];
      handles.slice(0, 5).forEach((handle, i) => {
        slots[i] = findPerson(handle);
      });
      return { id: String(price), price, slots };
    });

    setTiers(newTiers);
    setTitle(template.title);
    setBudget(template.budget);
    setSelectedPicks({});
  };

  return (
    <>
      <NavBar />
      <main className="build-team-page">
        {/* Mode Toggle */}
        <div className="mode-toggle-container">
          <button
            className={`mode-toggle-btn ${mode === 'pick' ? 'active' : ''}`}
            onClick={() => setMode('pick')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Select Your Team
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Create Team Builder
          </button>
        </div>

        {/* Copyable graphic area */}
        <div className={`build-team-container ${copyStatus === 'copying' ? 'copying-mode' : ''}`} ref={gridRef}>
          {/* Header with randomize button */}
          <div className="build-team-header">
            <div className="header-left">
              <button
                className={`action-btn randomize-btn ${isSpinning ? 'spinning' : ''}`}
                onClick={handleRandomize}
                title="Randomize picks"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
                <span className="btn-text">Shuffle</span>
              </button>
            </div>
            <div className="header-center">
              <div className="title-display">{title}</div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="build-team-title-input"
                placeholder="Enter title..."
              />
              <p className="build-team-subtitle">
                Budget: $<input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Math.max(1, parseInt(e.target.value) || 1))}
                  className="budget-input"
                  min="1"
                />
              </p>
            </div>
            <div className="header-right">
              <div className="header-right-stack">
                <button
                  className={`action-btn copy-btn ${copyStatus === 'copied' ? 'copied' : ''} ${copyStatus === 'error' ? 'error' : ''}`}
                  onClick={handleCopyTeam}
                  disabled={copyStatus === 'copying'}
                  title="Copy as image"
                >
                  {copyStatus === 'copied' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      <span className="btn-text">Copied!</span>
                    </>
                  ) : copyStatus === 'error' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M15 9l-6 6M9 9l6 6"/>
                      </svg>
                      <span className="btn-text">Failed</span>
                    </>
                  ) : copyStatus === 'copying' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <span className="btn-text">Copying...</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      <span className="btn-text">Copy</span>
                    </>
                  )}
                </button>
                <div className={`spent-total ${totalSpent > budget ? 'over' : totalSpent === budget ? 'exact' : ''}`}>
                  ${totalSpent}/${budget}
                </div>
              </div>
            </div>
          </div>

          {/* Price Grid */}
          {loading ? (
            <div className="build-team-loading">Loading people...</div>
          ) : (
            <div className="price-tiers">
              {tiers.map(tier => (
                <div key={tier.id} className="price-tier-row">
                  {mode === 'create' && (
                    <button
                      className="delete-tier-btn"
                      onClick={() => handleDeleteTier(tier.id)}
                      title="Delete this row"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  )}
                  <div className={`price-label-container ${mode === 'pick' ? 'pick-mode' : ''}`}>
                    {mode === 'pick' ? (
                      <span className="price-label">${tier.price}</span>
                    ) : (
                      <>
                        <span className="price-dollar">$</span>
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => handleChangeTierPrice(tier.id, parseInt(e.target.value) || 1)}
                          className="price-input"
                          min="1"
                        />
                      </>
                    )}
                  </div>
                  <div className="tier-slots">
                    {tier.slots.map((person, slotIndex) => {
                      const isSelected = person && selectedPicks[tier.id]?.handle === person.handle;
                      const isDragOver = dragOverSlot?.tierId === tier.id && dragOverSlot?.slotIndex === slotIndex;
                      return (
                        <div
                          key={slotIndex}
                          className={`slot-box ${person ? 'filled' : 'empty'} ${isDragOver && mode === 'create' ? 'drag-over' : ''} ${isSelected ? 'selected' : ''}`}
                          onDragOver={mode === 'create' ? (e) => handleSlotDragOver(e, tier.id, slotIndex) : undefined}
                          onDragLeave={mode === 'create' ? handleSlotDragLeave : undefined}
                          onDrop={mode === 'create' ? (e) => handleSlotDrop(e, tier.id, slotIndex) : undefined}
                          onClick={() => person && handleSelect(tier.id, person)}
                        >
                          {person ? (
                            <>
                              <img
                                src={getAvatar(person.handle)}
                                alt={person.name || person.handle}
                                data-handle={person.handle}
                                className="slot-avatar"
                                draggable={mode === 'create'}
                                onDragStart={mode === 'create' ? () => handleDragStart(person, tier.id, slotIndex) : undefined}
                                onDragEnd={mode === 'create' ? handleDragEnd : undefined}
                                onError={(e) => handleAvatarError(e, person.handle)}
                              />
                              <span className="slot-name">{person.name || `@${person.handle}`}</span>
                              {isSelected && <div className="selected-check">✓</div>}
                              {mode === 'create' && (
                                <button
                                  className="remove-slot-btn"
                                  onClick={(e) => { e.stopPropagation(); handleRemovePersonFromSlot(tier.id, slotIndex); }}
                                  title="Remove"
                                >
                                  ×
                                </button>
                              )}
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Add tier button - only in create mode */}
              {mode === 'create' && (
                <button className="add-tier-btn" onClick={handleAddTier}>
                  + Add Tier
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="build-team-footer">
            <span>ZaddyTools</span>
          </div>
        </div>

        {/* Templates Section - Only in pick mode */}
        {mode === 'pick' && (
          <div className="templates-section">
            <div className="templates-header">
              <h3>Templates</h3>
              <p className="templates-hint">Choose a pre-made board to get started</p>
              <p className="templates-hint" style={{ color: '#f39c12', fontSize: '0.75rem', marginTop: '0.25rem' }}>(Work in progress - filler templates for now)</p>
            </div>
            <div className="templates-grid">
              {templates.map(template => (
                <button
                  key={template.id}
                  className="template-card"
                  onClick={() => loadTemplate(template)}
                >
                  <div className="template-preview">
                    {/* Show first 5 avatars from top tier */}
                    {template.tierHandles[0].slice(0, 5).map(handle => {
                      const person = allPeople.find(p => p.handle.toLowerCase() === handle.toLowerCase());
                      return person ? (
                        <img
                          key={handle}
                          src={getAvatar(person.handle)}
                          alt={person.name || person.handle}
                          className="template-avatar"
                          onError={(e) => handleAvatarError(e, handle)}
                        />
                      ) : null;
                    })}
                  </div>
                  <div className="template-info">
                    <span className="template-name">{template.name}</span>
                    <span className="template-desc">{template.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Character Pool - Only in create mode */}
        {mode === 'create' && (
          <div className="character-pool-section">
            <div className="pool-header">
              <h3>Character Pool ({poolPeople.length})</h3>
              <p className="pool-hint">Drag to add to a tier</p>
            </div>
            <div className="character-pool">
              {poolPeople.slice(0, 60).map(person => (
                <img
                  key={person.handle}
                  src={getAvatar(person.handle)}
                  alt={person.name || person.handle}
                  data-handle={person.handle}
                  className={`pool-avatar-item ${draggedPerson?.person.handle === person.handle ? 'dragging' : ''}`}
                  title={person.name || `@${person.handle}`}
                  draggable
                  onDragStart={() => handleDragStart(person)}
                  onDragEnd={handleDragEnd}
                  onError={(e) => handleAvatarError(e, person.handle)}
                />
              ))}
            </div>
          </div>
        )}

      </main>
    </>
  );
}
