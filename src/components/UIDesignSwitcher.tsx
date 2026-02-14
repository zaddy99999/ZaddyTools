'use client';

import { useState, useEffect } from 'react';

interface UIDesign {
  id: number;
  name: string;
  file: string;
}

const uiDesigns: UIDesign[] = [
  { id: 0, name: 'Default', file: '' },
  { id: 1, name: 'Neon Cyber', file: 'design-01-neon-cyberpunk.css' },
  { id: 2, name: 'Minimal Mono', file: 'design-02-minimal-mono.css' },
  { id: 3, name: 'Retro Synth', file: 'design-03-retro-synthwave.css' },
  { id: 4, name: 'Brutalist', file: 'design-06-brutalist.css' },
  { id: 5, name: 'Hacker', file: 'design-08-terminal-hacker.css' },
  { id: 6, name: 'Vaporwave', file: 'design-07-vaporwave.css' },
  { id: 7, name: 'Cosmic Space', file: 'design-13-cosmic-space.css' },
  { id: 8, name: 'Holographic Future', file: 'design-19-holographic-future.css' },
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
      const validIds = uiDesigns.map(d => d.id);
      if (!isNaN(savedId) && validIds.includes(savedId)) {
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
    const currentIndex = uiDesigns.findIndex(d => d.id === currentDesign);
    const nextIndex = (currentIndex + 1) % uiDesigns.length;
    selectDesign(uiDesigns[nextIndex].id);
  };

  const prevDesign = () => {
    const currentIndex = uiDesigns.findIndex(d => d.id === currentDesign);
    const prevIndex = currentIndex === 0 ? uiDesigns.length - 1 : currentIndex - 1;
    selectDesign(uiDesigns[prevIndex].id);
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
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(46, 219, 132, 0.15)',
          border: '1px solid rgba(46, 219, 132, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          transition: 'all 0.2s',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.background = 'rgba(46, 219, 132, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = 'rgba(46, 219, 132, 0.15)';
        }}
        title="Theme"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2edb84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
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
                {uiDesigns.findIndex(d => d.id === currentDesign) + 1} / {uiDesigns.length}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                {uiDesigns.find(d => d.id === currentDesign)?.name || 'Default'}
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
