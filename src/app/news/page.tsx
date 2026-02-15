'use client';

import NavBar from '@/components/NavBar';
import ErrorBoundary, { CardErrorBoundary } from '@/components/ErrorBoundary';
import { DailyDigest, PodcastList, NewsletterList, TrendingTopics, YouTubeChannels } from '@/components/crypto';

export default function NewsPage() {
  return (
    <ErrorBoundary>
      <main className="container">
        {/* Banner Header */}
        <div className="banner-header">
          <div className="banner-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/ZaddyPFP.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
              <div>
                <h1 style={{ marginBottom: 0 }}>ZaddyTools</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>News / Resources</p>
              </div>
            </div>

            <NavBar />
          </div>
        </div>

        {/* Daily Digest - Full Width */}
        <div style={{ marginBottom: '1.5rem' }}>
          <CardErrorBoundary><DailyDigest /></CardErrorBoundary>
        </div>

        {/* Trending Topics */}
        <div style={{ marginBottom: '1.5rem' }}>
          <CardErrorBoundary><TrendingTopics /></CardErrorBoundary>
        </div>

        {/* Podcast & Newsletter Section - Side by Side */}
        <div className="podcast-newsletter-row">
          <div className="podcast-newsletter-half">
            <CardErrorBoundary><PodcastList /></CardErrorBoundary>
          </div>
          <div className="podcast-newsletter-half">
            <CardErrorBoundary><NewsletterList /></CardErrorBoundary>
          </div>
        </div>

        {/* YouTube Channels - Half Width */}
        <div style={{ marginTop: '1.5rem', maxWidth: '50%' }}>
          <CardErrorBoundary><YouTubeChannels /></CardErrorBoundary>
        </div>
      </main>
    </ErrorBoundary>
  );
}
