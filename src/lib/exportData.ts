// CSV Export functionality
import { ChannelDisplayData } from './types';

export function exportToCSV(channels: ChannelDisplayData[], filename: string = 'zaddytools-export'): void {
  const headers = [
    'Rank',
    'Channel Name',
    'Category',
    'Is Abstract',
    'GIPHY Views',
    'GIPHY Daily Change',
    'GIPHY 7d Avg',
    'TikTok Followers',
    'TikTok Likes',
    'YouTube Subscribers',
    'YouTube Views',
    'YouTube Video Count',
    'GIPHY URL',
    'TikTok URL',
    'YouTube URL',
  ];

  const rows = channels.map((ch, index) => [
    index + 1,
    `"${ch.channelName.replace(/"/g, '""')}"`,
    ch.category,
    ch.isAbstract ? 'Yes' : 'No',
    ch.totalViews,
    ch.delta1d ?? '',
    ch.avg7dDelta ?? '',
    ch.tiktokFollowers ?? '',
    ch.tiktokLikes ?? '',
    ch.youtubeSubscribers ?? '',
    ch.youtubeViews ?? '',
    ch.youtubeVideoCount ?? '',
    ch.channelUrl,
    ch.tiktokUrl ?? '',
    ch.youtubeUrl ?? '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON(channels: ChannelDisplayData[], filename: string = 'zaddytools-export'): void {
  const data = {
    exportedAt: new Date().toISOString(),
    totalChannels: channels.length,
    channels: channels.map((ch, index) => ({
      rank: index + 1,
      channelName: ch.channelName,
      category: ch.category,
      isAbstract: ch.isAbstract,
      giphy: {
        views: ch.totalViews,
        dailyChange: ch.delta1d,
        avg7dDelta: ch.avg7dDelta,
        url: ch.channelUrl,
      },
      tiktok: ch.tiktokFollowers ? {
        followers: ch.tiktokFollowers,
        likes: ch.tiktokLikes,
        url: ch.tiktokUrl,
      } : null,
      youtube: ch.youtubeSubscribers ? {
        subscribers: ch.youtubeSubscribers,
        views: ch.youtubeViews,
        videoCount: ch.youtubeVideoCount,
        url: ch.youtubeUrl,
      } : null,
    })),
  };

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
