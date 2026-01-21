import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcConnection,
  IRtcEngineEventHandler,
  VideoSourceType,
  RenderModeType,
} from 'react-native-agora';

export type NetworkQuality = 'good' | 'fair' | 'poor' | 'unknown';

export interface SessionParticipant {
  oderId: string;
  isLocal: boolean;
  video: boolean;
  audio: boolean;
  userName?: string;
}

export interface VideoSessionCallbacks {
  onJoined?: (participants: SessionParticipant[]) => void;
  onParticipantJoined?: (participant: SessionParticipant) => void;
  onParticipantLeft?: (oderId: string) => void;
  onParticipantUpdated?: (participant: SessionParticipant) => void;
  onNetworkQualityChanged?: (quality: NetworkQuality) => void;
  onError?: (error: Error) => void;
  onCallEnded?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
}

export interface AgoraConfig {
  appId: string;
  channelName: string;
  token: string;
  oderId: number;
}

class VideoSessionService implements IRtcEngineEventHandler {
  private engine: IRtcEngine | null = null;
  private callbacks: VideoSessionCallbacks = {};
  private participants: Map<number, SessionParticipant> = new Map();
  private localOderId: number = 0;
  private isJoined: boolean = false;
  private currentChannelName: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  // Local state
  private _isAudioEnabled: boolean = true;
  private _isVideoEnabled: boolean = true;
  private _isFrontCamera: boolean = true;

  /**
   * Initialize Agora RTC Engine
   */
  async initialize(appId: string): Promise<IRtcEngine> {
    console.log('[Agora] Initializing with appId:', appId ? `${appId.substring(0, 8)}...` : 'EMPTY');

    if (!appId) {
      console.error('[Agora] App ID is empty! Video will not work.');
      throw new Error('Agora App ID is required');
    }

    // If engine exists, re-register event handler to ensure it's connected
    if (this.engine) {
      console.log('[Agora] Engine already exists, re-registering event handler...');
      try {
        // Unregister first to avoid duplicates
        this.engine.unregisterEventHandler(this);
      } catch (e) {
        // Ignore errors when unregistering
      }
      this.engine.registerEventHandler(this);
      console.log('[Agora] Event handler re-registered');
      return this.engine;
    }

    try {
      this.engine = createAgoraRtcEngine();
      console.log('[Agora] Engine created');

      this.engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });
      console.log('[Agora] Engine initialized');

      this.engine.registerEventHandler(this);
      console.log('[Agora] Event handler registered');

      // Enable video
      this.engine.enableVideo();
      this.engine.enableAudio();
      console.log('[Agora] Video and audio enabled');

      // Set video encoder configuration
      this.engine.setVideoEncoderConfiguration({
        dimensions: { width: 640, height: 480 },
        frameRate: 30,
        bitrate: 0, // Auto
      });

      // Start local preview
      this.engine.startPreview();
      console.log('[Agora] Local preview started');

      return this.engine;
    } catch (error) {
      console.error('[Agora] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Join a video session channel
   */
  async joinChannel(config: AgoraConfig): Promise<void> {
    console.log('[Agora] ========================================');
    console.log('[Agora] joinChannel called');
    console.log('[Agora] Channel name:', config.channelName);
    console.log('[Agora] UID:', config.oderId);
    console.log('[Agora] Currently joined:', this.isJoined);
    console.log('[Agora] Current channel:', this.currentChannelName);
    console.log('[Agora] ========================================');

    if (!this.engine) {
      await this.initialize(config.appId);
    }

    // Leave existing channel if joined to a different one
    if (this.isJoined && this.currentChannelName !== config.channelName) {
      console.log('[Agora] Already in a different channel, leaving first...');
      await this.leaveChannel();
    }

    this.localOderId = config.oderId;
    this.currentChannelName = config.channelName;
    this.participants.clear();

    try {
      // Set client role as broadcaster for video call
      this.engine!.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      console.log('[Agora] Client role set to broadcaster');

      // Join the channel
      console.log('[Agora] Calling engine.joinChannel...');
      this.engine!.joinChannel(
        config.token,
        config.channelName,
        config.oderId,
        {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: true,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        }
      );
      console.log('[Agora] engine.joinChannel called, waiting for onJoinChannelSuccess callback...');

      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('[Agora] Failed to join channel:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Leave the current channel
   */
  async leaveChannel(): Promise<void> {
    if (this.engine && this.isJoined) {
      this.engine.leaveChannel();
      this.isJoined = false;
      this.participants.clear();
    }
  }

  /**
   * Destroy the engine and reset all state
   */
  async destroy(): Promise<void> {
    console.log('[Agora] Destroying engine and resetting state...');
    if (this.engine) {
      try {
        this.engine.unregisterEventHandler(this);
        this.engine.release();
      } catch (error) {
        console.error('[Agora] Error during destroy:', error);
      }
      this.engine = null;
    }
    this.participants.clear();
    this.isJoined = false;
    this.callbacks = {};
    this.localOderId = 0;
    this.currentChannelName = '';
    this.reconnectAttempts = 0;
    this._isAudioEnabled = true;
    this._isVideoEnabled = true;
    this._isFrontCamera = true;
    console.log('[Agora] Engine destroyed and state reset');
  }

  /**
   * Toggle local audio
   */
  toggleAudio(enabled: boolean): void {
    if (this.engine) {
      this.engine.muteLocalAudioStream(!enabled);
      this._isAudioEnabled = enabled;

      // Update local participant
      const localParticipant = this.participants.get(this.localOderId);
      if (localParticipant) {
        localParticipant.audio = enabled;
        this.callbacks.onParticipantUpdated?.(localParticipant);
      }
    }
  }

  /**
   * Toggle local video
   */
  toggleVideo(enabled: boolean): void {
    if (this.engine) {
      this.engine.muteLocalVideoStream(!enabled);
      this._isVideoEnabled = enabled;

      // Update local participant
      const localParticipant = this.participants.get(this.localOderId);
      if (localParticipant) {
        localParticipant.video = enabled;
        this.callbacks.onParticipantUpdated?.(localParticipant);
      }
    }
  }

  /**
   * Switch between front and back camera
   */
  async flipCamera(): Promise<void> {
    if (this.engine) {
      this.engine.switchCamera();
      this._isFrontCamera = !this._isFrontCamera;
    }
  }

  /**
   * Toggle speaker/earpiece
   */
  async toggleSpeaker(useSpeaker: boolean): Promise<void> {
    if (this.engine) {
      this.engine.setEnableSpeakerphone(useSpeaker);
    }
  }

  /**
   * Get current participants
   */
  getParticipants(): SessionParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get local participant
   */
  getLocalParticipant(): SessionParticipant | null {
    return this.participants.get(this.localOderId) || null;
  }

  /**
   * Get RTC Engine instance
   */
  getEngine(): IRtcEngine | null {
    return this.engine;
  }

  /**
   * Get local user ID
   */
  getLocalOderId(): number {
    return this.localOderId;
  }

  /**
   * Check if audio is enabled
   */
  isAudioEnabled(): boolean {
    return this._isAudioEnabled;
  }

  /**
   * Check if video is enabled
   */
  isVideoEnabled(): boolean {
    return this._isVideoEnabled;
  }

  /**
   * Check if using front camera
   */
  isFrontCamera(): boolean {
    return this._isFrontCamera;
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: VideoSessionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // ============ Agora Event Handlers ============

  onJoinChannelSuccess(connection: RtcConnection, elapsed: number): void {
    console.log('[Agora] ✅ Successfully joined channel!');
    console.log('[Agora] Channel ID:', connection.channelId);
    console.log('[Agora] Local UID:', connection.localUid);
    console.log('[Agora] Elapsed:', elapsed, 'ms');
    console.log('[Agora] Stored localOderId:', this.localOderId);
    this.isJoined = true;

    // Use the UID from connection if available, otherwise use stored localOderId
    const actualLocalUid = connection.localUid || this.localOderId;

    // Add local participant
    const localParticipant: SessionParticipant = {
      oderId: String(actualLocalUid),
      isLocal: true,
      video: this._isVideoEnabled,
      audio: this._isAudioEnabled,
    };
    this.participants.set(actualLocalUid, localParticipant);
    console.log('[Agora] Local participant added:', localParticipant);

    this.callbacks.onJoined?.(this.getParticipants());
  }

  onUserJoined(connection: RtcConnection, remoteUid: number, elapsed: number): void {
    console.log('[Agora] ========================================');
    console.log('[Agora] 👤 REMOTE USER JOINED!');
    console.log('[Agora] Remote UID:', remoteUid);
    console.log('[Agora] Channel:', connection.channelId);
    console.log('[Agora] Elapsed:', elapsed, 'ms');
    console.log('[Agora] Current participants:', this.participants.size);
    console.log('[Agora] ========================================');

    const participant: SessionParticipant = {
      oderId: String(remoteUid),
      isLocal: false,
      video: true,
      audio: true,
    };
    this.participants.set(remoteUid, participant);

    console.log('[Agora] Calling onParticipantJoined callback...');
    this.callbacks.onParticipantJoined?.(participant);
    console.log('[Agora] Callback called successfully');
  }

  onUserOffline(_connection: RtcConnection, remoteUid: number, reason: number): void {
    console.log('[Agora] ========================================');
    console.log('[Agora] 👤 Remote user left!');
    console.log('[Agora] Remote UID:', remoteUid);
    console.log('[Agora] Reason:', reason);
    console.log('[Agora] ========================================');

    this.participants.delete(remoteUid);
    this.callbacks.onParticipantLeft?.(String(remoteUid));
  }

  onUserMuteAudio(_connection: RtcConnection, remoteOderId: number, muted: boolean): void {
    const participant = this.participants.get(remoteOderId);
    if (participant) {
      participant.audio = !muted;
      this.callbacks.onParticipantUpdated?.(participant);
    }
  }

  onUserMuteVideo(_connection: RtcConnection, remoteOderId: number, muted: boolean): void {
    const participant = this.participants.get(remoteOderId);
    if (participant) {
      participant.video = !muted;
      this.callbacks.onParticipantUpdated?.(participant);
    }
  }

  onNetworkQuality(
    _connection: RtcConnection,
    remoteOderId: number,
    txQuality: number,
    rxQuality: number
  ): void {
    // Only report local user's network quality
    if (remoteOderId === 0 || remoteOderId === this.localOderId) {
      const quality = this.mapNetworkQuality(Math.max(txQuality, rxQuality));
      this.callbacks.onNetworkQualityChanged?.(quality);
    }
  }

  onConnectionStateChanged(
    _connection: RtcConnection,
    state: number,
    reason: number
  ): void {
    console.log('[Agora] Connection state changed:', state, 'reason:', reason);

    // ConnectionStateType values:
    // 1: Disconnected, 2: Connecting, 3: Connected, 4: Reconnecting, 5: Failed
    switch (state) {
      case 4: // Reconnecting
        this.callbacks.onReconnecting?.();
        this.reconnectAttempts++;
        break;
      case 3: // Connected
        if (this.reconnectAttempts > 0) {
          this.callbacks.onReconnected?.();
          this.reconnectAttempts = 0;
        }
        break;
      case 5: // Failed
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.callbacks.onError?.(
            new Error('Connection failed after maximum retry attempts')
          );
        }
        break;
    }
  }

  onLeaveChannel(_connection: RtcConnection, _stats: any): void {
    console.log('[Agora] Left channel');
    this.isJoined = false;
    this.participants.clear();
    this.callbacks.onCallEnded?.();
  }

  onError(err: number, msg: string): void {
    console.error('Agora error:', err, msg);
    this.callbacks.onError?.(new Error(`Agora error ${err}: ${msg}`));
  }

  // ============ Helper Methods ============

  private mapNetworkQuality(quality: number): NetworkQuality {
    // Agora quality levels: 0=Unknown, 1=Excellent, 2=Good, 3=Poor, 4=Bad, 5=VeryBad, 6=Down
    switch (quality) {
      case 1:
      case 2:
        return 'good';
      case 3:
        return 'fair';
      case 4:
      case 5:
      case 6:
        return 'poor';
      default:
        return 'unknown';
    }
  }
}

export const videoSessionService = new VideoSessionService();
