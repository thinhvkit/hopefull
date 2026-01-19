import api from './api';
import type { User } from '../types';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  timezone?: string;
  preferredLanguage?: string;
}

export interface UploadAvatarData {
  base64: string;
  mimeType: string;
}

export const usersService = {
  async getProfile(): Promise<User> {
    const { data } = await api.get('/users/profile');
    return data;
  },

  async updateProfile(profileData: UpdateProfileData): Promise<User> {
    const { data } = await api.patch('/users/profile', profileData);
    return data;
  },

  async uploadAvatar(avatarData: UploadAvatarData): Promise<{ avatarUrl: string }> {
    const { data } = await api.post('/users/profile/avatar', avatarData);
    return data;
  },

  async removeAvatar(): Promise<void> {
    await api.delete('/users/profile/avatar');
  },

  async getUserById(id: string): Promise<User> {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
};
