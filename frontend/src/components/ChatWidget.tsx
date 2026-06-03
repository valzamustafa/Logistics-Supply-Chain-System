import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { chatService } from '../services/chatService';
import { useToast } from '../hooks/useToast';
import { useChatUnread } from '../hooks/useChatUnread';

export const ChatWidget: React.FC<{ otherUserId: number; otherUserName?: string }> = ({ otherUserId, otherUserName }) => {
    const { user } = useAuth();
    const { refresh: refreshUnread } = useChatUnread();
    const { messages, loading, loadConversation, setMessages, pushMessage } = useChat(otherUserId);
    const { showToast } = useToast();
    const [text, setText] = useState('');
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!user) return;
        loadConversation(user.id, otherUserId);
    }, [user, otherUserId]);


    useEffect(() => {
        if (!user || !otherUserId) return;
        let mounted = true;
        const markRead = async () => {
            try {
                const res = await chatService.markConversationRead(user.id, otherUserId);
                if (!mounted) return;
                if (res && typeof res.updated === 'number' && res.updated > 0) {

                    setMessages(prev => prev.map(m => ({ ...m, isRead: true })));

                    await refreshUnread();

                }
            } catch (err) {

            }
        };

        markRead();

        return () => { mounted = false; };
    }, [messages.length, user, otherUserId, setMessages, refreshUnread]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!user) return;
        if (!text.trim()) return;
        try {
            const sent = await chatService.sendMessage({ senderId: user.id, recipientId: otherUserId, message: text.trim() });
            pushMessage(sent);
            setText('');
            showToast('success', `Message sent to ${otherUserName || 'the user'} successfully.`);
        } catch (err) {
            console.error('Failed to send chat message', err);
            showToast('error', 'Failed to send chat message. Please try again.');
        }
    };

    return (
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow p-3">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="text-sm font-semibold">Chat with {otherUserName || `User ${otherUserId}`}</div>
                    <div className="text-xs text-slate-500">Instant messages</div>
                </div>
            </div>

            <div className="h-64 overflow-y-auto mb-3 space-y-2">
                {loading && <div className="text-sm text-slate-500">Loading...</div>}
                {messages.map(m => (
                    <div key={m.id} className={`p-2 rounded ${m.senderId === user?.id ? 'bg-cyan-500/10 self-end text-right' : 'bg-slate-100'}`}>
                        <div className="text-sm text-slate-900">{m.message}</div>
                        <div className="text-xs text-slate-500 mt-1">{new Date(m.sentAt).toLocaleString()}</div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="flex gap-2">
                <input value={text} onChange={e => setText(e.target.value)} className="flex-1 border border-slate-200 rounded px-3 py-2" />
                <button onClick={handleSend} className="px-3 py-2 bg-cyan-600 text-slate-900 rounded">Send</button>
            </div>
        </div>
    );
};
