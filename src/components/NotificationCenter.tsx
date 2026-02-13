'use client';

import { useState, useEffect } from 'react';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  getUnreadCount,
  Notification,
} from '@/lib/notifications';

interface Props {
  onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationCenter({ onNotificationClick }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setNotifications(getNotifications());
    setUnreadCount(getUnreadCount());
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Refresh notifications when opening
      setNotifications(getNotifications());
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
      setNotifications(getNotifications());
      setUnreadCount(getUnreadCount());
    }
    onNotificationClick?.(notification);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    setNotifications(getNotifications());
    setUnreadCount(0);
  };

  const handleClear = () => {
    clearNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'milestone':
        return '🏆';
      case 'trending':
        return '🔥';
      case 'alert':
        return '🔔';
      default:
        return '📢';
    }
  };

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={handleToggle}
        title="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="notification-overlay" onClick={() => setIsOpen(false)} />
          <div className="notification-dropdown">
            <div className="notification-header">
              <h4>Notifications</h4>
              <div className="notification-actions">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-btn">
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={handleClear} className="text-btn danger">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <span>🔔</span>
                  <p>No notifications yet</p>
                  <small>You will receive alerts for milestone achievements</small>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className="notification-icon">{getIcon(notification.type)}</span>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{formatTime(notification.timestamp)}</div>
                    </div>
                    {!notification.read && <span className="unread-dot" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
