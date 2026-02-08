export type ChannelCategory = 'web2' | 'web3';

export interface ChannelConfig {
  url: string;
  rank: number;
  category: ChannelCategory;
  isAbstract?: boolean;
  tiktokUrl?: string;
}

export interface ScrapedChannel {
  channelName: string;
  channelUrl: string;
  rank: number;
  category: ChannelCategory;
  isAbstract: boolean;
  logoUrl: string | null;
  totalViews: number;
  gifCount: number | null;
  parseFailed: boolean;
  errorMessage: string | null;
  // TikTok stats
  tiktokUrl?: string;
  tiktokFollowers?: number | null;
  tiktokLikes?: number | null;
}

export interface DailyLogRow {
  date: string;
  timestamp: string;
  channelName: string;
  channelUrl: string;
  rank: number;
  category: ChannelCategory;
  logoUrl: string | null;
  totalViews: number | null;
  parseFailed: boolean;
  errorMessage: string | null;
}

export interface LatestRow {
  channelName: string;
  channelUrl: string;
  rank: number;
  category: ChannelCategory;
  logoUrl: string | null;
  totalViews: number;
  date: string;
  timestamp: string;
}

export interface MetricsRow {
  channelName: string;
  channelUrl: string;
  rank: number;
  category: ChannelCategory;
  logoUrl: string | null;
  latestTotalViews: number;
  delta1d: number | null;
  avg7dDelta: number | null;
  lastUpdated: string;
}

export interface RunStatus {
  lastRunTime: string | null;
  status: 'success' | 'partial' | 'failed' | 'never_run';
  channelsProcessed: number;
  channelsFailed: number;
}

export interface ChannelDisplayData {
  channelName: string;
  channelUrl: string;
  rank: number;
  category: ChannelCategory;
  isAbstract: boolean;
  logoUrl: string | null;
  totalViews: number;
  gifCount: number | null;
  delta1d: number | null;
  avg7dDelta: number | null;
  // TikTok stats
  tiktokUrl?: string;
  tiktokFollowers?: number | null;
  tiktokLikes?: number | null;
}
