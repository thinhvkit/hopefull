import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { RtcSurfaceView } from 'react-native-agora';
import { useAppointment } from '@/hooks/useAppointments';
import { Avatar } from '@/components/ui';
import { callSignalingService, CallDocument, ParticipantMediaState } from '@/services/call-signaling';
import { useAuthStore } from '@/store/auth';
import { videoSessionService } from '@/services/video-session';
import { generateAgoraToken } from '@/services/agora';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIP_WIDTH = 120;
const PIP_HEIGHT = 160;
const PIP_MARGIN = 16;
const CONTROLS_HIDE_DELAY = 5000;

type NetworkQuality = 'good' | 'fair' | 'poor' | 'unknown';

const NETWORK_QUALITY_COLORS: Record<NetworkQuality, string> = {
  good: '#10B981',
  fair: '#F59E0B',
  poor: '#EF4444',
  unknown: '#6B7280',
};

// Request permissions for Android
const requestCameraAndAudioPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      return (
        granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  }
  return true;
};

export default function VideoSessionScreen() {
  const params = useLocalSearchParams<{
    id: string;
    callId?: string;
    callerName?: string;
    callerAvatar?: string;
  }>();
  const { id } = params;
  const router = useRouter();
  const { t } = useTranslation();

  // Get current user
  const currentUser = useAuthStore((state) => state.user);

  // Check if this is an instant call (channel name starts with "ch-" or "session-call-" for backwards compatibility)
  const isInstantCall = id?.startsWith('ch-') || id?.startsWith('session-call-');

  // Get callId - either from params or extract from channel name
  const callId = params.callId || (isInstantCall ? id?.replace('session-', '') : null);
  const callUnsubscribe = useRef<(() => void) | null>(null);

  // Fetch appointment details (only for scheduled calls)
  const { data: appointment } = useAppointment(isInstantCall ? '' : (id || ''));

  // For instant calls, use params; for scheduled, use appointment data
  const remoteName = isInstantCall
    ? params.callerName || 'Caller'
    : appointment?.therapist
      ? `${appointment.therapist.user.firstName} ${appointment.therapist.user.lastName}`
      : 'Participant';
  const remoteAvatar = isInstantCall
    ? params.callerAvatar
    : appointment?.therapist?.user.avatarUrl;

  // Session state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCaller, setIsCaller] = useState<boolean | null>(null);
  const [remoteMediaState, setRemoteMediaState] = useState<ParticipantMediaState>({
    videoEnabled: true,
    audioEnabled: true,
  });
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('good');

  // Agora state
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // UI State
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // PiP dragging
  const pipPosition = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - PIP_WIDTH - PIP_MARGIN,
      y: SCREEN_HEIGHT - PIP_HEIGHT - 150,
    })
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pipPosition.setOffset({
          x: (pipPosition.x as any)._value,
          y: (pipPosition.y as any)._value,
        });
        pipPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pipPosition.x, dy: pipPosition.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pipPosition.flattenOffset();

        const currentX = (pipPosition.x as any)._value;
        const currentY = (pipPosition.y as any)._value;

        const snapX = currentX < SCREEN_WIDTH / 2 ? PIP_MARGIN : SCREEN_WIDTH - PIP_WIDTH - PIP_MARGIN;
        const snapY = Math.max(
          PIP_MARGIN + 50,
          Math.min(currentY, SCREEN_HEIGHT - PIP_HEIGHT - 150)
        );

        Animated.spring(pipPosition, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    })
  ).current;

  // Handle call status changes (for when other party ends the call or media state changes)
  const handleCallStatusChange = useCallback((call: CallDocument) => {
    console.log('Session: Call status changed:', call.status);

    // Determine if current user is caller (only set once)
    if (isCaller === null && currentUser) {
      setIsCaller(call.callerId === currentUser.id);
    }

    // Update remote media state
    const isUserCaller = call.callerId === currentUser?.id;
    const remoteMedia = isUserCaller ? call.receiverMedia : call.callerMedia;
    if (remoteMedia) {
      setRemoteMediaState(remoteMedia);
    }

    if (call.status === 'ended' || call.status === 'cancelled') {
      // Other party ended the call
      console.log('Call ended by other party');
      if (callUnsubscribe.current) {
        callUnsubscribe.current();
        callUnsubscribe.current = null;
      }
      router.back();
    }
  }, [router, isCaller, currentUser]);

  // Track if we've already initialized to prevent double initialization
  const hasInitialized = useRef(false);
  const isMountedRef = useRef(true);

  // Initialize Agora and join channel
  useEffect(() => {
    // Prevent double initialization (React Strict Mode or re-renders)
    if (hasInitialized.current) {
      console.log('[Session] Already initialized, skipping...');
      return;
    }
    hasInitialized.current = true;
    isMountedRef.current = true;

    let connectionTimeout: NodeJS.Timeout | null = null;
    let agoraConnected = false;
    console.log('[Session] Session screen mounted, channel:', id, 'callId:', callId);

    // Fallback timeout - if Agora doesn't connect within 8 seconds, show as connected anyway
    connectionTimeout = setTimeout(() => {
      if (isMountedRef.current && !agoraConnected) {
        console.log('[Session] Connection timeout - showing as connected');
        setIsConnecting(false);
        setIsConnected(true);
        setPermissionsGranted(true);

        // Initialize media state in Firestore
        if (callId) {
          callSignalingService.updateMediaState(callId, {
            videoEnabled: true,
            audioEnabled: true,
          });
        }
      }
    }, 8000);

    const initializeAgora = async () => {
      try {
        // Request permissions
        const hasPermissions = await requestCameraAndAudioPermission();
        if (!isMountedRef.current) return;
        setPermissionsGranted(hasPermissions);

        if (!hasPermissions) {
          console.error('[Session] Camera/audio permissions not granted');
          // Still show as connected but without video
          if (connectionTimeout) clearTimeout(connectionTimeout);
          setIsConnecting(false);
          setIsConnected(true);
          return;
        }

        // Initialize Agora
        console.log('[Session] Initializing Agora...');
        await videoSessionService.initialize(AGORA_APP_ID);

        // Set up callbacks
        console.log('[Session] Setting up Agora callbacks...');
        videoSessionService.setCallbacks({
          onJoined: (participants) => {
            console.log('[Session] ✅ onJoined callback fired!');
            console.log('[Session] Participants count:', participants.length);
            console.log('[Session] Participants:', JSON.stringify(participants));
            agoraConnected = true;
            if (connectionTimeout) clearTimeout(connectionTimeout);
            if (isMountedRef.current) {
              setIsConnecting(false);
              setIsConnected(true);

              // Initialize media state in Firestore
              if (callId) {
                callSignalingService.updateMediaState(callId, {
                  videoEnabled: true,
                  audioEnabled: true,
                });
              }
            }
          },
          onParticipantJoined: (participant) => {
            console.log('[Session] ========================================');
            console.log('[Session] 🎉 onParticipantJoined callback fired!');
            console.log('[Session] Participant:', JSON.stringify(participant));
            console.log('[Session] Is local:', participant.isLocal);
            console.log('[Session] isMountedRef.current:', isMountedRef.current);
            console.log('[Session] ========================================');
            if (isMountedRef.current && !participant.isLocal) {
              console.log('[Session] Setting remoteUid to:', Number(participant.oderId));
              setRemoteUid(Number(participant.oderId));
              setRemoteMediaState({
                videoEnabled: participant.video,
                audioEnabled: participant.audio,
              });
            }
          },
          onParticipantLeft: (oderId) => {
            console.log('[Session] Remote participant left:', oderId);
            if (isMountedRef.current) {
              setRemoteUid(null);
            }
          },
          onParticipantUpdated: (participant) => {
            if (isMountedRef.current && !participant.isLocal) {
              setRemoteMediaState({
                videoEnabled: participant.video,
                audioEnabled: participant.audio,
              });
            }
          },
          onNetworkQualityChanged: (quality) => {
            if (isMountedRef.current) {
              setNetworkQuality(quality);
            }
          },
          onCallEnded: () => {
            console.log('[Session] Call ended by Agora');
            if (isMountedRef.current) {
              router.back();
            }
          },
          onError: (error) => {
            console.error('[Session] Agora error:', error);
          },
        });
        console.log('[Session] Callbacks set up successfully');

        // Join the channel
        // Use current user ID as uid for Agora
        const localUid = currentUser?.id ? parseInt(currentUser.id.replace(/\D/g, '').slice(0, 9) || '0', 10) : Math.floor(Math.random() * 100000);

        console.log('[Session] ========================================');
        console.log('[Session] 📡 JOINING AGORA CHANNEL');
        console.log('[Session] Channel name:', id);
        console.log('[Session] Local UID:', localUid);
        console.log('[Session] User ID:', currentUser?.id);
        console.log('[Session] App ID:', AGORA_APP_ID ? `${AGORA_APP_ID.substring(0, 8)}...` : 'EMPTY!');
        console.log('[Session] ========================================');

        // Fetch Agora token from backend
        let token = '';
        let appId = AGORA_APP_ID;
        try {
          console.log('[Session] Fetching Agora token from backend...');
          const tokenResponse = await generateAgoraToken(id || '', localUid, 'publisher', 3600);
          token = tokenResponse.token;
          appId = tokenResponse.appId || AGORA_APP_ID;
          console.log('[Session] Token received:', token ? `${token.substring(0, 20)}...` : 'EMPTY');
        } catch (tokenError) {
          console.error('[Session] Failed to fetch Agora token:', tokenError);
          console.log('[Session] Continuing without token (will fail if token required)...');
        }

        await videoSessionService.joinChannel({
          appId,
          channelName: id || '',
          token,
          oderId: localUid,
        });

        console.log('[Session] joinChannel call completed');

      } catch (error) {
        console.error('[Session] Failed to initialize Agora:', error);
        // Fallback to connected state for testing
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (isMountedRef.current) {
          setIsConnecting(false);
          setIsConnected(true);
        }
      }
    };

    // Subscribe to call status changes if we have a callId
    if (callId) {
      console.log('[Session] Subscribing to call status changes for:', callId);
      callUnsubscribe.current = callSignalingService.subscribeToCall(
        callId,
        handleCallStatusChange
      );
    }

    initializeAgora();

    return () => {
      console.log('[Session] Cleanup running...');
      isMountedRef.current = false;
      if (connectionTimeout) clearTimeout(connectionTimeout);
      // Don't destroy immediately - let the call continue if user navigates back
      // Only leave channel, don't destroy engine
      videoSessionService.leaveChannel();
      if (callUnsubscribe.current) {
        callUnsubscribe.current();
        callUnsubscribe.current = null;
      }
      console.log('[Session] Cleanup completed');
    };
  }, [id, callId]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('[Session] Component unmounting - destroying Agora engine');
      hasInitialized.current = false;
      videoSessionService.destroy();
    };
  }, []);

  // Session timer
  useEffect(() => {
    if (isConnected) {
      const timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isConnected]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isConnected) {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
      controlsTimer.current = setTimeout(() => {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }, CONTROLS_HIDE_DELAY);
    }

    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [showControls, isConnected, controlsOpacity]);

  const handleScreenTap = useCallback(() => {
    if (!showControls) {
      setShowControls(true);
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showControls, controlsOpacity]);

  const handleEndCall = useCallback(async () => {
    console.log('Ending call...', callId);

    // Unsubscribe from call updates
    if (callUnsubscribe.current) {
      callUnsubscribe.current();
      callUnsubscribe.current = null;
    }

    // Leave Agora channel
    await videoSessionService.leaveChannel();

    // Update call status in Firestore to notify other party
    if (callId) {
      try {
        await callSignalingService.endCall(callId);
        console.log('Call ended in Firestore');
      } catch (error) {
        console.error('Failed to end call in Firestore:', error);
      }
    }

    router.back();
  }, [router, callId]);

  const onEndCallPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleEndCall();
  }, [handleEndCall]);

  const handleControlPress = useCallback((action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  }, []);

  const toggleAudio = useCallback(() => {
    const newValue = !isAudioEnabled;
    setIsAudioEnabled(newValue);

    // Toggle in Agora
    videoSessionService.toggleAudio(newValue);

    // Sync with Firestore
    if (callId) {
      callSignalingService.updateMediaState(callId, {
        videoEnabled: isVideoEnabled,
        audioEnabled: newValue,
      });
    }
  }, [callId, isVideoEnabled, isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    const newValue = !isVideoEnabled;
    setIsVideoEnabled(newValue);

    // Toggle in Agora
    videoSessionService.toggleVideo(newValue);

    // Sync with Firestore
    if (callId) {
      callSignalingService.updateMediaState(callId, {
        videoEnabled: newValue,
        audioEnabled: isAudioEnabled,
      });
    }
  }, [callId, isAudioEnabled, isVideoEnabled]);

  const flipCamera = useCallback(async () => {
    await videoSessionService.flipCamera();
  }, []);

  const toggleSpeaker = useCallback(async () => {
    const newValue = !isSpeakerOn;
    setIsSpeakerOn(newValue);
    await videoSessionService.toggleSpeaker(newValue);
  }, [isSpeakerOn]);

  // Format time display
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render loading/connecting state
  if (isConnecting || !isConnected) {
    return (
      <View style={styles.connectingContainer}>
        <StatusBar barStyle="light-content" />
        <Avatar
          source={remoteAvatar}
          name={remoteName}
          size="xl"
        />
        <Text style={styles.connectingName}>{remoteName}</Text>
        <Text style={styles.connectingText}>
          {isConnecting ? t('session.connecting') : t('session.waitingForTherapist')}
        </Text>
        <TouchableOpacity style={styles.cancelButton} onPress={handleEndCall}>
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleScreenTap}
    >
      <StatusBar barStyle="light-content" hidden />

      {/* Remote Video (Full Screen) or Local Video if waiting */}
      {remoteUid ? (
        // Remote user has joined - show their video
        remoteMediaState.videoEnabled && permissionsGranted ? (
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{ uid: remoteUid }}
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <Avatar
              source={remoteAvatar}
              name={remoteName}
              size="xl"
            />
            <Text style={styles.remoteNameText}>{remoteName}</Text>
            <Text style={styles.videoOffText}>{t('session.videoOff')}</Text>
            {!remoteMediaState.audioEnabled && (
              <View style={styles.remoteMutedBadge}>
                <Ionicons name="mic-off" size={16} color="#fff" />
                <Text style={styles.remoteMutedText}>{t('session.controls.mute')}</Text>
              </View>
            )}
          </View>
        )
      ) : (
        // Waiting for remote user - show local video in main view
        permissionsGranted && isVideoEnabled ? (
          <View style={styles.remoteVideo}>
            <RtcSurfaceView
              style={StyleSheet.absoluteFill}
              canvas={{ uid: 0 }}
            />
            {/* Waiting overlay */}
            <View style={styles.waitingOverlay}>
              <View style={styles.waitingBadge}>
                <Ionicons name="hourglass-outline" size={18} color="#fff" />
                <Text style={styles.waitingText}>{t('session.waitingForTherapist')}</Text>
              </View>
              {/* Debug: Show channel name */}
              <View style={styles.debugBadge}>
                <Text style={styles.debugText}>Channel: {id?.substring(0, 30)}...</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <Avatar
              source={remoteAvatar}
              name={remoteName}
              size="xl"
            />
            <Text style={styles.remoteNameText}>{remoteName}</Text>
            <Text style={styles.videoOffText}>{t('session.waitingForTherapist')}</Text>
          </View>
        )
      )}

      {/* Remote muted indicator when video is on */}
      {remoteMediaState.videoEnabled && !remoteMediaState.audioEnabled && remoteUid && (
        <View style={styles.remoteMutedOverlay}>
          <Ionicons name="mic-off" size={20} color="#fff" />
        </View>
      )}

      {/* Local Video (PiP) */}
      <Animated.View
        style={[
          styles.localVideoContainer,
          { transform: pipPosition.getTranslateTransform() },
        ]}
        {...panResponder.panHandlers}
      >
        {isVideoEnabled && permissionsGranted ? (
          <RtcSurfaceView
            style={styles.localCamera}
            canvas={{ uid: 0 }}
            zOrderMediaOverlay={true}
          />
        ) : (
          <View style={styles.localVideoOff}>
            <Ionicons name="videocam-off" size={32} color="#fff" />
          </View>
        )}
        {!isAudioEnabled && (
          <View style={styles.mutedIndicator}>
            <Ionicons name="mic-off" size={14} color="#fff" />
          </View>
        )}
      </Animated.View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        {/* Session Timer */}
        <View style={styles.timerContainer}>
          <View style={styles.timerDot} />
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>

        {/* Network Quality Indicator */}
        <View style={styles.qualityContainer}>
          <View
            style={[
              styles.qualityDot,
              { backgroundColor: NETWORK_QUALITY_COLORS[networkQuality] },
            ]}
          />
          <Text style={styles.qualityText}>
            {t(`session.quality.${networkQuality}`)}
          </Text>
        </View>
      </View>

      {/* Participant Name */}
      <View style={styles.participantName}>
        <Text style={styles.participantNameText}>{remoteName}</Text>
      </View>

      {/* Controls Bar */}
      {showControls && (
        <Animated.View style={[styles.controlsBar, { opacity: controlsOpacity }]}>
          {/* Mute Audio */}
          <TouchableOpacity
            style={[styles.controlButton, !isAudioEnabled && styles.controlButtonActive]}
            onPress={() => handleControlPress(toggleAudio)}
          >
            <Ionicons
              name={isAudioEnabled ? 'mic' : 'mic-off'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Toggle Video */}
          <TouchableOpacity
            style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
            onPress={() => handleControlPress(toggleVideo)}
          >
            <Ionicons
              name={isVideoEnabled ? 'videocam' : 'videocam-off'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Flip Camera */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleControlPress(flipCamera)}
          >
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Speaker Toggle */}
          <TouchableOpacity
            style={[styles.controlButton, !isSpeakerOn && styles.controlButtonActive]}
            onPress={() => handleControlPress(toggleSpeaker)}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'ear'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          {/* End Call */}
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={onEndCallPress}
          >
            <Ionicons name="call" size={28} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  connectingContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  connectingName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  connectingText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteNameText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
  },
  videoOffText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
  remoteMutedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  remoteMutedText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  remoteMutedOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 70,
    left: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 120 : 80,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  waitingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  debugBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  debugText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  localVideoContainer: {
    position: 'absolute',
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  localCamera: {
    flex: 1,
  },
  localVideoOff: {
    flex: 1,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 4,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  qualityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  participantName: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  participantNameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  controlsBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 16,
    borderRadius: 32,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#EF4444',
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
});
