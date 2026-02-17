'use client';

import NavBar from '@/components/NavBar';
import ErrorBoundary, { CardErrorBoundary } from '@/components/ErrorBoundary';
import { DailyDigest, PodcastList, NewsletterList, TrendingTopics, YouTubeChannels, RecommendedFollows } from '@/components/crypto';

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

        {/* Trending Topics + YouTube Channels - Side by Side */}
        <div className="podcast-newsletter-row">
          <div className="podcast-newsletter-half">
            <CardErrorBoundary><TrendingTopics /></CardErrorBoundary>
          </div>
          <div className="podcast-newsletter-half">
            <CardErrorBoundary><YouTubeChannels /></CardErrorBoundary>
          </div>
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

        {/* Recommended Follows - Full Width */}
        <div style={{ marginTop: '1.5rem' }}>
          <CardErrorBoundary><RecommendedFollows /></CardErrorBoundary>
        </div>
      </main>
    </ErrorBoundary>
  );
}
