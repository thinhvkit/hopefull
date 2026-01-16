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

export const usersService = {
  async getProfile(): Promise<User> {
    const { data } = await api.get('/users/me');
    return data;
  },

  async updateProfile(profileData: UpdateProfileData): Promise<User> {
    const { data } = await api.patch('/users/me', profileData);
    return data;
  },

  async updateAvatar(avatarUrl: string): Promise<User> {
    const { data } = await api.patch('/users/me/avatar', { avatarUrl });
    return data;
  },

  async getUserById(id: string): Promise<User> {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
};
