'use client';

// Re-export all charts from the new modular location for backwards compatibility
export {
  TotalViewsChart,
  GifCountChart,
  DailyGrowthChart,
  TikTokFollowersChart,
  TikTokLikesChart,
  YouTubeSubscribersChart,
  YouTubeViewsChart,
} from './giphy-charts';

// Re-export utilities and types for backwards compatibility
export {
  formatNumber,
  BAR_COLORS,
  copyChartToClipboard,
  CustomTooltip,
  CustomXAxisTick,
} from './giphy-charts';
export type { TimePeriod, ScaleType, ChartProps } from './giphy-charts';
