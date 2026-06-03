import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService, User } from '../services/userService';
import { chatService, ChatConversationDto } from '../services/chatService';
import { ChatWidget } from './ChatWidget';
import { Search, X } from 'lucide-react';
import { signalRService } from '../services/signalRService';
import { useChatUnread } from '../hooks/useChatUnread';

interface ChatModalProps {
    open: boolean;
    onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ open, onClose }) => {
    const { user } = useAuth();
    const { refresh: refreshUnread } = useChatUnread();
    const [users, setUsers] = useState<User[]>([]);
    const [conversations, setConversations] = useState<ChatConversationDto[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (!open || !user) {
            return;
        }

        const loadUsers = async () => {
            setLoading(true);
            try {
                const [usersData, conversationsData] = await Promise.all([
                    userService.getChatUsers(),
                    chatService.getConversations(user.id)
                ]);

                const partnerUsers = usersData.filter(u => u.id !== user.id);
                setUsers(partnerUsers);
                setConversations(conversationsData);


                if (selectedUser && !partnerUsers.find(u => u.id === selectedUser.id)) {
                    setSelectedUser(null);
                }

                setError(null);
            } catch (err) {
                console.error('Failed to load chat users or conversations', err);
                setError('Could not load chat conversations.');
            } finally {
                setLoading(false);
            }
        };

        loadUsers();


        const unsubscribe = signalRService.onEntityUpdated((payload: any) => {
            if (payload?.Type === 'chatRead') {

                setRefreshTrigger(prev => prev + 1);
            }
        });

        return () => {
            unsubscribe?.();
        };
    }, [open, user, refreshTrigger]);

    useEffect(() => {
        if (!open) {
            setSelectedUser(null);
            setQuery('');
            setConversations([]);
            setUsers([]);
            setError(null);
        }
    }, [open]);

    const filteredUsers = useMemo(
        () => {
            const search = query.trim().toLowerCase();
            return users
                .map(userItem => ({
                    user: userItem,
                    conversation: conversations.find(c => c.partnerId === userItem.id)
                }))
                .filter(item => {
                    if (!search) return true;
                    return (
                        `${item.user.firstName} ${item.user.lastName}`.toLowerCase().includes(search) ||
                        item.user.email.toLowerCase().includes(search) ||
                        item.user.roles.join(' ').toLowerCase().includes(search) ||
                        item.conversation?.lastMessage.toLowerCase().includes(search)
                    );
                })
                .sort((a, b) => {
                    if (a.conversation && b.conversation) {
                        return new Date(b.conversation.lastSentAt).getTime() - new Date(a.conversation.lastSentAt).getTime();
                    }
                    if (a.conversation) return -1;
                    if (b.conversation) return 1;
                    return `${a.user.firstName} ${a.user.lastName}`.localeCompare(`${b.user.firstName} ${b.user.lastName}`);
                });
        },
        [query, users, conversations]
    );

    const handleSelectUser = async (userItem: User) => {
        setSelectedUser(userItem);


        if (user && userItem.id && conversations.find(c => c.partnerId === userItem.id)?.unreadCount) {
            try {
                await chatService.markConversationRead(user.id, userItem.id);
                // Update local state to remove "New Chat" badge immediately
                setConversations(prev =>
                    prev.map(c =>
                        c.partnerId === userItem.id ? { ...c, unreadCount: 0 } : c
                    )
                );

                await refreshUnread();
            } catch (err) {

            }
        }
    };

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Internal chat</h2>
                        <p className="text-sm text-slate-500">Open a real-time conversation with a colleague.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                        aria-label="Close chat modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="grid gap-4 p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="w-full bg-transparent text-sm text-slate-900 outline-none"
                                placeholder="Search users, roles, email..."
                            />
                        </div>

                        <div className="text-sm text-slate-500">Select a recipient to start an instant chat.</div>

                        <div className="max-h-[540px] space-y-2 overflow-y-auto">
                            {loading ? (
                                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading users...</div>
                            ) : error ? (
                                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No matching chats or users found.</div>
                            ) : (
                                filteredUsers.map(({ user: u, conversation }) => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => handleSelectUser(u)}
                                        className={`w-full rounded-3xl border px-4 py-3 text-left transition ${selectedUser?.id === u.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 truncate">{u.firstName} {u.lastName}</p>
                                                <p className="text-xs text-slate-500 truncate">{u.roles.length ? u.roles.join(', ') : 'No role assigned'}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {conversation && conversation.unreadCount > 0 ? (
                                                    <span className="inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New Chat</span>
                                                ) : null}
                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{u.id}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-col gap-1">
                                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                            {conversation ? (
                                                <p className="text-xs text-slate-600 truncate">{conversation.lastMessage}</p>
                                            ) : (
                                                <p className="text-xs text-slate-400">No messages yet</p>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="min-h-[540px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        {selectedUser ? (
                            <ChatWidget otherUserId={selectedUser.id} otherUserName={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                        ) : (
                            <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-3 rounded-3xl border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                                <p className="text-lg font-semibold text-slate-900">Pick a colleague to start chatting</p>
                                <p className="max-w-sm text-sm text-slate-500">Choose a recipient from the list on the left and send messages instantly using SignalR.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
