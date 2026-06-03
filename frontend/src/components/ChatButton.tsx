
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatUnread } from '../hooks/useChatUnread';

export const ChatButton: React.FC<{ onOpenChat: () => void }> = ({ onOpenChat }) => {
    const { unread } = useChatUnread();

    return (
        <button
            onClick={onOpenChat}
            className="relative inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
            <MessageCircle className="w-4 h-4" />
            Chat
            {unread > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
          {unread}
        </span>
            )}
        </button>
    );
};
