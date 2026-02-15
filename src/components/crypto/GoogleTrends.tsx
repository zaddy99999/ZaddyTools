'use client';

import { useState, useMemo } from 'react';

// Niche configurations with 5 terms each
const NICHES = {
  crypto: {
    label: 'Crypto',
    color: '#f7931a',
    terms: ['Bitcoin', 'Ethereum', 'Solana', 'DeFi', 'NFT'],
  },
  ai: {
    label: 'AI',
    color: '#8b5cf6',
    terms: ['ChatGPT', 'Claude AI', 'AI Agents', 'Machine Learning', 'LLM'],
  },
  finance: {
    label: 'Finance',
    color: '#22c55e',
    terms: ['S&P 500', 'Interest Rates', 'Inflation', 'Stock Market', 'Fed'],
  },
  tech: {
    label: 'Tech',
    color: '#3b82f6',
    terms: ['Apple', 'Tesla', 'Nvidia', 'Cloud Computing', 'Quantum'],
  },
};

type NicheKey = keyof typeof NICHES;

// Simulated trend data (in production, would come from API)
function generateTrendData(niche: NicheKey): { term: string; interest: number; change: number; trend: 'up' | 'down' | 'stable' }[] {
  const terms = NICHES[niche].terms;
  // Generate pseudo-random but consistent data based on term
  return terms.map(term => {
    const hash = term.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const interest = 30 + (hash % 70);
    const changeBase = ((hash * 7) % 40) - 20;
    return {
      term,
      interest,
      change: changeBase,
      trend: changeBase > 5 ? 'up' : changeBase < -5 ? 'down' : 'stable',
    };
  });
}

export default function GoogleTrends() {
  const [activeNiche, setActiveNiche] = useState<NicheKey>('crypto');

  const trendData = useMemo(() => generateTrendData(activeNiche), [activeNiche]);
  const nicheColor = NICHES[activeNiche].color;

  // Calculate average interest for the niche
  const avgInterest = Math.round(trendData.reduce((sum, t) => sum + t.interest, 0) / trendData.length);
  const overallTrend = trendData.filter(t => t.trend === 'up').length > 2 ? 'Rising' :
                       trendData.filter(t => t.trend === 'down').length > 2 ? 'Falling' : 'Stable';

  return (
    <div className="trends-v2">
      {/* Header with niche toggles */}
      <div className="tv2-header">
        <span className="tv2-title">Search Trends</span>
        <div className="tv2-toggles">
          {(Object.keys(NICHES) as NicheKey[]).map(key => (
            <button
              key={key}
              className={`tv2-toggle ${activeNiche === key ? 'active' : ''}`}
              style={{ '--toggle-color': NICHES[key].color } as React.CSSProperties}
              onClick={() => setActiveNiche(key)}
            >
              {NICHES[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Niche Overview */}
      <div className="tv2-overview" style={{ borderColor: nicheColor }}>
        <div className="tv2-ov-stat">
          <span className="tv2-ov-value" style={{ color: nicheColor }}>{avgInterest}/100</span>
          <span className="tv2-ov-label">Interest Level</span>
        </div>
        <div className="tv2-ov-stat">
          <span className={`tv2-ov-value ${overallTrend === 'Rising' ? 'positive' : overallTrend === 'Falling' ? 'negative' : ''}`}>
            {overallTrend === 'Rising' ? '↗' : overallTrend === 'Falling' ? '↘' : '→'} {overallTrend}
          </span>
          <span className="tv2-ov-label">Trend</span>
        </div>
      </div>

      {/* Visual Term Bubbles */}
      <div className="tv2-bubbles">
        {trendData.map((item, idx) => {
          const size = 40 + (item.interest / 100) * 50; // 40-90px based on interest
          return (
            <div
              key={item.term}
              className="tv2-bubble"
              style={{
                '--bubble-size': `${size}px`,
                '--bubble-color': nicheColor,
                '--bubble-opacity': 0.3 + (item.interest / 100) * 0.7,
                animationDelay: `${idx * 0.1}s`,
              } as React.CSSProperties}
              title={`${item.term}: ${item.interest} interest, ${item.change > 0 ? '+' : ''}${item.change}% change`}
            >
              <span className="tv2-bubble-term">{item.term}</span>
              <span className={`tv2-bubble-change ${item.trend}`}>
                {item.change > 0 ? '+' : ''}{item.change}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Trend List */}
      <div className="tv2-list">
        {trendData.sort((a, b) => b.interest - a.interest).map((item, idx) => (
          <div key={item.term} className="tv2-list-item">
            <span className="tv2-rank">{idx + 1}</span>
            <span className="tv2-term">{item.term}</span>
            <div className="tv2-bar-wrap">
              <div
                className="tv2-bar"
                style={{
                  width: `${item.interest}%`,
                  background: nicheColor,
                  opacity: 0.3 + (item.interest / 100) * 0.7,
                }}
              />
            </div>
            <span className={`tv2-change ${item.trend}`}>
              {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '–'}
              {Math.abs(item.change)}%
            </span>
          </div>
        ))}
      </div>

      <div className="tv2-footer">
        <a
          href={`https://trends.google.com/trends/explore?q=${NICHES[activeNiche].terms.join(',')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          View on Google Trends
        </a>
      </div>
    </div>
  );
}
