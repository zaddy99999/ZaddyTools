// Notification system for milestone alerts
const NOTIFICATIONS_KEY = 'zaddytools_notifications';
const MILESTONES_KEY = 'zaddytools_milestones';
const DISMISSED_KEY = 'zaddytools_dismissed_notifications';

export interface Notification {
  id: string;
  type: 'milestone' | 'trending' | 'alert';
  title: string;
  message: string;
  channelName?: string;
  channelUrl?: string;
  timestamp: number;
  read: boolean;
}

export interface MilestoneConfig {
  channelUrl: string;
  channelName: string;
  thresholds: {
    giphyViews?: number[];
    tiktokFollowers?: number[];
    youtubeSubscribers?: number[];
  };
}

// Standard milestones to check
const GIPHY_MILESTONES = [100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 500000000, 1000000000];
const TIKTOK_MILESTONES = [1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];
const YOUTUBE_MILESTONES = [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 10000000];

export function getNotifications(): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification {
  const notifications = getNotifications();
  const newNotification: Notification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    read: false,
  };
  notifications.unshift(newNotification);
  // Keep only last 50 notifications
  const trimmed = notifications.slice(0, 50);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
  return newNotification;
}

export function markAsRead(id: string): void {
  const notifications = getNotifications();
  const updated = notifications.map(n =>
    n.id === id ? { ...n, read: true } : n
  );
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
}

export function markAllAsRead(): void {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
}

export function clearNotifications(): void {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([]));
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}

// Dismissed milestones tracking
function getDismissedMilestones(): Record<string, number[]> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setDismissedMilestone(key: string, milestone: number): void {
  const dismissed = getDismissedMilestones();
  if (!dismissed[key]) dismissed[key] = [];
  if (!dismissed[key].includes(milestone)) {
    dismissed[key].push(milestone);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  }
}

// Check for milestones and create notifications
export function checkMilestones(channels: Array<{
  channelName: string;
  channelUrl: string;
  totalViews: number;
  tiktokFollowers?: number | null;
  youtubeSubscribers?: number | null;
}>): Notification[] {
  const newNotifications: Notification[] = [];
  const dismissed = getDismissedMilestones();

  for (const channel of channels) {
    // Check GIPHY milestones
    for (const milestone of GIPHY_MILESTONES) {
      const key = `giphy_${channel.channelUrl}`;
      if (channel.totalViews >= milestone &&
          (!dismissed[key] || !dismissed[key].includes(milestone))) {
        const notification = addNotification({
          type: 'milestone',
          title: 'GIPHY Milestone!',
          message: `${channel.channelName} reached ${formatMilestone(milestone)} GIPHY views!`,
          channelName: channel.channelName,
          channelUrl: channel.channelUrl,
        });
        newNotifications.push(notification);
        setDismissedMilestone(key, milestone);
      }
    }

    // Check TikTok milestones
    if (channel.tiktokFollowers) {
      for (const milestone of TIKTOK_MILESTONES) {
        const key = `tiktok_${channel.channelUrl}`;
        if (channel.tiktokFollowers >= milestone &&
            (!dismissed[key] || !dismissed[key].includes(milestone))) {
          const notification = addNotification({
            type: 'milestone',
            title: 'TikTok Milestone!',
            message: `${channel.channelName} reached ${formatMilestone(milestone)} TikTok followers!`,
            channelName: channel.channelName,
            channelUrl: channel.channelUrl,
          });
          newNotifications.push(notification);
          setDismissedMilestone(key, milestone);
        }
      }
    }

    // Check YouTube milestones
    if (channel.youtubeSubscribers) {
      for (const milestone of YOUTUBE_MILESTONES) {
        const key = `youtube_${channel.channelUrl}`;
        if (channel.youtubeSubscribers >= milestone &&
            (!dismissed[key] || !dismissed[key].includes(milestone))) {
          const notification = addNotification({
            type: 'milestone',
            title: 'YouTube Milestone!',
            message: `${channel.channelName} reached ${formatMilestone(milestone)} YouTube subscribers!`,
            channelName: channel.channelName,
            channelUrl: channel.channelUrl,
          });
          newNotifications.push(notification);
          setDismissedMilestone(key, milestone);
        }
      }
    }
  }

  return newNotifications;
}

function formatMilestone(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000) + 'M';
  if (num >= 1_000) return (num / 1_000) + 'K';
  return num.toString();
}
