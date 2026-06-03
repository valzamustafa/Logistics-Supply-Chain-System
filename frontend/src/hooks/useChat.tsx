import { useEffect, useState } from 'react';
import { chatService, ChatMessageDto } from '../services/chatService';
import { signalRService } from '../services/signalRService';
import { useAuth } from './useAuth';

export const useChat = (otherUserId?: number) => {
    const [messages, setMessages] = useState<ChatMessageDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const loadConversation = async (meId?: number, otherId?: number) => {
        if (!meId || !otherId) return;
        setLoading(true);
        try {
            const data = await chatService.getConversation(meId, otherId);
            setMessages(data);
        } catch (err) {
            console.error('Failed to load conversation', err);
            setError('Failed to load conversation');
        } finally {
            setLoading(false);
        }
    };

    const pushMessage = (msg: ChatMessageDto) => {
        setMessages(prev => {
            if (!msg || !msg.id) return prev;
            const exists = prev.some(m => m.id === msg.id);
            if (exists) return prev;
            return [...prev, msg];
        });
    };

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;
        const handler = (payload: any) => {
            try {
                if ((payload?.Type === 'chat' || payload?.Type === 'ChatMessage') && payload?.Message) {
                    const msg = payload.Message as ChatMessageDto;
                    if (!otherUserId) return;
                    const meId = user?.id ?? Number(localStorage.getItem('userId'));
                    if (!meId) return;
                    if ((msg.senderId === meId && msg.recipientId === otherUserId) || (msg.senderId === otherUserId && msg.recipientId === meId)) {
                        pushMessage(msg);
                    }
                }
            } catch (err) {
                console.error('Chat payload handling error', err);
            }
        };

        unsubscribe = signalRService.onEntityUpdated(handler);
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [otherUserId]);

    return { messages, loading, error, loadConversation, setMessages, pushMessage };
};
