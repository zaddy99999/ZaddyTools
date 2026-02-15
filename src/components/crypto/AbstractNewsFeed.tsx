'use client';

import { useState, useMemo } from 'react';
import { useAbstractNews } from '@/lib/crypto/hooks';
import type { NewsItem } from '@/lib/crypto/types';

// Category filter options
const CATEGORIES = [
  { id: 'all', title: 'All', color: '#2EDB84' },
  { id: 'official', title: 'Official', color: '#2EDB84' },
  { id: 'news', title: 'News', color: '#4285F4' },
];

// Group news by day
function groupByDay(news: NewsItem[]): Map<string, NewsItem[]> {
  const grouped = new Map<string, NewsItem[]>();

  news.forEach(item => {
    const date = new Date(item.published_at);
    const dayKey = date.toISOString().split('T')[0];

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(item);
  });

  return grouped;
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatDayLabel(dateStr.split('T')[0]);
}

interface AbstractNewsItemProps {
  item: NewsItem;
}

function AbstractNewsItem({ item }: AbstractNewsItemProps) {
  const isOfficial = item.category === 'Official';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`abstract-news-item ${isOfficial ? 'official' : ''}`}
    >
      <div className="abstract-news-content">
        {isOfficial && (
          <span className="abstract-official-badge">Official</span>
        )}
        <p className="abstract-news-title">{item.title}</p>
        <div className="abstract-news-meta">
          <span
            className="abstract-news-source"
            style={{
              backgroundColor: item.source.color ? `${item.source.color}20` : 'rgba(46, 219, 132, 0.2)',
              color: item.source.color || '#2EDB84',
              borderColor: item.source.color ? `${item.source.color}40` : 'rgba(46, 219, 132, 0.4)',
            }}
          >
            {item.source.title}
          </span>
          <span className="abstract-news-time">{formatRelativeTime(item.published_at)}</span>
        </div>
      </div>
    </a>
  );
}

export default function AbstractNewsFeed() {
  const { news, isLoading, isError } = useAbstractNews();
  const [dayIndex, setDayIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter by category
  const filteredNews = useMemo(() => {
    if (selectedCategory === 'all') return news;
    return news.filter(item =>
      item.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [news, selectedCategory]);

  // Group by day
  const { dayKeys, groupedNews } = useMemo(() => {
    const grouped = groupByDay(filteredNews);
    const keys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
    return { dayKeys: keys, groupedNews: grouped };
  }, [filteredNews]);

  const currentDayKey = dayKeys[dayIndex];
  const currentNews = currentDayKey ? groupedNews.get(currentDayKey) || [] : [];

  const canGoNewer = dayIndex > 0;
  const canGoOlder = dayIndex < dayKeys.length - 1;

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setDayIndex(0);
  };

  if (isLoading) {
    return (
      <div className="abstract-news-card loading">
        <div className="abstract-news-header">
          <div className="abstract-news-header-left">
            <img src="/abstract-logo.svg" alt="Abstract" className="abstract-logo" />
            <div>
              <h3 className="abstract-news-heading">Abstract Ecosystem</h3>
              <p className="abstract-news-subheading">Latest updates & announcements</p>
            </div>
          </div>
        </div>
        <div className="abstract-news-list">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton skeleton-news-item" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="abstract-news-card">
        <div className="abstract-news-header">
          <div className="abstract-news-header-left">
            <div className="abstract-logo-placeholder" />
            <div>
              <h3 className="abstract-news-heading">Abstract Ecosystem</h3>
              <p className="abstract-news-subheading">Latest updates & announcements</p>
            </div>
          </div>
        </div>
        <div className="abstract-news-empty">
          <p>Unable to load Abstract news</p>
        </div>
      </div>
    );
  }

  return (
    <div className="abstract-news-card">
      <div className="abstract-news-header">
        <div className="abstract-news-header-left">
          <div className="abstract-logo-placeholder" style={{ background: 'linear-gradient(135deg, #2EDB84 0%, #1fa563 100%)' }} />
          <div>
            <h3 className="abstract-news-heading">Abstract Ecosystem</h3>
            <p className="abstract-news-subheading">Latest updates & announcements</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="abstract-category-filter">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`abstract-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat.id)}
            style={{
              borderColor: selectedCategory === cat.id ? cat.color : 'transparent',
              backgroundColor: selectedCategory === cat.id ? `${cat.color}20` : 'rgba(255,255,255,0.05)',
              color: selectedCategory === cat.id ? cat.color : 'rgba(255,255,255,0.6)',
            }}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Day Navigation */}
      <div className="abstract-day-nav">
        <button
          className="abstract-nav-btn"
          onClick={() => setDayIndex(i => i + 1)}
          disabled={!canGoOlder}
          style={{ opacity: canGoOlder ? 1 : 0.3 }}
          title="Older"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="abstract-day-label">
          <span className="abstract-day-title">{currentDayKey ? formatDayLabel(currentDayKey) : 'No news'}</span>
          <span className="abstract-day-count">{currentNews.length} updates</span>
        </div>

        <button
          className="abstract-nav-btn"
          onClick={() => setDayIndex(i => i - 1)}
          disabled={!canGoNewer}
          style={{ opacity: canGoNewer ? 1 : 0.3 }}
          title="Newer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* News List */}
      <div className="abstract-news-list">
        {currentNews.length === 0 ? (
          <div className="abstract-news-empty">
            <p>No updates for this day</p>
          </div>
        ) : (
          currentNews.map((item) => (
            <AbstractNewsItem key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="abstract-news-footer">
        <span>Powered by ZaddyTools</span>
      </div>
    </div>
  );
}
