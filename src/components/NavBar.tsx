'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// SVG Icon components for cleaner menu look - all marked aria-hidden as labels provide the text
const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const TrendingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);

const NewsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
  </svg>
);

const CardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const TargetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </svg>
);

const TeamIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const mainNavItems = [
  { href: '/', label: 'Social Analytics', icon: <ChartIcon /> },
  { href: '/market-analysis', label: 'Market Analysis', icon: <TrendingIcon /> },
  { href: '/news', label: 'News / Resources', icon: <NewsIcon /> },
];

const abstractNavItems = [
  { href: '/abstract-dashboard', label: 'Abstract Dashboard', icon: <TargetIcon />, badge: null },
  { href: '/xp-card', label: 'ID Card / XP Card', icon: <CardIcon />, badge: null },
  { href: '/tier-maker', label: 'Tier List', icon: <TrophyIcon />, badge: null },
  { href: '/build-your-team', label: 'Build Your Team', icon: <TeamIcon />, badge: null },
  { href: '/wallet-analytics', label: 'Wallet Analysis', icon: <WalletIcon />, badge: 'Beta' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show expanded if not collapsed OR if hover-expanded
  const isExpanded = !collapsed || hoverExpanded;

  // Mobile elements rendered via portal to escape stacking contexts
  const mobileElements = (
    <>
      {/* Mobile Header Bar */}
      <div className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation-menu"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
        <img src="/ZaddyPFP.png" alt="Zaddy" className="mobile-logo" />
        <span className="mobile-title">Zaddy Tools</span>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Slide-out Menu */}
      <nav
        id="mobile-navigation-menu"
        className={`mobile-menu ${mobileOpen ? 'open' : ''}`}
        aria-label="Mobile navigation"
      >
        <div className="mobile-menu-header">
          <img src="/ZaddyPFP.png" alt="Zaddy" className="sidebar-logo" />
          <span className="brand-name">Zaddy Tools</span>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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
          <span className="mobile-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Abstract
            <img src="/AbstractLogo.png" alt="" style={{ width: 18, height: 18 }} />
          </span>
          {abstractNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="mobile-link-icon">{item.icon}</span>
              <span style={{ position: 'relative' }}>
                {item.label}
                {item.badge && (
                  <span style={{
                    position: 'absolute',
                    top: '-0.5rem',
                    right: '-1.5rem',
                    fontSize: '0.5rem',
                    fontWeight: 700,
                    color: '#2edb84',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>{item.badge}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile elements via portal - renders directly to body to escape stacking contexts */}
      {mounted && createPortal(mobileElements, document.body)}

      {/* Desktop Sidebar */}
      <nav
        className={`sidebar ${!isExpanded ? 'collapsed' : ''}`}
        onMouseEnter={() => collapsed && setHoverExpanded(true)}
        onMouseLeave={() => setHoverExpanded(false)}
      >
        <div className="sidebar-brand">
          <img
            src="/ZaddyPFP.png"
            alt="Zaddy"
            className="sidebar-logo"
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer' }}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          />
          <span className="sidebar-label brand-name">Zaddy Tools</span>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={collapsed ? 'Expand sidebar menu' : 'Collapse sidebar menu'}
            aria-expanded={isExpanded}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {!isExpanded ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
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
          <span className="sidebar-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Abstract
            <img src="/AbstractLogo.png" alt="" style={{ width: 18, height: 18 }} />
          </span>

          {abstractNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              title={item.label}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label" style={{ position: 'relative' }}>
                {item.label}
                {item.badge && (
                  <span style={{
                    position: 'absolute',
                    top: '-0.5rem',
                    right: '-1.5rem',
                    fontSize: '0.5rem',
                    fontWeight: 700,
                    color: '#2edb84',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>{item.badge}</span>
                )}
              </span>
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
            aria-label="Connect wallet"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
