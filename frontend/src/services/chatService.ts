import { api } from './api';
import { getLocalStorageItem } from '../utils/localStorage';

export interface ChatMessageDto {
    id: number;
    senderId: number;
    recipientId: number;
    message: string;
    sentAt: string;
    isRead: boolean;
}

export interface SendChatDto {
    senderId: number;
    recipientId: number;
    message: string;
}

export interface ChatConversationDto {
    partnerId: number;
    lastMessage: string;
    lastSentAt: string;
    unreadCount: number;
}


const CHAT_API_BASE_URL = import.meta.env.VITE_NOTIFICATION_API_URL || 'http://localhost:5009';

async function requestChat<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<T> {
    const token = getLocalStorageItem('token');
    const url = `${CHAT_API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    if (method === 'POST') {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData?.message || errorData?.title || errorMessage;
        } catch {
            try {
                const text = await response.text();
                if (text) errorMessage = text;
            } catch {

            }
        }
        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

export const chatService = {
    async getConversation(userA: number, userB: number): Promise<ChatMessageDto[]> {
        return requestChat<ChatMessageDto[]>(`/api/chat/conversation/${userA}/${userB}`);
    },

    async sendMessage(dto: SendChatDto): Promise<ChatMessageDto> {
        return requestChat<ChatMessageDto>('/api/chat/send', 'POST', dto);
    },

    async getUnreadCount(userId: number): Promise<number> {
        return requestChat<number>(`/api/chat/unread-count/${userId}`);
    },

    async getConversations(userId: number): Promise<ChatConversationDto[]> {
        return requestChat<ChatConversationDto[]>(`/api/chat/conversations/${userId}`);
    },

    async markConversationRead(userId: number, otherUserId: number): Promise<{ updated: number }> {
        return requestChat<{ updated: number }>(`/api/chat/mark-read/${userId}/${otherUserId}`, 'POST');
    }
};
