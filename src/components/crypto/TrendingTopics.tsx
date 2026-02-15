'use client';

import { useMemo } from 'react';
import useSWR from 'swr';

interface Topic {
  word: string;
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface TrendingTopicsData {
  topics: Topic[];
  lastUpdated: string;
}

interface TreemapItem extends Topic {
  x: number;
  y: number;
  width: number;
  height: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const SENTIMENT_COLORS = {
  positive: '#2edb84',
  negative: '#ef4444',
  neutral: '#6366f1',
};

// Simple row-based treemap that ensures readable boxes
function layoutTreemap(items: Topic[], containerWidth: number, containerHeight: number): TreemapItem[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((sum, item) => sum + item.count, 0);
  const result: TreemapItem[] = [];

  // Split into rows based on count thresholds
  // Row 1: Top 3 items (largest)
  // Row 2: Next 5 items
  // Row 3: Next 6 items
  // Row 4: Remaining items
  const row1 = sorted.slice(0, 3);
  const row2 = sorted.slice(3, 8);
  const row3 = sorted.slice(8, 14);
  const row4 = sorted.slice(14);

  const rows = [row1, row2, row3, row4].filter(r => r.length > 0);

  // Calculate row heights based on total count in each row
  const rowTotals = rows.map(row => row.reduce((sum, item) => sum + item.count, 0));
  const grandTotal = rowTotals.reduce((sum, t) => sum + t, 0);

  let currentY = 0;

  rows.forEach((row, rowIndex) => {
    const rowHeight = (rowTotals[rowIndex] / grandTotal) * containerHeight;
    const rowTotal = rowTotals[rowIndex];

    let currentX = 0;

    row.forEach((item) => {
      const itemWidth = (item.count / rowTotal) * containerWidth;

      result.push({
        ...item,
        x: currentX,
        y: currentY,
        width: itemWidth,
        height: rowHeight,
      });

      currentX += itemWidth;
    });

    currentY += rowHeight;
  });

  return result;
}

export default function TrendingTopics() {
  const { data, isLoading, error } = useSWR<TrendingTopicsData>(
    '/api/crypto/trending-topics',
    fetcher,
    { refreshInterval: 300000 }
  );

  const topics = useMemo(() => {
    if (!data?.topics || data.topics.length === 0) return [];
    return data.topics.slice(0, 20);
  }, [data]);

  const treemapItems = useMemo(() => {
    if (!topics.length) return [];
    return layoutTreemap(topics, 100, 100);
  }, [topics]);

  const maxCount = useMemo(() => {
    if (!topics.length) return 1;
    return Math.max(...topics.map(t => t.count));
  }, [topics]);

  if (isLoading) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Trending Topics</span>
        <div style={{ height: 280, background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginTop: '0.75rem' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Trending Topics</span>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '1rem' }}>Failed to load topics</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '12px',
      padding: '1rem',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Trending Topics</span>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginLeft: '0.5rem' }}>Social mentions (24h)</span>
        </div>
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{topics.length} topics</span>
      </div>

      {/* Treemap */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '320px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'rgba(0,0,0,0.2)',
      }}>
        {treemapItems.map((item) => {
          const color = SENTIMENT_COLORS[item.sentiment] || SENTIMENT_COLORS.neutral;
          const intensity = 0.25 + (item.count / maxCount) * 0.45;

          return (
            <div
              key={item.word}
              style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                height: `${item.height}%`,
                background: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
                border: '1px solid rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.35rem',
                boxSizing: 'border-box',
                cursor: 'default',
                transition: 'all 0.15s ease',
                overflow: 'hidden',
              }}
              title={`${item.word}: ${item.count.toLocaleString()} mentions (${item.sentiment})`}
              onMouseEnter={(e) => {
                e.currentTarget.style.zIndex = '10';
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow = `0 4px 16px ${color}60`;
                e.currentTarget.style.border = `2px solid ${color}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.zIndex = '';
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.border = '1px solid rgba(0,0,0,0.5)';
              }}
            >
              <span style={{
                fontSize: item.height > 20 ? '0.7rem' : '0.55rem',
                fontWeight: 600,
                color: '#fff',
                textAlign: 'center',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                lineHeight: 1.2,
                wordBreak: 'break-word',
                maxWidth: '100%',
              }}>
                {item.word}
              </span>
              {item.height > 18 && (
                <span style={{
                  fontSize: '0.5rem',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: '0.15rem',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}>
                  {item.count.toLocaleString()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '2px', background: SENTIMENT_COLORS.positive }}></span>Bullish
          </span>
          <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '2px', background: SENTIMENT_COLORS.negative }}></span>Bearish
          </span>
          <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '2px', background: SENTIMENT_COLORS.neutral }}></span>Neutral
          </span>
        </div>
        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)' }}>Size = mention volume</span>
      </div>
    </div>
  );
}
