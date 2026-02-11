import api from './api';
import type { Notification, PaginatedResponse } from '@/types';

export const notificationsService = {
  async getAll(page = 1, limit = 20): Promise<PaginatedResponse<Notification>> {
    const { data } = await api.get('/notifications', {
      params: { page, limit },
    });
    return data;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get('/notifications/unread-count');
    return data.count;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/mark-all-read');
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async registerDeviceToken(token: string, platform: string): Promise<void> {
    await api.post('/notifications/device-token', { token, platform });
  },

  async removeDeviceToken(token: string): Promise<void> {
    await api.delete('/notifications/device-token', { data: { token } });
  },

  async sendChatMessageNotification(recipientId: string, senderName: string, appointmentId: string): Promise<void> {
    await api.post('/notifications/chat-message', { recipientId, senderName, appointmentId });
  },

  async testBookingConfirmation(): Promise<void> {
    await api.post('/notifications/test/booking-confirmation');
  },
};
