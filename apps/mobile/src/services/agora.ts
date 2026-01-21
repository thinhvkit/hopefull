import api from './api';

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
}

export interface AgoraConfigResponse {
  appId: string;
}

/**
 * Generate an Agora RTC token for joining a video channel
 */
export async function generateAgoraToken(
  channelName: string,
  uid: number,
  role: 'publisher' | 'subscriber' = 'publisher',
  expirationInSeconds: number = 3600
): Promise<AgoraTokenResponse> {
  const response = await api.post<AgoraTokenResponse>('/agora/token', {
    channelName,
    uid,
    role,
    expirationInSeconds,
  });
  return response.data;
}

/**
 * Get Agora configuration (App ID)
 */
export async function getAgoraConfig(): Promise<AgoraConfigResponse> {
  const response = await api.get<AgoraConfigResponse>('/agora/config');
  return response.data;
}
