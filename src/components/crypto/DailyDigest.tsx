'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';

interface DigestSection {
  title: string;
  content: string;
  url?: string;
  category?: string;
  featured?: boolean;
}

interface DailyDigestData {
  date: string;
  dateLabel: string;
  summary: string;
  summaryUrl?: string;
  sections: DigestSection[];
  generatedAt: string;
}

interface ErrorResponse {
  error: string;
  setup?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw data;
  return data;
};

export default function DailyDigest() {
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [focus, setFocus] = useState<'crypto' | 'tradfi'>('crypto');
  const [dayIndex, setDayIndex] = useState(0);

  const { data: digests, error, isLoading } = useSWR<DailyDigestData[], ErrorResponse>(
    `/api/daily-digest?mode=${mode}&focus=${focus}`,
    fetcher,
    {
      refreshInterval: 10 * 60 * 1000,
      revalidateOnFocus: false,
    }
  );

  const currentDigest = digests?.[dayIndex];
  const canGoNewer = dayIndex > 0;
  const canGoOlder = digests ? dayIndex < digests.length - 1 : false;

  const handleModeChange = (newMode: 'daily' | 'weekly') => {
    setMode(newMode);
    setDayIndex(0);
  };

  const handleFocusChange = (newFocus: 'crypto' | 'tradfi') => {
    setFocus(newFocus);
    setDayIndex(0);
  };

  // Setup required
  if (error?.setup) {
    return (
      <div className="digest-card">
        <div className="digest-masthead">
          <div className="digest-brand">THE BRIEF</div>
          <div className="digest-tagline">AI-Powered Market Intelligence</div>
        </div>
        <div className="digest-setup">
          <p className="digest-setup-title">Quick Setup Required</p>
          <p className="digest-setup-text">
            To generate AI summaries, add a free Groq API key:
          </p>
          <ol className="digest-setup-steps">
            <li>Go to <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a></li>
            <li>Sign up (free) and create an API key</li>
            <li>Add to <code>.env.local</code>:</li>
          </ol>
          <pre className="digest-setup-code">GROQ_API_KEY=your_key_here</pre>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="digest-card">
        <div className="digest-masthead">
          <div className="digest-masthead-left">
            <div className="digest-brand">THE BRIEF</div>
            <div className="digest-tagline">AI-Powered Market Intelligence • {mode === 'weekly' ? 'Last 7 Days' : 'Last 24 Hours'}</div>
          </div>
          <div className="digest-mode-toggle">
            <button className={`digest-mode-btn ${mode === 'daily' ? 'active' : ''}`} disabled>
              Daily
            </button>
            <button className={`digest-mode-btn ${mode === 'weekly' ? 'active' : ''}`} disabled>
              Weekly
            </button>
          </div>
        </div>
        <div className="digest-loading">
          <div className="digest-spinner" />
          <span>Compiling {mode === 'weekly' ? 'weekly' : "today's"} briefing...</span>
        </div>
      </div>
    );
  }

  if (error || !currentDigest) {
    return (
      <div className="digest-card">
        <div className="digest-masthead">
          <div className="digest-brand">THE BRIEF</div>
          <div className="digest-tagline">AI-Powered Market Intelligence</div>
        </div>
        <div className="digest-empty">
          <p>Unable to load briefing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="digest-card">
      {/* Masthead with toggles */}
      <div className="digest-masthead">
        <div className="digest-masthead-left">
          <div className="digest-brand">THE BRIEF</div>
          <div className="digest-tagline">
            AI-Powered {focus === 'crypto' ? 'Crypto' : 'Finance'} Intelligence • {mode === 'weekly' ? 'Last 7 Days' : 'Last 24 Hours'}
          </div>
        </div>
        <div className="digest-controls">
          <div className="digest-focus-toggle">
            <button
              className={`digest-focus-btn ${focus === 'crypto' ? 'active' : ''}`}
              onClick={() => handleFocusChange('crypto')}
            >
              Crypto
            </button>
            <button
              className={`digest-focus-btn ${focus === 'tradfi' ? 'active' : ''}`}
              onClick={() => handleFocusChange('tradfi')}
            >
              TradFi
            </button>
          </div>
          <div className="digest-mode-toggle">
            <button
              className={`digest-mode-btn ${mode === 'daily' ? 'active' : ''}`}
              onClick={() => handleModeChange('daily')}
            >
              Daily
            </button>
            <button
              className={`digest-mode-btn ${mode === 'weekly' ? 'active' : ''}`}
              onClick={() => handleModeChange('weekly')}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* Date Nav - only show for daily mode with multiple days */}
      {mode === 'daily' && digests && digests.length > 1 && (
        <div className="digest-date-bar">
          <button
            className="digest-date-btn"
            onClick={() => setDayIndex(i => i + 1)}
            disabled={!canGoOlder}
          >
            &larr; Older
          </button>
          <div className="digest-date-text">{currentDigest.dateLabel}</div>
          <button
            className="digest-date-btn"
            onClick={() => setDayIndex(i => i - 1)}
            disabled={!canGoNewer}
          >
            Newer &rarr;
          </button>
        </div>
      )}

      {/* Section Bullets - grouped by category */}
      <div className="digest-sections">
        {(() => {
          // Group sections by category
          const grouped = new Map<string, typeof currentDigest.sections>();
          currentDigest.sections.forEach(section => {
            const cat = section.category || 'General';
            if (!grouped.has(cat)) grouped.set(cat, []);
            grouped.get(cat)!.push(section);
          });

          const renderSection = (section: typeof currentDigest.sections[0], idx: number) => {
            const content = (
              <>
                {section.featured && <span className="digest-featured-star">★</span>}
                <span className="digest-section-text">{section.content}</span>
              </>
            );

            return section.url ? (
              <a
                key={idx}
                href={section.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`digest-section clickable${section.featured ? ' featured' : ''}`}
              >
                {content}
              </a>
            ) : (
              <div key={idx} className={`digest-section${section.featured ? ' featured' : ''}`}>
                {content}
              </div>
            );
          };

          // If no categories, render flat list
          if (grouped.size === 1 && grouped.has('General')) {
            return currentDigest.sections.map((section, idx) => renderSection(section, idx));
          }

          // Render by category
          return Array.from(grouped.entries()).map(([category, sections]) => (
            <div key={category} className="digest-category">
              <div className="digest-category-header">{category}</div>
              {sections.map((section, idx) => renderSection(section, idx))}
            </div>
          ));
        })()}
      </div>

      {/* Footer */}
      <div className="digest-attribution">
        Sources: CoinDesk, Bloomberg, The Block, Reuters
      </div>
    </div>
  );
}
