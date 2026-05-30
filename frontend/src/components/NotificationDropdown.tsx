import { useEffect, useRef } from 'react';
import { Bell, Check, X, Clock3 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';

export function NotificationDropdown() {
  const { user } = useAuth();

  const {
    notifications,
    unreadCount,
    isLoading,
    open,
    toggleOpen,
    closeDropdown,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications(user?.id);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          toggleOpen();
          if (!open) refresh();
        }}
        className="relative inline-flex items-center justify-center rounded-lg p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.625rem] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 text-slate-200 shadow-2xl shadow-slate-950/50">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 bg-slate-950">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-slate-400">{unreadCount} unread</p>
            </div>
            {user && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto p-3">
            {isLoading && (
              <div className="px-3 py-5 text-center text-slate-400">Loading notifications...</div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="rounded-3xl bg-slate-800 p-5 text-center text-slate-400">
                <Clock3 className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                No notifications yet.
              </div>
            )}

            {!isLoading && notifications.map((notification) => (
              <div
                key={notification.id}
                className={`group rounded-3xl border border-slate-700 p-3 transition ${notification.isRead ? 'bg-slate-950/80' : 'bg-slate-800'} hover:bg-slate-800/90`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                        <Bell className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-semibold text-white">{notification.title}</h3>
                    </div>
                    <p className="text-sm text-slate-300">{notification.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className="rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-400 transition hover:border-cyan-500 hover:text-cyan-300"
                    aria-label={notification.isRead ? 'Already read' : 'Mark as read'}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                  <span className={notification.isRead ? 'text-slate-500' : 'text-cyan-300'}>
                    {notification.isRead ? 'Read' : 'New'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
