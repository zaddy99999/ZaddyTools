'use client';

import React from 'react';

interface MiniSparklineProps {
  data: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
}

const MiniSparkline = React.memo(function MiniSparkline({
  data,
  isPositive,
  width = 60,
  height = 24,
}: MiniSparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Create SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const color = isPositive ? '#2edb84' : '#ef4444';
  const trendDirection = isPositive ? 'upward' : 'downward';

  return (
    <svg
      width={width}
      height={height}
      className="sparkline"
      role="img"
      aria-label={`Price trend sparkline showing ${trendDirection} movement over the past 7 days`}
    >
      <title>{`${trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1)} price trend`}</title>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default MiniSparkline;
