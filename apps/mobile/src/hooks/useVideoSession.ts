import { useState, useEffect, useCallback, useRef } from 'react';
import {
  videoSessionService,
  SessionParticipant,
  NetworkQuality,
  AgoraConfig,
} from '../services/video-session';

interface UseVideoSessionOptions {
  appId: string;
  channelName: string;
  token: string;
  oderId: number;
  sessionDuration: number; // in minutes
  onSessionEnd?: () => void;
  onSessionWarning?: (minutesLeft: number) => void;
}

interface UseVideoSessionReturn {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  localParticipant: SessionParticipant | null;
  remoteParticipant: SessionParticipant | null;
  networkQuality: NetworkQuality;
  error: Error | null;

  // Controls state
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;

  // Timer
  elapsedSeconds: number;
  remainingSeconds: number;

  // Actions
  joinSession: () => Promise<void>;
  leaveSession: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  flipCamera: () => Promise<void>;
  toggleSpeaker: () => Promise<void>;

  // Agora-specific
  engine: ReturnType<typeof videoSessionService.getEngine>;
  localOderId: number;
}

export function useVideoSession(options: UseVideoSessionOptions): UseVideoSessionReturn {
  const {
    appId,
    channelName,
    token,
    oderId,
    sessionDuration,
    onSessionEnd,
    onSessionWarning,
  } = options;

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Participants
  const [localParticipant, setLocalParticipant] = useState<SessionParticipant | null>(null);
  const [remoteParticipant, setRemoteParticipant] = useState<SessionParticipant | null>(null);

  // Network
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('unknown');

  // Controls
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const warningsShownRef = useRef<Set<number>>(new Set());

  const totalSessionSeconds = sessionDuration * 60;
  const remainingSeconds = Math.max(0, totalSessionSeconds - elapsedSeconds);

  // Session timer
  useEffect(() => {
    if (isConnected && !timerRef.current) {
      sessionStartRef.current = new Date();
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newElapsed = prev + 1;

          // Check for warnings
          const minutesRemaining = Math.ceil((totalSessionSeconds - newElapsed) / 60);

          // 5-minute warning
          if (minutesRemaining === 5 && !warningsShownRef.current.has(5)) {
            warningsShownRef.current.add(5);
            onSessionWarning?.(5);
          }

          // 1-minute warning
          if (minutesRemaining === 1 && !warningsShownRef.current.has(1)) {
            warningsShownRef.current.add(1);
            onSessionWarning?.(1);
          }

          // Session end (with 2-minute grace period)
          const gracePeriodSeconds = 2 * 60;
          if (newElapsed >= totalSessionSeconds + gracePeriodSeconds) {
            onSessionEnd?.();
          }

          return newElapsed;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected, totalSessionSeconds, onSessionEnd, onSessionWarning]);

  // Setup callbacks
  useEffect(() => {
    videoSessionService.setCallbacks({
      onJoined: (participants) => {
        setIsConnected(true);
        setIsConnecting(false);

        const local = participants.find((p) => p.isLocal);
        const remote = participants.find((p) => !p.isLocal);

        if (local) {
          setLocalParticipant(local);
          setIsAudioEnabled(local.audio);
          setIsVideoEnabled(local.video);
        }
        if (remote) setRemoteParticipant(remote);
      },
      onParticipantJoined: (participant) => {
        if (!participant.isLocal) {
          setRemoteParticipant(participant);
        }
      },
      onParticipantLeft: (oderId) => {
        setRemoteParticipant((prev) => (prev?.oderId === oderId ? null : prev));
      },
      onParticipantUpdated: (participant) => {
        if (participant.isLocal) {
          setLocalParticipant(participant);
          setIsAudioEnabled(participant.audio);
          setIsVideoEnabled(participant.video);
        } else {
          setRemoteParticipant(participant);
        }
      },
      onNetworkQualityChanged: (quality) => {
        setNetworkQuality(quality);
      },
      onError: (err) => {
        setError(err);
        setIsConnecting(false);
      },
      onCallEnded: () => {
        setIsConnected(false);
        setLocalParticipant(null);
        setRemoteParticipant(null);
      },
      onReconnecting: () => {
        setIsReconnecting(true);
      },
      onReconnected: () => {
        setIsReconnecting(false);
      },
    });
  }, []);

  const joinSession = useCallback(async () => {
    if (!appId || !channelName) {
      setError(new Error('Missing Agora configuration'));
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const config: AgoraConfig = {
        appId,
        channelName,
        token,
        oderId,
      };
      await videoSessionService.joinChannel(config);
    } catch (err) {
      setIsConnecting(false);
      setError(err as Error);
      throw err;
    }
  }, [appId, channelName, token, oderId]);

  const leaveSession = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await videoSessionService.leaveChannel();
    await videoSessionService.destroy();
    setIsConnected(false);
    setLocalParticipant(null);
    setRemoteParticipant(null);
  }, []);

  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    videoSessionService.toggleAudio(newState);
    setIsAudioEnabled(newState);
  }, [isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    videoSessionService.toggleVideo(newState);
    setIsVideoEnabled(newState);
  }, [isVideoEnabled]);

  const flipCamera = useCallback(async () => {
    await videoSessionService.flipCamera();
  }, []);

  const toggleSpeaker = useCallback(async () => {
    const newState = !isSpeakerOn;
    await videoSessionService.toggleSpeaker(newState);
    setIsSpeakerOn(newState);
  }, [isSpeakerOn]);

  return {
    // State
    isConnected,
    isConnecting,
    isReconnecting,
    localParticipant,
    remoteParticipant,
    networkQuality,
    error,

    // Controls state
    isAudioEnabled,
    isVideoEnabled,
    isSpeakerOn,

    // Timer
    elapsedSeconds,
    remainingSeconds,

    // Actions
    joinSession,
    leaveSession,
    toggleAudio,
    toggleVideo,
    flipCamera,
    toggleSpeaker,

    // Agora-specific
    engine: videoSessionService.getEngine(),
    localOderId: videoSessionService.getLocalOderId(),
  };
}
