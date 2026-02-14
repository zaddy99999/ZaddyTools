'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import NavBar from '@/components/NavBar';

interface TierItem {
  id: string;
  name: string;
  image: string;
  category?: string;
}

interface Tier {
  id: string;
  label: string;
  color: string;
  items: TierItem[];
}

const DEFAULT_TIERS: Tier[] = [
  { id: 's', label: 'S', color: '#ff7f7f', items: [] },
  { id: 'a', label: 'A', color: '#ffbf7f', items: [] },
  { id: 'b', label: 'B', color: '#ffdf7f', items: [] },
  { id: 'c', label: 'C', color: '#ffff7f', items: [] },
  { id: 'd', label: 'D', color: '#bfff7f', items: [] },
  { id: 'f', label: 'F', color: '#7fbfff', items: [] },
];

// Helper to get Twitter avatar via unavatar.io
const twitterAvatar = (handle: string) => `https://unavatar.io/twitter/${handle}`;

export default function TierMaker() {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [unrankedItems, setUnrankedItems] = useState<TierItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<TierItem | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [twitterHandle, setTwitterHandle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('My Projects List');
  const [listType, setListType] = useState<'projects' | 'people'>('projects');
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const tierListRef = useRef<HTMLDivElement>(null);

  // Mobile selection state
  const [isMobile, setIsMobile] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TierItem | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show toast message that auto-dismisses
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const copyImage = async () => {
    if (!tierListRef.current) return;
    try {
      const canvas = await html2canvas(tierListRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
      });
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Copied to clipboard!');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to copy image:', error);
      alert('Failed to copy.');
    }
  };

  // Load items from Google Sheet based on list type
  useEffect(() => {
    async function loadFromSheet() {
      setIsLoading(true);
      setTiers(DEFAULT_TIERS);
      setUnrankedItems([]);
      try {
        const endpoint = listType === 'projects' ? '/api/tier-maker' : '/api/people-tier-maker';
        const res = await fetch(endpoint);
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            const sheetItems: TierItem[] = items.map((item: { handle: string; name?: string; category?: string }) => ({
              id: item.handle,
              name: item.name || (item.handle.length > 12 ? item.handle.substring(0, 12) : item.handle),
              image: twitterAvatar(item.handle),
              category: item.category || 'Other',
            }));
            setUnrankedItems(sheetItems);
          }
        }
      } catch (error) {
        console.error('Failed to load from sheet:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFromSheet();
  }, [listType]);

  // Update title when list type changes
  useEffect(() => {
    setTitle(listType === 'projects' ? 'My Projects List' : 'My People List');
  }, [listType]);

  // Category sort order - projects and people combined
  const CATEGORY_ORDER = listType === 'people'
    ? ['Creator', 'Founder', 'Streamer', 'Gamer', 'Other']
    : ['NFT + Game', 'Defi', 'NFT', 'Game', 'Social', 'Infrastructure', 'Other', 'Memecoins'];

  // Open Twitter profile on click (desktop only)
  const openTwitterProfile = (handle: string) => {
    // Extract handle from id if it has a prefix
    const cleanHandle = handle.replace(/^twitter-/, '').replace(/-\d+$/, '');
    window.open(`https://x.com/${cleanHandle}`, '_blank');
  };

  // Mobile: handle item click - select it
  const handleItemClick = (item: TierItem, source: string) => {
    if (isMobile) {
      // If same item clicked, deselect
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
        setSelectedSource(null);
      } else {
        setSelectedItem(item);
        setSelectedSource(source);
        showToast(`Selected: ${item.name} - tap a tier to place`);
      }
    } else {
      // Desktop: open Twitter
      openTwitterProfile(item.id);
    }
  };

  // Mobile: handle tier click - place selected item
  const handleTierClick = (tierId: string) => {
    if (!isMobile || !selectedItem) return;

    // Check for Elisa
    let targetTierId = tierId;
    if (selectedItem.id.toLowerCase() === 'eeelistar' && tierId !== 's') {
      showToast('Elisa is the GOAT, she can only be added to S tier 🐐');
      targetTierId = 's';
    }

    // Remove from source
    if (selectedSource === 'unranked') {
      setUnrankedItems(prev => prev.filter(i => i.id !== selectedItem.id));
    } else {
      setTiers(prev => prev.map(tier => ({
        ...tier,
        items: tier.items.filter(i => i.id !== selectedItem.id)
      })));
    }

    // Add to target tier
    setTiers(prev => prev.map(tier =>
      tier.id === targetTierId
        ? { ...tier, items: [...tier.items, selectedItem] }
        : tier
    ));

    // Clear selection
    setSelectedItem(null);
    setSelectedSource(null);
  };

  // Group unranked items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, TierItem[]> = {};
    unrankedItems.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    // Sort Zaddy, Elisa, Ely first within their category
    const priorityHandles = ['zaddyfi', 'eeelistar', 'proofofely'];
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        const aPriority = priorityHandles.indexOf(a.id.toLowerCase());
        const bPriority = priorityHandles.indexOf(b.id.toLowerCase());
        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
        return 0;
      });
    });
    // Sort categories by custom order
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      const orderA = indexA === -1 ? CATEGORY_ORDER.length - 2 : indexA;
      const orderB = indexB === -1 ? CATEGORY_ORDER.length - 2 : indexB;
      return orderA - orderB;
    });
    return sortedCategories.map(cat => ({ category: cat, items: groups[cat] }));
  }, [unrankedItems, listType]);

  const handleDragStart = (item: TierItem, source: string) => {
    setDraggedItem(item);
    setDragSource(source);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnTier = useCallback((targetTierId: string) => {
    if (!draggedItem) return;

    // Elisa can only be S tier - auto-place her there
    let tierId = targetTierId;
    if (draggedItem.id.toLowerCase() === 'eeelistar' && tierId !== 's') {
      showToast('Elisa is the GOAT, she can only be added to S tier 🐐');
      tierId = 's';
    }

    // Remove from source
    if (dragSource === 'unranked') {
      setUnrankedItems(prev => prev.filter(i => i.id !== draggedItem.id));
    } else {
      setTiers(prev => prev.map(tier => ({
        ...tier,
        items: tier.items.filter(i => i.id !== draggedItem.id)
      })));
    }

    // Add to target tier
    setTiers(prev => prev.map(tier =>
      tier.id === tierId
        ? { ...tier, items: [...tier.items, draggedItem] }
        : tier
    ));

    setDraggedItem(null);
    setDragSource(null);
  }, [draggedItem, dragSource]);

  const handleDropOnUnranked = useCallback(() => {
    if (!draggedItem || dragSource === 'unranked') return;

    // Remove from tier
    setTiers(prev => prev.map(tier => ({
      ...tier,
      items: tier.items.filter(i => i.id !== draggedItem.id)
    })));

    // Add to unranked
    setUnrankedItems(prev => [...prev, draggedItem]);

    setDraggedItem(null);
    setDragSource(null);
  }, [draggedItem, dragSource]);

  const resetTiers = async () => {
    setTiers(DEFAULT_TIERS);
    setIsLoading(true);
    try {
      const endpoint = listType === 'projects' ? '/api/tier-maker' : '/api/people-tier-maker';
      const res = await fetch(endpoint);
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const sheetItems: TierItem[] = items.map((item: { handle: string; name?: string; category?: string }) => ({
            id: item.handle,
            name: item.name || (item.handle.length > 12 ? item.handle.substring(0, 12) : item.handle),
            image: twitterAvatar(item.handle),
            category: item.category || 'Other',
          }));
          setUnrankedItems(sheetItems);
        }
      }
    } catch (error) {
      console.error('Failed to reload from sheet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTwitterHandle = async () => {
    if (!twitterHandle.trim()) return;
    const handle = twitterHandle.trim().replace('@', '');

    // Fetch display name from Twitter
    let name = handle;
    try {
      const res = await fetch(`/api/twitter-profile?handle=${handle}`);
      const data = await res.json();
      name = data.name || handle;
    } catch {
      name = handle;
    }

    // Submit as suggestion for admin review
    try {
      await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: name,
          giphyUrl: `https://x.com/${handle}`,
          category: 'web3',
          notes: `User-added via tier maker (${listType})`,
          toolType: listType === 'projects' ? 'tier-maker-projects' : 'tier-maker-people',
        }),
      });
      showToast(`Submitted "${name}" for admin review!`);
    } catch (err) {
      console.error('Failed to submit suggestion:', err);
    }

    // Still add locally for immediate use
    const newItem: TierItem = {
      id: `twitter-${handle}-${Date.now()}`,
      name: name.length > 15 ? name.substring(0, 15) : name,
      image: twitterAvatar(handle),
      category: 'Added',
    };
    setUnrankedItems(prev => [...prev, newItem]);
    setTwitterHandle('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newItem: TierItem = {
          id: `custom-${Date.now()}-${index}`,
          name: file.name.split('.')[0].substring(0, 10),
          image: event.target?.result as string,
          category: 'Uploaded',
        };
        setUnrankedItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  return (
    <main className="container tier-maker-page">
      <NavBar />

      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}

      <div className="tier-list-wrapper">
        <button className="copy-tier-btn" onClick={copyImage} title="Copy to clipboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </button>
        <div className="tier-list-container" ref={tierListRef}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Click to add title..."
            className="tier-list-title-input"
          />
        <div className="tier-list">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`tier-row ${isMobile && selectedItem ? 'tap-target' : ''}`}
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnTier(tier.id)}
              onClick={() => handleTierClick(tier.id)}
            >
              <div
                className="tier-label"
                style={{ backgroundColor: tier.color }}
              >
                {tier.label}
              </div>
              <div className="tier-items">
                {tier.items.map((item) => (
                  <div
                    key={item.id}
                    className={`tier-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                    draggable={!isMobile}
                    onDragStart={() => handleDragStart(item, tier.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item, tier.id);
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={async (e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        // Try to get real avatar from our API
                        const handle = item.id.replace(/^twitter-/, '').replace(/-\d+$/, '');
                        try {
                          const res = await fetch(`/api/twitter-profile?handle=${handle}`);
                          const data = await res.json();
                          if (data.avatar) {
                            target.src = data.avatar;
                            return;
                          }
                        } catch {}
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1a1a1a&color=2edb84&size=80`;
                      }}
                    />
                    <span className="tier-item-name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="watermark">ZaddyTools</div>
      </div>
      </div>

      <div
        className="unranked-pool"
        onDragOver={handleDragOver}
        onDrop={handleDropOnUnranked}
      >
        <div className="unranked-header">
          <div className="unranked-header-left">
            <p className="unranked-label">Unranked Items</p>
            <div className="list-type-toggle">
              <button
                className={`list-type-btn ${listType === 'projects' ? 'active' : ''}`}
                onClick={() => setListType('projects')}
              >
                Projects
              </button>
              <button
                className={`list-type-btn ${listType === 'people' ? 'active' : ''}`}
                onClick={() => setListType('people')}
              >
                People
              </button>
            </div>
          </div>
          <div className="unranked-actions">
            <input
              type="text"
              placeholder="@twitter"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTwitterHandle()}
              className="twitter-input-small"
            />
            <button className="tier-action-btn-small" onClick={addTwitterHandle}>Add</button>
            <label className="tier-action-btn-small">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              Images
            </label>
            <button className="tier-action-btn-small reset" onClick={resetTiers}>Reset</button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-items">Loading {listType} from sheet...</div>
        ) : unrankedItems.length === 0 ? (
          <div className="loading-items">No {listType} found. Add some above or check your sheet.</div>
        ) : (
          <>
            <div className={`category-items ${expanded ? 'expanded' : ''}`}>
              {groupedItems.map((group) => (
                <div key={group.category} className="category-group-inline">
                <div className="category-label-inline">{group.category.replace(' / ', '\n')}</div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`tier-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                    draggable={!isMobile}
                    onDragStart={() => handleDragStart(item, 'unranked')}
                    onClick={() => handleItemClick(item, 'unranked')}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={async (e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        // Try to get real avatar from our API
                        const handle = item.id.replace(/^twitter-/, '').replace(/-\d+$/, '');
                        try {
                          const res = await fetch(`/api/twitter-profile?handle=${handle}`);
                          const data = await res.json();
                          if (data.avatar) {
                            target.src = data.avatar;
                            return;
                          }
                        } catch {}
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1a1a1a&color=2edb84&size=80`;
                      }}
                    />
                    <span className="tier-item-name">{item.name}</span>
                  </div>
                ))}
              </div>
            ))}
            </div>
            <button
              className="expand-btn"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '▲ Collapse' : '▼ Expand'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
