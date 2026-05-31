
import { api } from './api';

export interface NotificationDto {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface SendNotificationDto {
  userId: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
}

export interface SendNotificationToRoleDto {
  role: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
}

export interface SendNotificationToUsersDto {
  userIds: number[];
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
}

export interface UnreadCountResponse {
  count: number;
}


const NOTIFICATION_API_URL = import.meta.env.VITE_NOTIFICATION_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5009';

export const notificationService = {
  async getUserNotifications(userId: number): Promise<NotificationDto[]> {
  
    const response = await api.get<NotificationDto[]>(`${NOTIFICATION_API_URL}/api/notifications/user/${userId}`);
    return response; 
  },

  async getUnreadNotifications(userId: number): Promise<NotificationDto[]> {
    const response = await api.get<NotificationDto[]>(`${NOTIFICATION_API_URL}/api/notifications/user/${userId}/unread`);
    return response;
  },

  async getUnreadCount(userId: number): Promise<number> {
    const response = await api.get<UnreadCountResponse>(`${NOTIFICATION_API_URL}/api/notifications/user/${userId}/unread-count`);
    return response.count;
  },

  async sendNotification(dto: SendNotificationDto): Promise<NotificationDto> {
    const response = await api.post<NotificationDto>(`${NOTIFICATION_API_URL}/api/notifications/send`, dto);
    return response;
  },

  async sendNotificationToRole(dto: SendNotificationToRoleDto): Promise<NotificationDto[]> {
    const response = await api.post<NotificationDto[]>(`${NOTIFICATION_API_URL}/api/notifications/send-to-role`, dto);
    return response;
  },

  async sendNotificationToUsers(dto: SendNotificationToUsersDto): Promise<NotificationDto[]> {
    const response = await api.post<NotificationDto[]>(`${NOTIFICATION_API_URL}/api/notifications/send-bulk`, dto);
    return response;
  },

  async markAsRead(notificationId: number): Promise<void> {
    await api.put(`${NOTIFICATION_API_URL}/api/notifications/${notificationId}/read`);
  },

  async markAllAsRead(userId: number): Promise<void> {
    if (userId === undefined || userId === null) {
      console.warn('notificationService.markAllAsRead called without userId, skipping');
      return;
    }

    await api.put(`${NOTIFICATION_API_URL}/api/notifications/user/${userId}/read-all`);
  },
};


