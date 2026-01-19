import { api } from './api';

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    phone?: string;
    role: 'USER' | 'THERAPIST' | 'ADMIN';
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  requiresVerification?: boolean;
}

export interface RegisterRequest {
  email: string;
  phone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'USER' | 'THERAPIST';
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}

export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const response = await api.post('/auth/register', data);
  return response.data;
}

export async function refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await api.post('/auth/refresh', null, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  return response.data;
}

export async function getMe(): Promise<LoginResponse['user']> {
  const response = await api.get('/auth/me');
  return response.data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
}

export async function verifyOtp(email: string, otp: string): Promise<LoginResponse & { verified: boolean }> {
  const response = await api.post('/auth/verify-otp', { email, otp });
  return response.data;
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ message: string }> {
  const response = await api.post('/auth/reset-password', { email, otp, newPassword });
  return response.data;
}

export async function resendOtp(email: string): Promise<{ message: string }> {
  const response = await api.post('/auth/resend-otp', { email });
  return response.data;
}

export async function verifyPhone(
  idToken: string,
  userId?: string
): Promise<LoginResponse> {
  const response = await api.post('/auth/verify-phone', { idToken, userId });
  return response.data;
}

export async function verifyEmail(
  idToken: string,
  userId?: string
): Promise<LoginResponse> {
  const response = await api.post('/auth/verify-email', { idToken, userId });
  return response.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const response = await api.post('/auth/change-password', { currentPassword, newPassword });
  return response.data;
}

export async function socialAuth(
  provider: 'google' | 'apple',
  idToken: string,
  additionalData?: { firstName?: string; lastName?: string }
): Promise<LoginResponse & { isNewUser?: boolean }> {
  const response = await api.post('/auth/social', {
    provider,
    idToken,
    ...additionalData,
  });
  return response.data;
}

export const authService = {
  login,
  register,
  refreshToken,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
  verifyPhone,
  verifyEmail,
  changePassword,
  socialAuth,
};

export type { LoginResponse, RegisterRequest };
