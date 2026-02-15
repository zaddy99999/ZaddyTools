'use client';

import NavBar from '@/components/NavBar';

export default function WalletAnalyticsPage() {
  return (
    <>
      <NavBar />
      <main className="coming-soon-page">
        <div className="coming-soon-container">
          <div className="coming-soon-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
          </div>
          <h1 className="coming-soon-title">Wallet Analysis</h1>
          <div className="coming-soon-badge">Coming Soon</div>
          <p className="coming-soon-description">
            Advanced wallet analytics and insights are currently in development.
            Track your portfolio, analyze transactions, and discover trends.
          </p>
          <div className="coming-soon-features">
            <div className="coming-soon-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Portfolio Tracking</span>
            </div>
            <div className="coming-soon-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Transaction History</span>
            </div>
            <div className="coming-soon-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
              </svg>
              <span>Performance Analytics</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
