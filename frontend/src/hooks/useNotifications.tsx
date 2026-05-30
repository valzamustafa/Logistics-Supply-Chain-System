import { useEffect, useState } from 'react';
import { notificationService, NotificationDto, SendNotificationDto } from '../services/notificationService';
import { signalRService } from '../services/signalRService';

export const useNotifications = (userId?: number) => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Load initial notifications
  const loadNotifications = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const [allNotifications, unread] = await Promise.all([
        notificationService.getUserNotifications(userId),
        notificationService.getUnreadCount(userId)
      ]);
      setNotifications(allNotifications);
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };


  const toggleOpen = () => {
    setOpen(prev => !prev);
  };

  const closeDropdown = () => {
    setOpen(false);
  };

  const refresh = () => {
    loadNotifications();
  };


  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const initializeSignalR = async () => {
      try {
        await signalRService.connect(userId);
        if (mounted) {
          setIsConnected(true);
          setError(null);
        }
      } catch (err) {
        console.error('SignalR connection error:', err);
        if (mounted) {
          setIsConnected(false);
          setError('Real-time connection failed. Notifications will still work but may not be real-time.');
        }
      }
    };

    
    loadNotifications();

   
    initializeSignalR();

   
    const unsubscribe = signalRService.onNotificationReceived((notification: NotificationDto) => {
      if (mounted) {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.isRead) {
          setUnreadCount(prev => prev + 1);
        }
      }
    });


    return () => {
      mounted = false;
      unsubscribe();
      signalRService.disconnect();
    };
  }, [userId]);

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) {
      console.warn('markAllAsRead called without userId, skipping');
      return;
    }

    try {
      await notificationService.markAllAsRead(userId);
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const sendNotification = async (dto: SendNotificationDto) => {
    try {
      const notification = await notificationService.sendNotification(dto);
      return notification;
    } catch (err) {
      console.error('Failed to send notification:', err);
      throw err;
    }
  };

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    isLoading,
    open,
    toggleOpen,
    closeDropdown,
    markAsRead,
    markAllAsRead,
    sendNotification,
    refreshNotifications: loadNotifications,
    refresh
  };
};