import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatUnread } from '../hooks/useChatUnread';

export const ChatButton: React.FC<{ onOpenChat: () => void }> = ({ onOpenChat }) => {
  const { unread } = useChatUnread();

  return (
    <button
      onClick={onOpenChat}
      className="relative inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
    >
      <MessageCircle className="w-4 h-4" />
      Chat
      {unread > 0 && (
        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
          {unread}
        </span>
      )}
    </button>
  );
};
