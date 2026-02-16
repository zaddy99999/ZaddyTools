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
              <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>News / Resources</p>
            </div>

            <NavBar />
          </div>
        </div>

        {/* Daily Digest - Full Width */}
        <div style={{ marginBottom: '1.5rem' }}>
          <CardErrorBoundary><DailyDigest /></CardErrorBoundary>
        </div>

        {/* Trending Topics - Half width on PC */}
        <div className="trending-wrapper">
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

        {/* YouTube Channels - Half Width on desktop, full on mobile */}
        <div className="youtube-wrapper">
          <CardErrorBoundary><YouTubeChannels /></CardErrorBoundary>
        </div>
      </main>
    </ErrorBoundary>
  );
}
