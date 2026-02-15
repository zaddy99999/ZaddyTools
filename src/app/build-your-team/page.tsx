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

// Helper to get Twitter avatar
const getAvatar = (handle: string) => `/pfp/${handle.toLowerCase()}.jpg`;
const fallbackAvatar = (handle: string) => `https://unavatar.io/twitter/${handle}`;

export default function BuildYourTeam() {
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
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [isSpinning, setIsSpinning] = useState(false);
  const [draggedPerson, setDraggedPerson] = useState<{ person: Person; fromTierId?: string; fromSlotIndex?: number } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ tierId: string; slotIndex: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
  const DEFAULT_TOP_TIER = ['zaddy99999', 'mariannehere', 'gmb_aob', 'mindfulmarketog', 'proofofely'];

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

  const handleSlotDrop = (e: React.DragEvent, tierId: string, slotIndex: number) => {
    e.preventDefault();
    if (draggedPerson) {
      handleAddPersonToSlot(tierId, slotIndex, draggedPerson.person);
    }
    setDraggedPerson(null);
    setDragOverSlot(null);
  };

  const handleCopyTeam = async () => {
    if (!gridRef.current || copyStatus === 'copying') return;

    setCopyStatus('copying');

    // Wait a tick for the UI to update with copying mode styles
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Convert all images to base64 to avoid CORS issues
      const images = gridRef.current.querySelectorAll('img');
      const originalSrcs: Map<HTMLImageElement, string> = new Map();

      await Promise.all(
        Array.from(images).map(async (img) => {
          try {
            originalSrcs.set(img, img.src);
            const response = await fetch(img.src);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            img.src = base64;
          } catch {
            // If fetch fails (CORS), try via proxy or keep original
            try {
              const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
              const response = await fetch(proxyUrl);
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              img.src = base64;
            } catch {
              // Keep original if all fails
            }
          }
        })
      );

      // Small delay to let images update
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      // Restore original image sources immediately after capture
      originalSrcs.forEach((src, img) => {
        img.src = src;
      });

      // Convert canvas to blob and copy/download
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopyStatus('copied');
          setTimeout(() => setCopyStatus('idle'), 2000);
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'my-abstract-team.png';
          a.click();
          URL.revokeObjectURL(url);
          setCopyStatus('copied');
          setTimeout(() => setCopyStatus('idle'), 2000);
        }
      } else {
        setCopyStatus('idle');
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus('idle');
    }
  };

  const resetAll = () => {
    setSelectedPicks({});
    distributePeople(allPeople);
  };

  return (
    <>
      <NavBar />
      <main className="build-team-page">
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
                <span>Shuffle</span>
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
                  className={`action-btn copy-btn ${copyStatus === 'copied' ? 'copied' : ''}`}
                  onClick={handleCopyTeam}
                  disabled={copyStatus === 'copying'}
                  title="Copy as image"
                >
                  {copyStatus === 'copied' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : copyStatus === 'copying' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <span>Copying...</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      <span>Copy</span>
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
                  <div className="price-label-container">
                    <span className="price-label">${tier.price}</span>
                    <span className="price-dollar">$</span>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(e) => handleChangeTierPrice(tier.id, parseInt(e.target.value) || 1)}
                      className="price-input"
                      min="1"
                    />
                    <button
                      className="delete-tier-btn"
                      onClick={() => handleDeleteTier(tier.id)}
                      title="Delete tier"
                    >
                      ×
                    </button>
                  </div>
                  <div className="tier-slots">
                    {tier.slots.map((person, slotIndex) => {
                      const isSelected = person && selectedPicks[tier.id]?.handle === person.handle;
                      const isDragOver = dragOverSlot?.tierId === tier.id && dragOverSlot?.slotIndex === slotIndex;
                      return (
                        <div
                          key={slotIndex}
                          className={`slot-box ${person ? 'filled' : 'empty'} ${isDragOver ? 'drag-over' : ''} ${isSelected ? 'selected' : ''}`}
                          onDragOver={(e) => handleSlotDragOver(e, tier.id, slotIndex)}
                          onDragLeave={handleSlotDragLeave}
                          onDrop={(e) => handleSlotDrop(e, tier.id, slotIndex)}
                          onClick={() => person && handleSelect(tier.id, person)}
                        >
                          {person ? (
                            <>
                              <img
                                src={getAvatar(person.handle)}
                                alt={person.name || person.handle}
                                className="slot-avatar"
                                draggable
                                onDragStart={() => handleDragStart(person, tier.id, slotIndex)}
                                onDragEnd={handleDragEnd}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = fallbackAvatar(person.handle);
                                }}
                              />
                              <span className="slot-name">{person.name || `@${person.handle}`}</span>
                              {isSelected && <div className="selected-check">✓</div>}
                              <button
                                className="remove-slot-btn"
                                onClick={(e) => { e.stopPropagation(); handleRemovePersonFromSlot(tier.id, slotIndex); }}
                                title="Remove"
                              >
                                ×
                              </button>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Add tier button */}
              <button className="add-tier-btn" onClick={handleAddTier}>
                + Add Tier
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="build-team-footer">
            <span>ZaddyTools</span>
          </div>
        </div>

        {/* Character Pool - Simplified Draggable PFPs */}
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
                className={`pool-avatar-item ${draggedPerson?.person.handle === person.handle ? 'dragging' : ''}`}
                title={person.name || `@${person.handle}`}
                draggable
                onDragStart={() => handleDragStart(person)}
                onDragEnd={handleDragEnd}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = fallbackAvatar(person.handle);
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
