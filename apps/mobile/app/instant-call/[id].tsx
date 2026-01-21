import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui';
import { useTherapist } from '@/hooks/useTherapists';
import { callSignalingService, CallDocument, CallStatus } from '@/services/call-signaling';

const CALL_TIMEOUT_SECONDS = 60;

export default function InstantCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  // Fetch therapist details
  const { data: therapist, isLoading } = useTherapist(id!);

  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connecting' | 'failed'>('calling');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [callId, setCallId] = useState<string | null>(null);
  const callUnsubscribe = useRef<(() => void) | null>(null);

  // Animations
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;

  // Create call when therapist data is loaded
  useEffect(() => {
    if (therapist && !callId) {
      createCall();
    }

    return () => {
      // Cleanup: cancel call if leaving screen while still calling
      if (callUnsubscribe.current) {
        callUnsubscribe.current();
      }
    };
  }, [therapist]);

  const createCall = async () => {
    if (!therapist) return;

    try {
      const newCallId = await callSignalingService.createCall({
        receiverId: therapist.userId,
        receiverName: `${therapist.user.firstName} ${therapist.user.lastName}`,
        receiverAvatar: therapist.user.avatarUrl,
        therapistId: therapist.id,
        type: 'instant',
      });

      setCallId(newCallId);

      // Subscribe to call status changes
      callUnsubscribe.current = callSignalingService.subscribeToCall(
        newCallId,
        handleCallStatusChange
      );
    } catch (error) {
      console.error('Failed to create call:', error);
      setCallStatus('failed');
    }
  };

  const handleCallStatusChange = (call: CallDocument) => {
    console.log('Call status changed:', call.status);

    switch (call.status) {
      case 'ringing':
        setCallStatus('ringing');
        break;
      case 'accepted':
        setCallStatus('connecting');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate to session after brief connecting state with callId for end call sync
        setTimeout(() => {
          router.replace({
            pathname: `/session/${call.channelName}` as any,
            params: {
              callId: call.id,
              callerName: call.receiverName,
              callerAvatar: call.receiverAvatar,
            },
          });
        }, 500);
        break;
      case 'declined':
        setCallStatus('failed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'cancelled':
      case 'ended':
        router.back();
        break;
    }
  };

  // Pulse animation for calling state
  useEffect(() => {
    const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 2,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createPulseAnimation(pulseAnim1, 0);
    const anim2 = createPulseAnimation(pulseAnim2, 600);
    const anim3 = createPulseAnimation(pulseAnim3, 1200);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [pulseAnim1, pulseAnim2, pulseAnim3]);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => {
        if (prev >= CALL_TIMEOUT_SECONDS) {
          // Mark call as missed after timeout
          if (callId) {
            callSignalingService.markCallMissed(callId);
          }
          setCallStatus('failed');
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [callId]);

  const handleCancelCall = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    if (callId) {
      await callSignalingService.cancelCall(callId);
    }

    if (callUnsubscribe.current) {
      callUnsubscribe.current();
    }

    router.back();
  };

  const handleRetry = async () => {
    setCallStatus('calling');
    setElapsedTime(0);
    setCallId(null);

    if (callUnsubscribe.current) {
      callUnsubscribe.current();
    }

    // Create a new call
    await createCall();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return t('instantCall.calling');
      case 'ringing':
        return t('instantCall.ringing');
      case 'connecting':
        return t('instantCall.connecting');
      case 'failed':
        return t('instantCall.noAnswer');
      default:
        return '';
    }
  };

  const pulseOpacity1 = pulseAnim1.interpolate({
    inputRange: [1, 2],
    outputRange: [0.4, 0],
  });

  const pulseOpacity2 = pulseAnim2.interpolate({
    inputRange: [1, 2],
    outputRange: [0.3, 0],
  });

  const pulseOpacity3 = pulseAnim3.interpolate({
    inputRange: [1, 2],
    outputRange: [0.2, 0],
  });

  const therapistName = therapist
    ? `${therapist.user.firstName} ${therapist.user.lastName}`
    : 'Therapist';
  const therapistTitle = therapist?.specializations?.[0]?.specialization?.name || 'Mental Health Professional';
  const therapistAvatar = therapist?.user.avatarUrl;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <View style={styles.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
      </View>

      {/* Avatar with pulse animation */}
      <View style={styles.avatarSection}>
        <View style={styles.pulseContainer}>
          {callStatus !== 'failed' && (
            <>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim1 }],
                    opacity: pulseOpacity1,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim2 }],
                    opacity: pulseOpacity2,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim3 }],
                    opacity: pulseOpacity3,
                  },
                ]}
              />
            </>
          )}
          <View style={styles.avatarContainer}>
            <Avatar
              source={therapistAvatar}
              name={therapistName}
              size="xl"
            />
          </View>
        </View>

        <Text style={styles.therapistName}>{therapistName}</Text>
        <Text style={styles.therapistTitle}>{therapistTitle}</Text>
      </View>

      {/* Call type */}
      <View style={styles.callTypeContainer}>
        <Ionicons name="videocam" size={20} color="#9CA3AF" />
        <Text style={styles.callTypeText}>{t('instantCall.videoCall')}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {callStatus === 'failed' ? (
          <>
            {/* Retry Button */}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <Ionicons name="refresh" size={24} color="#fff" />
              <Text style={styles.retryButtonText}>{t('instantCall.retry')}</Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleCancelCall}
            >
              <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Cancel Button */
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelCall}
          >
            <Ionicons name="close" size={36} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {callStatus !== 'failed' && (
        <Text style={styles.cancelText}>{t('instantCall.tapToCancel')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 80 : 60,
  },
  statusText: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timerText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  avatarSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  therapistName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
  },
  therapistTitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  callTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  callTypeText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  actionsContainer: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  cancelButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
});
