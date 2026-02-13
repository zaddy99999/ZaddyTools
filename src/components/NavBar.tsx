'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const mainNavItems = [
  { href: '/', label: 'Social Analytics', icon: '📊' },
  { href: '/market-analysis', label: 'Market Analysis', icon: '📈' },
  { href: '/news', label: 'News Feed', icon: '📰' },
  { href: '/xp-card', label: 'ID Card / XP Card', icon: '🪪' },
  { href: '/meme-generator', label: 'Meme Generator', icon: '🎨' },
  { href: '/api-docs', label: 'API Docs', icon: '📖' },
];

const abstractNavItems = [
  { href: '/abstract-dashboard', label: 'Abstract Dashboard', icon: '🎯' },
  { href: '/tier-maker', label: 'Tier List', icon: '🏆' },
  { href: '/wallet-analytics', label: 'Wallet Analysis', icon: '💰' },
  { href: '/game-guide-ai', label: 'GameGuideAI', icon: '🎮' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
        <img src="/ZaddyPFP.png" alt="Zaddy" className="mobile-logo" />
        <span className="mobile-title">Zaddy Tools</span>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Slide-out Menu */}
      <nav className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <img src="/ZaddyPFP.png" alt="Zaddy" className="sidebar-logo" />
          <span className="brand-name">Zaddy Tools</span>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}>✕</button>
        </div>
        <div className="mobile-menu-links">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="mobile-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="mobile-divider" />
          <span className="mobile-section">Abstract</span>
          {abstractNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="mobile-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <img src="/ZaddyPFP.png" alt="Zaddy" className="sidebar-logo" />
          <span className="sidebar-label brand-name">Zaddy Tools</span>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <div className="sidebar-links">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              title={item.label}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}

          <div className="sidebar-divider" />
          <span className="sidebar-section">Abstract</span>

          {abstractNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              title={item.label}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="sidebar-footer">
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(46, 219, 132, 0.15)',
              border: '1px solid rgba(46, 219, 132, 0.3)',
              borderRadius: '8px',
              color: '#2edb84',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'center',
            }}
            onClick={() => {}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
            <span className="sidebar-label">Connect</span>
          </button>
        </div>
      </nav>
    </>
  );
}
