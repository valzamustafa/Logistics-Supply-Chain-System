import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { userService, User } from '../services/userService';
import { signalRService } from '../services/signalRService';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export const useChatUnread = () => {
  const { user } = useAuth();
  const [unread, setUnread] = useState<number>(0);
  const [userMap, setUserMap] = useState<Record<number, string>>({});
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    if (!user || typeof user.id !== 'number') return;
    try {
      const count = await chatService.getUnreadCount(user.id);
      setUnread(count);
    } catch (err) {
      console.error('Failed to refresh chat unread', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user || typeof user.id !== 'number') return;

    let mounted = true;

    const load = async () => {
      try {
        const results = await Promise.allSettled([
          chatService.getUnreadCount(user.id),
          userService.getChatUsers()
        ]);

        const countResult = results[0];
        const usersResult = results[1];

        if (mounted && countResult.status === 'fulfilled') {
          setUnread(countResult.value);
        } else if (countResult.status === 'rejected') {
          console.error('Failed to load unread count', countResult.reason);
        }

        if (mounted && usersResult.status === 'fulfilled') {
          setUserMap(usersResult.value.reduce((map, u) => ({ ...map, [u.id]: `${u.firstName} ${u.lastName}`.trim() || u.email }), {}));
        } else if (usersResult.status === 'rejected') {
          console.error('Failed to load chat users', usersResult.reason);
        }
      } catch (err) {
        console.error('Failed to load chat unread count or users', err);
      }
    };

    const connectChatHub = async () => {
      try {
        await signalRService.connectToChat(user.id);
      } catch (err) {
        console.error('Failed to connect to chat hub:', err);
      }
    };

    load();
    connectChatHub();

    const unsubscribe = signalRService.onEntityUpdated((payload: any) => {
      try {
        const meId = user.id ?? Number(localStorage.getItem('userId'));
        if (!meId) return;

        if ((payload?.Type === 'chat' || payload?.Type === 'ChatMessage') && payload?.Message) {
          const msg = payload.Message as any;
          if (msg.recipientId === meId) {
            setUnread(prev => prev + 1);
            try {
              const senderName = userMap[msg.senderId] || msg.senderName || 'Someone';
              const short = typeof msg.message === 'string' ? msg.message.slice(0, 140) : 'You have a new message';
              showToast('info', `${senderName}: ${short}`);
            } catch {
              // ignore toast errors
            }
          }
        } else if (payload?.Type === 'ChatMessage' && payload?.Notification) {
          const notification = payload.Notification as any;
          if (notification?.UserId === meId) {
            setUnread(prev => prev + 1);
            try {
              const title = notification?.Title || 'New chat message';
              const message = notification?.Message || 'You have a new unread chat message';
              showToast('info', `${title}: ${message}`);
            } catch {
             
            }
          }
        } else if (payload?.Type === 'chatRead') {
       
          if (mounted) {
            refresh();
          }
        }
      } catch (err) {
        console.error('Error handling chat event:', err);
      }
    });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user, refresh, userMap, showToast]);

  return { unread, refresh, setUnread };
};
