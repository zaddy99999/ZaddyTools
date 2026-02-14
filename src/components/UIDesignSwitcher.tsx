'use client';

import { useState, useEffect } from 'react';

interface UIDesign {
  id: number;
  name: string;
  file: string;
}

const uiDesigns: UIDesign[] = [
  { id: 0, name: 'Default (Original)', file: '' },
  { id: 1, name: 'Neon Cyberpunk', file: 'design-01-neon-cyberpunk.css' },
  { id: 2, name: 'Minimal Mono', file: 'design-02-minimal-mono.css' },
  { id: 3, name: 'Retro Synthwave', file: 'design-03-retro-synthwave.css' },
  { id: 4, name: 'Nature Organic', file: 'design-04-nature-organic.css' },
  { id: 5, name: 'Glassmorphism', file: 'design-05-glassmorphism.css' },
  { id: 6, name: 'Brutalist', file: 'design-06-brutalist.css' },
  { id: 7, name: 'Vaporwave', file: 'design-07-vaporwave.css' },
  { id: 8, name: 'Terminal Hacker', file: 'design-08-terminal-hacker.css' },
  { id: 9, name: 'Candy Playful', file: 'design-09-candy-playful.css' },
  { id: 10, name: 'Steampunk', file: 'design-10-steampunk.css' },
  { id: 11, name: 'Arctic Ice', file: 'design-11-arctic-ice.css' },
  { id: 12, name: 'Sunset Warm', file: 'design-12-sunset-warm.css' },
  { id: 13, name: 'Cosmic Space', file: 'design-13-cosmic-space.css' },
  { id: 14, name: 'Forest Natural', file: 'design-14-forest-natural.css' },
  { id: 15, name: 'Ocean Aquatic', file: 'design-15-ocean-aquatic.css' },
  { id: 16, name: 'Noir Film', file: 'design-16-noir-film.css' },
  { id: 17, name: 'Graffiti Urban', file: 'design-17-graffiti-urban.css' },
  { id: 18, name: 'Japanese Zen', file: 'design-18-japanese-zen.css' },
  { id: 19, name: 'Holographic Future', file: 'design-19-holographic-future.css' },
  { id: 20, name: 'Corporate Pro', file: 'design-20-corporate-pro.css' },
];

export default function UIDesignSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDesign, setCurrentDesign] = useState(0);
  const [styleElement, setStyleElement] = useState<HTMLStyleElement | null>(null);

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('zaddytools-ui-design');
    if (saved) {
      const savedId = parseInt(saved);
      if (!isNaN(savedId) && savedId >= 0 && savedId <= 20) {
        setCurrentDesign(savedId);
        loadDesign(savedId);
      }
    }
  }, []);

  const loadDesign = async (designId: number) => {
    // Remove existing custom style
    if (styleElement) {
      styleElement.remove();
    }

    if (designId === 0) {
      // Default - no custom CSS
      setStyleElement(null);
      return;
    }

    const design = uiDesigns.find(d => d.id === designId);
    if (!design || !design.file) return;

    try {
      const response = await fetch(`/styles/ui-designs/${design.file}`);
      if (response.ok) {
        const css = await response.text();
        const style = document.createElement('style');
        style.id = 'ui-design-override';
        style.textContent = css;
        document.head.appendChild(style);
        setStyleElement(style);
      }
    } catch (err) {
      console.error('Failed to load design:', err);
    }
  };

  const selectDesign = (designId: number) => {
    setCurrentDesign(designId);
    localStorage.setItem('zaddytools-ui-design', designId.toString());
    loadDesign(designId);
  };

  const nextDesign = () => {
    const next = (currentDesign + 1) % uiDesigns.length;
    selectDesign(next);
  };

  const prevDesign = () => {
    const prev = currentDesign === 0 ? uiDesigns.length - 1 : currentDesign - 1;
    selectDesign(prev);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: '#2edb84',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 20px rgba(46, 219, 132, 0.4)',
          zIndex: 9999,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="UI Design Switcher"
      >
        🎨
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '140px',
            left: '20px',
            width: '320px',
            maxHeight: '70vh',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(46, 219, 132, 0.5)',
            borderRadius: '16px',
            overflow: 'hidden',
            zIndex: 9998,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                UI Design Preview
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
                {uiDesigns.length} designs available
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              ×
            </button>
          </div>

          {/* Current Selection with Navigation */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={prevDesign}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              ←
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>
                {currentDesign} / {uiDesigns.length - 1}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                {uiDesigns[currentDesign].name}
              </div>
            </div>
            <button
              onClick={nextDesign}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              →
            </button>
          </div>

          {/* Design List */}
          <div
            style={{
              maxHeight: '350px',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            {uiDesigns.map((design) => (
              <button
                key={design.id}
                onClick={() => selectDesign(design.id)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  marginBottom: '4px',
                  background: currentDesign === design.id
                    ? 'rgba(46, 219, 132, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: currentDesign === design.id
                    ? '1px solid rgba(46, 219, 132, 0.5)'
                    : '1px solid transparent',
                  borderRadius: '10px',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (currentDesign !== design.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentDesign !== design.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: design.id === 0 ? '#2edb84' : `hsl(${design.id * 18}, 70%, 50%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {design.id === 0 ? '✓' : design.id}
                </span>
                <span style={{ fontSize: '14px' }}>{design.name}</span>
                {currentDesign === design.id && (
                  <span style={{ marginLeft: 'auto', color: '#2edb84' }}>●</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
