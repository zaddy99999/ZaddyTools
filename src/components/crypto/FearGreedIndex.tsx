'use client';

import type { FearGreedData } from '@/lib/crypto/types';

interface FearGreedIndexProps {
  data?: FearGreedData;
  isLoading?: boolean;
}

export default function FearGreedIndex({ data, isLoading }: FearGreedIndexProps) {
  if (isLoading || !data) {
    return <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, height: 60 }} />;
  }

  const value = parseInt(data?.value || '50', 10);
  const classification = data?.value_classification || 'Neutral';

  const getColor = (val: number) => {
    if (val <= 25) return '#ef4444';
    if (val <= 45) return '#f97316';
    if (val <= 55) return '#eab308';
    if (val <= 75) return '#84cc16';
    return '#22c55e';
  };

  const color = getColor(value);

  return (
    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header + Value inline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Sentiment</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color, padding: '0.15rem 0.4rem', background: `${color}20`, borderRadius: 4 }}>
            {classification}
          </span>
        </div>
      </div>

      {/* Gauge Bar */}
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e)', overflow: 'visible' }}>
        <div style={{
          position: 'absolute',
          left: `${value}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#fff',
          border: `2px solid ${color}`,
          boxShadow: '0 0 4px rgba(0,0,0,0.3)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '0.5rem', color: '#ef4444' }}>Fear</span>
        <span style={{ fontSize: '0.5rem', color: '#22c55e' }}>Greed</span>
      </div>
    </div>
  );
}
