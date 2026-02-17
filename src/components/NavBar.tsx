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

const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
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

  // Add body class for sidebar state so CSS can adjust content margin
  useEffect(() => {
    if (isExpanded) {
      document.body.classList.remove('sidebar-collapsed');
      document.body.classList.add('sidebar-expanded');
    } else {
      document.body.classList.remove('sidebar-expanded');
      document.body.classList.add('sidebar-collapsed');
    }
    return () => {
      document.body.classList.remove('sidebar-collapsed', 'sidebar-expanded');
    };
  }, [isExpanded]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [mobileOpen]);

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
        <a href="/"><img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" className="mobile-logo-combo" /></a>
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
          <a href="/"><img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" className="sidebar-logo-combo" /></a>
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
              <span>
                {item.label}
                {item.badge && (
                  <span style={{
                    marginLeft: '0.35rem',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    color: '#2edb84',
                  }}>[{item.badge}]</span>
                )}
              </span>
            </Link>
          ))}
          <div className="mobile-divider" />
          <Link
            href="/developer-notes"
            className={`mobile-link ${pathname === '/developer-notes' ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="mobile-link-icon"><CodeIcon /></span>
            <span>Developer Notes</span>
          </Link>
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
          <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={isExpanded ? "/ZaddyToolsPFPandLogo.png" : "/ZaddyPFP.png"}
              alt="ZaddyTools"
              className="sidebar-logo-combo"
              style={{ cursor: 'pointer', height: isExpanded ? '36px' : '32px', width: 'auto', transition: 'all 0.2s' }}
              title="Go to homepage"
            />
          </a>
{isExpanded && (
            <button
              className="sidebar-toggle"
              onClick={() => setCollapsed(!collapsed)}
              title="Collapse menu"
              aria-label="Collapse sidebar menu"
              aria-expanded={isExpanded}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
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

          {isExpanded && <div className="sidebar-divider" />}
          <span className="sidebar-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isExpanded ? 'flex-start' : 'center' }}>
            {isExpanded ? (
              <>
                Abstract
                <img src="/AbstractLogo.png" alt="" style={{ width: 18, height: 18 }} />
              </>
            ) : 'ABS'}
          </span>

          {abstractNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              title={item.label}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">
                {item.label}
                {item.badge && (
                  <span style={{
                    marginLeft: '0.35rem',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    color: '#2edb84',
                  }}>[{item.badge}]</span>
                )}
              </span>
            </Link>
          ))}
        </div>

        {/* Developer Notes - Bottom of nav */}
        <Link
          href="/developer-notes"
          className={`sidebar-link ${pathname === '/developer-notes' ? 'active' : ''}`}
          title="Developer Notes"
          style={{ marginTop: 'auto' }}
        >
          <span className="sidebar-icon"><CodeIcon /></span>
          <span className="sidebar-label">Developer Notes</span>
        </Link>

        {/* X/Twitter Link */}
        <a
          href="https://x.com/zaddyfi"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'flex-start' : 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            transition: 'color 0.2s',
          }}
          title="Follow @zaddyfi on X"
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          {isExpanded && <span>@zaddyfi</span>}
        </a>
      </nav>
    </>
  );
}
