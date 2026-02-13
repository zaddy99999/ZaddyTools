'use client';

import { useEffect, useState, useRef } from 'react';
import { ChannelDisplayData } from '@/lib/types';

interface Props {
  channels: ChannelDisplayData[];
  lastUpdated?: string | null;
}

// Animated counter hook
function useAnimatedCounter(targetValue: number, duration: number = 1500): number {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) {
        startTime.current = timestamp;
      }

      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue.current + (targetValue - startValue.current) * easeOutQuart);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      }
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
}

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function AnimatedStat({ value, label, prefix = '', suffix = '', color = '#2edb84' }: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  color?: string;
}) {
  const animatedValue = useAnimatedCounter(value);

  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>
        {prefix}{formatLargeNumber(animatedValue)}{suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function StatsOverview({ channels, lastUpdated }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate aggregate stats
  const totalGiphyViews = channels.reduce((sum, ch) => sum + ch.totalViews, 0);
  const totalTiktokFollowers = channels.reduce((sum, ch) => sum + (ch.tiktokFollowers || 0), 0);
  const totalYoutubeSubscribers = channels.reduce((sum, ch) => sum + (ch.youtubeSubscribers || 0), 0);
  const totalDailyGrowth = channels.reduce((sum, ch) => sum + (ch.delta1d || 0), 0);

  // Calculate trending channels (positive growth)
  const trendingChannels = channels.filter(ch => (ch.delta1d || 0) > 0).length;

  // Calculate average growth rate
  const channelsWithGrowth = channels.filter(ch => ch.delta1d !== null);
  const avgGrowthRate = channelsWithGrowth.length > 0
    ? channelsWithGrowth.reduce((sum, ch) => sum + (ch.delta1d || 0), 0) / channelsWithGrowth.length
    : 0;

  // Find top performer
  const topPerformer = [...channels].sort((a, b) => (b.delta1d || 0) - (a.delta1d || 0))[0];

  if (!mounted) {
    return (
      <div className="stats-overview">
        <div className="stats-grid">
          <div className="stat-card loading">
            <div className="stat-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-overview">
      {/* Last Updated Timestamp */}
      {lastUpdated && (
        <div className="last-updated">
          <span className="update-dot" />
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}

      <div className="stats-grid">
        <AnimatedStat
          value={totalGiphyViews}
          label="Total GIPHY Views"
          color="#00D4FF"
        />
        <AnimatedStat
          value={totalTiktokFollowers}
          label="Total TikTok Followers"
          color="#FF3366"
        />
        <AnimatedStat
          value={totalYoutubeSubscribers}
          label="Total YouTube Subs"
          color="#FF0000"
        />
        <AnimatedStat
          value={totalDailyGrowth}
          label="24h GIPHY Growth"
          prefix={totalDailyGrowth >= 0 ? '+' : ''}
          color={totalDailyGrowth >= 0 ? '#2edb84' : '#ef4444'}
        />
        <AnimatedStat
          value={trendingChannels}
          label="Channels Trending Up"
          color="#FFD700"
        />
        <AnimatedStat
          value={Math.round(avgGrowthRate)}
          label="Avg Daily Growth"
          prefix={avgGrowthRate >= 0 ? '+' : ''}
          color={avgGrowthRate >= 0 ? '#2edb84' : '#ef4444'}
        />
      </div>

      {/* Top Performer Highlight */}
      {topPerformer && topPerformer.delta1d && topPerformer.delta1d > 0 && (
        <div className="top-performer">
          <span className="top-performer-label">Today's Top Performer</span>
          <div className="top-performer-content">
            {topPerformer.logoUrl && (
              <img src={topPerformer.logoUrl} alt="" className="top-performer-logo" />
            )}
            <span className="top-performer-name">{topPerformer.channelName}</span>
            <span className="top-performer-growth">
              +{formatLargeNumber(topPerformer.delta1d)} views
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
