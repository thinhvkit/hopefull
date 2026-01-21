import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

@Injectable()
export class AgoraService {
  private readonly appId: string;
  private readonly appCertificate: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('AGORA_APP_ID') || '';
    this.appCertificate = this.configService.get<string>('AGORA_APP_CERTIFICATE') || '';

    if (!this.appId || !this.appCertificate) {
      console.warn('Agora credentials not configured. Video calls will not work.');
    }
  }

  /**
   * Generate an RTC token for joining a video channel
   * @param channelName - The channel to join
   * @param uid - The user's unique ID (number)
   * @param role - 'publisher' (can send/receive) or 'subscriber' (receive only)
   * @param expirationInSeconds - Token validity period (default: 1 hour)
   */
  generateRtcToken(
    channelName: string,
    uid: number,
    role: 'publisher' | 'subscriber' = 'publisher',
    expirationInSeconds: number = 3600,
  ): string {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Token expiration time (current time + expiration seconds)
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expirationInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs,
      privilegeExpiredTs,
    );

    return token;
  }

  /**
   * Get the Agora App ID (for client-side initialization)
   */
  getAppId(): string {
    return this.appId;
  }
}
