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
  Vibration,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui';
import { callSignalingService, CallDocument } from '@/services/call-signaling';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AUTO_DECLINE_SECONDS = 30;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

export default function IncomingCallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    channelName: string;
  }>();

  const [countdown, setCountdown] = useState(AUTO_DECLINE_SECONDS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [swipeHint, setSwipeHint] = useState('');
  const callUnsubscribe = useRef<(() => void) | null>(null);

  // Animations
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const scaleInAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAccept = useRef(new Animated.Value(1)).current;
  const buttonScaleDecline = useRef(new Animated.Value(1)).current;

  // Slide to answer pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isProcessing,
      onMoveShouldSetPanResponder: () => !isProcessing,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;
        // Clamp the slide between -SWIPE_THRESHOLD and SWIPE_THRESHOLD
        const clampedDx = Math.max(-SWIPE_THRESHOLD, Math.min(SWIPE_THRESHOLD, dx));
        slideAnim.setValue(clampedDx);

        // Show hint based on direction
        if (dx > 30) {
          setSwipeHint('accept');
        } else if (dx < -30) {
          setSwipeHint('decline');
        } else {
          setSwipeHint('');
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;

        if (dx > SWIPE_THRESHOLD * 0.7) {
          // Swipe right - Accept
          Animated.spring(slideAnim, {
            toValue: SWIPE_THRESHOLD,
            useNativeDriver: true,
          }).start(() => {
            handleAccept();
          });
        } else if (dx < -SWIPE_THRESHOLD * 0.7) {
          // Swipe left - Decline
          Animated.spring(slideAnim, {
            toValue: -SWIPE_THRESHOLD,
            useNativeDriver: true,
          }).start(() => {
            handleDecline();
          });
        } else {
          // Return to center
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 5,
            useNativeDriver: true,
          }).start();
          setSwipeHint('');
        }
      },
    })
  ).current;

  // Subscribe to call status changes
  useEffect(() => {
    if (params.callId) {
      // Update call status to ringing
      callSignalingService.updateCallRinging(params.callId);

      // Subscribe to call status changes
      callUnsubscribe.current = callSignalingService.subscribeToCall(
        params.callId,
        handleCallStatusChange
      );
    }

    return () => {
      if (callUnsubscribe.current) {
        callUnsubscribe.current();
      }
    };
  }, [params.callId]);

  const handleCallStatusChange = (call: CallDocument) => {
    console.log('Incoming call status changed:', call.status);

    // If caller cancelled or call ended, go back
    if (call.status === 'cancelled' || call.status === 'ended' || call.status === 'missed') {
      stopRingtone();
      router.back();
    }
  };

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleInAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Ringing pulse animation
  useEffect(() => {
    const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 2.2,
            duration: 2000,
            easing: Easing.out(Easing.cubic),
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

  // Glow animation for accept button
  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();
    return () => glowAnimation.stop();
  }, [glowAnim]);

  // Arrow hint animation
  useEffect(() => {
    const arrowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    arrowAnimation.start();
    return () => arrowAnimation.stop();
  }, [arrowAnim]);

  // Vibration for incoming call
  useEffect(() => {
    const vibrationPattern = [0, 400, 200, 400];
    const vibrationInterval = setInterval(() => {
      Vibration.vibrate(vibrationPattern);
    }, 2500);

    Vibration.vibrate(vibrationPattern);

    return () => {
      Vibration.cancel();
      clearInterval(vibrationInterval);
    };
  }, []);

  // Auto-decline countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const stopRingtone = () => {
    Vibration.cancel();
  };

  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(buttonScaleAccept, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAccept, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      stopRingtone();

      if (callUnsubscribe.current) {
        callUnsubscribe.current();
      }

      try {
        if (params.callId) {
          await callSignalingService.acceptCall(params.callId);
        }
        // Navigate to session with caller info and callId for end call sync
        router.replace({
          pathname: `/session/${params.channelName || params.callId}` as any,
          params: {
            callId: params.callId,
            callerName: params.callerName,
            callerAvatar: params.callerAvatar,
          },
        });
      } catch (error) {
        console.error('Failed to accept call:', error);
        setIsProcessing(false);
      }
    });
  };

  const handleDecline = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.sequence([
      Animated.timing(buttonScaleDecline, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleDecline, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      stopRingtone();

      if (callUnsubscribe.current) {
        callUnsubscribe.current();
      }

      try {
        if (params.callId) {
          await callSignalingService.declineCall(params.callId);
        }
      } catch (error) {
        console.error('Failed to decline call:', error);
      }

      router.back();
    });
  };

  const pulseOpacity1 = pulseAnim1.interpolate({
    inputRange: [1, 2.2],
    outputRange: [0.5, 0],
  });

  const pulseOpacity2 = pulseAnim2.interpolate({
    inputRange: [1, 2.2],
    outputRange: [0.4, 0],
  });

  const pulseOpacity3 = pulseAnim3.interpolate({
    inputRange: [1, 2.2],
    outputRange: [0.3, 0],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const arrowTranslateX = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const slideBackgroundColor = slideAnim.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: ['rgba(239, 68, 68, 0.3)', 'rgba(255, 255, 255, 0)', 'rgba(16, 185, 129, 0.3)'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background */}
      <View style={styles.gradient} />

      {/* Animated background overlay based on swipe */}
      <Animated.View
        style={[
          styles.swipeBackground,
          { backgroundColor: slideBackgroundColor },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeInAnim,
            transform: [{ scale: scaleInAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.callIndicator}>
            <View style={styles.callIndicatorDot} />
            <Text style={styles.incomingLabel}>{t('session.incomingCall')}</Text>
          </View>
          <Text style={styles.countdownText}>
            {t('session.autoDecline', { seconds: countdown })}
          </Text>
        </View>

        {/* Avatar with pulse animation */}
        <View style={styles.avatarSection}>
          <View style={styles.pulseContainer}>
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
            <View style={styles.avatarContainer}>
              <Avatar
                source={params.callerAvatar}
                name={params.callerName || 'Caller'}
                size="xl"
              />
            </View>
          </View>

          <Text style={styles.callerName}>{params.callerName || 'Unknown'}</Text>
          <Text style={styles.callerTitle}>{t('session.patientCall')}</Text>

          {/* Call type badge */}
          <View style={styles.callTypeBadge}>
            <Ionicons name="videocam" size={16} color="#818CF8" />
            <Text style={styles.callTypeText}>{t('session.videoCall')}</Text>
          </View>
        </View>

        {/* Slide to answer section */}
        <View style={styles.slideSection}>
          <View style={styles.slideTrack}>
            {/* Decline hint - left side */}
            <View style={styles.slideHintLeft}>
              <Animated.View style={{ opacity: swipeHint === 'decline' ? 1 : 0.5 }}>
                <Ionicons name="close" size={24} color="#EF4444" />
              </Animated.View>
            </View>

            {/* Accept hint - right side */}
            <View style={styles.slideHintRight}>
              <Animated.View style={{ opacity: swipeHint === 'accept' ? 1 : 0.5 }}>
                <Ionicons name="checkmark" size={24} color="#10B981" />
              </Animated.View>
            </View>

            {/* Slide handle */}
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.slideHandle,
                {
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              <View style={styles.slideHandleGradient}>
                <Animated.View
                  style={[
                    styles.arrowContainer,
                    { transform: [{ translateX: arrowTranslateX }] },
                  ]}
                >
                  <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                </Animated.View>
              </View>
            </Animated.View>
          </View>
          <Text style={styles.slideHintText}>{t('session.slideToAnswer')}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          {/* Decline Button */}
          <View style={styles.actionWrapper}>
            <Animated.View style={{ transform: [{ scale: buttonScaleDecline }] }}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleDecline}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.actionLabel}>{t('session.decline')}</Text>
          </View>

          {/* Accept Button with glow */}
          <View style={styles.actionWrapper}>
            <Animated.View
              style={[
                styles.acceptGlow,
                {
                  transform: [{ scale: glowScale }],
                  opacity: glowOpacity,
                },
              ]}
            />
            <Animated.View style={{ transform: [{ scale: buttonScaleAccept }] }}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAccept}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <Ionicons name="videocam" size={32} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.actionLabel}>{t('session.accept')}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  swipeBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 70 : 50,
  },
  callIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  callIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  incomingLabel: {
    fontSize: 15,
    color: '#E2E8F0',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  countdownText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '500',
  },
  avatarSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  pulseContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  avatarContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  callerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 20,
    letterSpacing: 0.3,
  },
  callerTitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.2)',
  },
  callTypeText: {
    fontSize: 13,
    color: '#A5B4FC',
    marginLeft: 6,
    fontWeight: '500',
  },
  slideSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  slideTrack: {
    width: SCREEN_WIDTH * 0.75,
    height: 64,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.5)',
  },
  slideHintLeft: {
    position: 'absolute',
    left: 20,
  },
  slideHintRight: {
    position: 'absolute',
    right: 20,
  },
  slideHandle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  slideHandleGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 28,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideHintText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: Platform.OS === 'ios' ? 50 : 35,
    paddingHorizontal: 40,
  },
  actionWrapper: {
    alignItems: 'center',
  },
  declineButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  acceptGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#10B981',
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  actionLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 10,
    fontWeight: '600',
  },
});
