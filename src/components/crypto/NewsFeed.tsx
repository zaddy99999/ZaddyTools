'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { NewsItem, CoinMarketData, NewsSentiment } from '@/lib/crypto/types';

interface NewsFeedProps {
  news: NewsItem[];
  coins?: CoinMarketData[];
  isLoading?: boolean;
  title?: string;
  accentColor?: string;
  showPriceCharts?: boolean;
  enableAI?: boolean;
}

// Local state for sentiment and summaries
interface AIState {
  sentiments: Record<string, { sentiment: NewsSentiment; confidence: number }>;
  summaries: Record<string, string>;
  loadingSummary: string | null;
}

const BOOKMARKS_STORAGE_KEY = 'zaddytools_news_bookmarks';

function loadBookmarks(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveBookmarks(bookmarks: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(bookmarks)));
  } catch { /* ignore */ }
}

function groupByDay(news: NewsItem[]): Map<string, NewsItem[]> {
  const grouped = new Map<string, NewsItem[]>();
  news.forEach(item => {
    const dayKey = new Date(item.published_at).toISOString().split('T')[0];
    if (!grouped.has(dayKey)) grouped.set(dayKey, []);
    grouped.get(dayKey)!.push(item);
  });
  return grouped;
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return formatDayLabel(dateStr.split('T')[0]);
}

function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SentimentBadge({ sentiment }: { sentiment: NewsSentiment }) {
  const config = {
    bullish: { icon: '↑', className: 'sentiment-bullish' },
    bearish: { icon: '↓', className: 'sentiment-bearish' },
    neutral: { icon: '-', className: 'sentiment-neutral' },
  };
  const { icon, className } = config[sentiment];

  return (
    <span className={`news-sentiment-badge ${className}`}>
      {icon}
    </span>
  );
}

export default function NewsFeed({
  news,
  isLoading,
  title = 'Daily News',
  accentColor = '#2edb84',
  enableAI = true,
}: NewsFeedProps) {
  const [dayIndex, setDayIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [aiState, setAIState] = useState<AIState>({
    sentiments: {},
    summaries: {},
    loadingSummary: null,
  });

  useEffect(() => {
    setBookmarks(loadBookmarks());
  }, []);

  const toggleBookmark = useCallback((e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarks(prev => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(itemId)) newBookmarks.delete(itemId);
      else newBookmarks.add(itemId);
      saveBookmarks(newBookmarks);
      return newBookmarks;
    });
  }, []);

  const { dayKeys, groupedNews } = useMemo(() => {
    const grouped = groupByDay(news);
    const keys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
    return { dayKeys: keys, groupedNews: grouped };
  }, [news]);

  const savedNews = useMemo(() => news.filter(item => bookmarks.has(item.id)), [news, bookmarks]);

  const currentDayKey = dayKeys[dayIndex];
  const currentNews = currentDayKey ? groupedNews.get(currentDayKey) || [] : [];

  const accentRgb = accentColor === '#2edb84' ? '46, 219, 132' : '59, 130, 246';

  // Fetch batch sentiments
  const fetchBatchSentiments = useCallback(async (items: NewsItem[]) => {
    if (!enableAI || items.length === 0) return;
    const itemsToAnalyze = items.filter(item => !aiState.sentiments[item.id]);
    if (itemsToAnalyze.length === 0) return;

    try {
      const response = await fetch('/api/news/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch-sentiment',
          items: itemsToAnalyze.map(item => ({ id: item.id, title: item.title })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          setAIState(prev => ({
            ...prev,
            sentiments: { ...prev.sentiments, ...data.results },
          }));
        }
      }
    } catch { /* ignore */ }
  }, [enableAI, aiState.sentiments]);

  useEffect(() => {
    if (currentNews.length > 0 && enableAI) {
      fetchBatchSentiments(currentNews);
    }
  }, [currentDayKey, enableAI]); // eslint-disable-line

  // Fetch summary
  const fetchSummary = useCallback(async (item: NewsItem) => {
    if (!enableAI) return;

    if (aiState.summaries[item.id]) {
      setExpandedSummary(prev => prev === item.id ? null : item.id);
      return;
    }

    if (aiState.loadingSummary === item.id) return;

    setExpandedSummary(item.id);
    setAIState(prev => ({ ...prev, loadingSummary: item.id }));

    try {
      const response = await fetch('/api/news/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summary', id: item.id, title: item.title, url: item.url }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          setAIState(prev => ({
            ...prev,
            summaries: { ...prev.summaries, [item.id]: data.summary },
            loadingSummary: null,
          }));
        }
      }
    } catch {
      setAIState(prev => ({ ...prev, loadingSummary: null }));
    }
  }, [enableAI, aiState.summaries, aiState.loadingSummary]);

  if (isLoading) {
    return (
      <div className="news-feed-card loading" style={{ borderColor: `rgba(${accentRgb}, 0.2)` }}>
        <div className="skeleton skeleton-label" />
        <div className="news-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-news-item" />
          ))}
        </div>
      </div>
    );
  }

  const displayNews = showSaved ? savedNews : currentNews;

  return (
    <div className="news-feed-card" style={{ borderColor: `rgba(${accentRgb}, 0.2)` }}>
      <div className="news-header">
        <p className="widget-label">{title}</p>
        <button
          className={`news-saved-tab ${showSaved ? 'active' : ''}`}
          onClick={() => setShowSaved(!showSaved)}
        >
          <BookmarkIcon filled />
          <span>Saved</span>
          {bookmarks.size > 0 && <span className="news-saved-count">{bookmarks.size}</span>}
        </button>
      </div>

      {/* Day Navigation */}
      {!showSaved && (
        <div className="news-day-nav">
          <button
            className="news-nav-btn"
            onClick={() => setDayIndex(i => i + 1)}
            disabled={dayIndex >= dayKeys.length - 1}
            style={{ opacity: dayIndex < dayKeys.length - 1 ? 1 : 0.3, borderColor: `rgba(${accentRgb}, 0.3)` }}
          >
            ←
          </button>
          <div className="news-day-label">
            <span className="news-day-title">{currentDayKey ? formatDayLabel(currentDayKey) : 'No news'}</span>
            <span className="news-day-count">{currentNews.length} articles</span>
          </div>
          <button
            className="news-nav-btn"
            onClick={() => setDayIndex(i => i - 1)}
            disabled={dayIndex <= 0}
            style={{ opacity: dayIndex > 0 ? 1 : 0.3, borderColor: `rgba(${accentRgb}, 0.3)` }}
          >
            →
          </button>
        </div>
      )}

      {/* News List */}
      <div className="news-list">
        {displayNews.length === 0 ? (
          <div className="news-empty">
            <p>{showSaved ? 'No saved articles' : 'No articles for this day'}</p>
          </div>
        ) : (
          displayNews.map((item) => {
            const sentiment = aiState.sentiments[item.id];
            const summary = aiState.summaries[item.id];
            const isExpanded = expandedSummary === item.id;
            const isLoadingSummary = aiState.loadingSummary === item.id;

            return (
              <div key={item.id} className="news-item-wrapper">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`news-item ${item.breaking ? 'breaking' : ''}`}
                >
                  {item.breaking && (
                    <span className="news-breaking-tag">Breaking</span>
                  )}
                  <div className="news-title-row">
                    <p className="news-title">{item.title}</p>
                    {enableAI && sentiment && <SentimentBadge sentiment={sentiment.sentiment} />}
                  </div>
                  <div className="news-meta">
                    <span
                      className="news-source-label"
                      style={{
                        backgroundColor: item.source.color ? `${item.source.color}20` : 'rgba(107, 114, 128, 0.2)',
                        color: item.source.color || '#6B7280',
                      }}
                    >
                      {item.source.title}
                    </span>
                    <span className="news-time">{formatRelativeTime(item.published_at)}</span>
                    {enableAI && (
                      <button
                        className={`news-summary-btn ${isExpanded ? 'active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fetchSummary(item);
                        }}
                      >
                        TL;DR
                      </button>
                    )}
                  </div>
                </a>
                <button
                  className={`news-bookmark-btn ${bookmarks.has(item.id) ? 'bookmarked' : ''}`}
                  onClick={(e) => toggleBookmark(e, item.id)}
                >
                  <BookmarkIcon filled={bookmarks.has(item.id)} />
                </button>

                {isExpanded && (
                  <div className="news-summary-panel">
                    {isLoadingSummary ? (
                      <span>Generating summary...</span>
                    ) : summary ? (
                      <p>{summary}</p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
