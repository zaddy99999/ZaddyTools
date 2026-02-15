'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';

interface Tweet {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
    verified: boolean;
  };
  created_at: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
  url: string;
}

interface Account {
  id: string;
  username: string;
  name: string;
  verified: boolean;
  profile_image_url: string;
}

interface TwitterFeedResponse {
  tweets: Tweet[];
  source: 'twitter' | 'nitter' | 'mock' | 'cache';
  accounts: Account[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Parse tweet text to highlight mentions, hashtags, and links
function parseTweetText(text: string): React.ReactNode {
  // Split by special patterns
  const parts = text.split(/(@\w+|#\w+|https?:\/\/\S+)/g);

  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="tweet-mention">
          {part}
        </span>
      );
    }
    if (part.startsWith('#')) {
      return (
        <span key={i} className="tweet-hashtag">
          {part}
        </span>
      );
    }
    if (part.startsWith('http')) {
      const displayUrl = part.replace(/^https?:\/\//, '').slice(0, 25);
      return (
        <span key={i} className="tweet-link">
          {displayUrl}...
        </span>
      );
    }
    return part;
  });
}

export default function TwitterFeed() {
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading, error } = useSWR<TwitterFeedResponse>(
    '/api/twitter/feed',
    fetcher,
    {
      refreshInterval: 120000, // 2 minutes
      revalidateOnFocus: false,
    }
  );

  const tweets = data?.tweets || [];
  const accounts = data?.accounts || [];

  // Get unique usernames for filter tabs
  const uniqueUsernames = useMemo(() => {
    const usernames = new Set<string>();
    tweets.forEach(t => usernames.add(t.author.username));
    return Array.from(usernames);
  }, [tweets]);

  // Filter tweets
  const filteredTweets = useMemo(() => {
    if (filter === 'all') return tweets;
    return tweets.filter(t => t.author.username === filter);
  }, [tweets, filter]);

  if (isLoading) {
    return (
      <div className="twitter-card loading">
        <div className="twitter-header">
          <div className="twitter-header-left">
            <span className="twitter-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </span>
            <p className="widget-label">Crypto Twitter</p>
          </div>
        </div>
        <div className="tweet-list">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton skeleton-tweet" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="twitter-card">
        <div className="twitter-header">
          <div className="twitter-header-left">
            <span className="twitter-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </span>
            <p className="widget-label">Crypto Twitter</p>
          </div>
        </div>
        <div className="twitter-empty">
          <p>Unable to load tweets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="twitter-card">
      <div className="twitter-header">
        <div className="twitter-header-left">
          <span className="twitter-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </span>
          <p className="widget-label">Crypto Twitter</p>
        </div>
        {data?.source === 'mock' && (
          <span className="twitter-source-badge">Demo Data</span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="twitter-filters">
        <button
          className={`twitter-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {uniqueUsernames.slice(0, 4).map(username => (
          <button
            key={username}
            className={`twitter-filter-btn ${filter === username ? 'active' : ''}`}
            onClick={() => setFilter(username)}
          >
            @{username.slice(0, 10)}
          </button>
        ))}
      </div>

      {/* Tweet List */}
      <div className="tweet-list">
        {filteredTweets.length === 0 ? (
          <div className="twitter-empty">
            <p>No tweets to display</p>
          </div>
        ) : (
          filteredTweets.map((tweet) => (
            <a
              key={tweet.id}
              href={tweet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tweet-item"
            >
              <img
                src={tweet.author.profile_image_url}
                alt={tweet.author.name}
                className="tweet-avatar"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/ZaddyPFP.png';
                }}
              />
              <div className="tweet-content">
                <div className="tweet-header">
                  <span className="tweet-name">{tweet.author.name}</span>
                  {tweet.author.verified && (
                    <span className="tweet-verified">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                      </svg>
                    </span>
                  )}
                  <span className="tweet-username">@{tweet.author.username}</span>
                  <span className="tweet-separator">·</span>
                  <span className="tweet-time">{formatTimeAgo(tweet.created_at)}</span>
                </div>
                <p className="tweet-text">{parseTweetText(tweet.text)}</p>
                <div className="tweet-metrics">
                  <span className="tweet-metric">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
                    </svg>
                    {formatNumber(tweet.metrics.replies)}
                  </span>
                  <span className="tweet-metric">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
                    </svg>
                    {formatNumber(tweet.metrics.retweets)}
                  </span>
                  <span className="tweet-metric">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
                    </svg>
                    {formatNumber(tweet.metrics.likes)}
                  </span>
                </div>
              </div>
            </a>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="twitter-footer">
        <span className="twitter-footer-text">
          {data?.source === 'mock' ? 'Demo data - add TWITTER_BEARER_TOKEN for live feed' : 'Live crypto updates'}
        </span>
      </div>
    </div>
  );
}
