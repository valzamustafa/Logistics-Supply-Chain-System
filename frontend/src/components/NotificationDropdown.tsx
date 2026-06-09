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
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[0.625rem] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-500 shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            {user && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto p-3">
            {isLoading && (
              <div className="px-3 py-5 text-center text-slate-500">Loading notifications...</div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="rounded-lg bg-slate-50 p-5 text-center text-slate-500">
                <Clock3 className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                No notifications yet.
              </div>
            )}

            {!isLoading && notifications.map((notification) => (
              <div
                key={notification.id}
                className={`group rounded-lg border border-slate-200 p-3 transition ${notification.isRead ? 'bg-slate-50/80' : 'bg-white'} hover:border-teal-200 hover:bg-teal-50/30`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                        <Bell className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900">{notification.title}</h3>
                    </div>
                    <p className="text-sm text-slate-500">{notification.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-teal-300 hover:text-teal-700"
                    aria-label={notification.isRead ? 'Already read' : 'Mark as read'}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                  <span className={notification.isRead ? 'text-slate-500' : 'font-semibold text-teal-700'}>
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





