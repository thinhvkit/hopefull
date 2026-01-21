import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { therapistsService } from '@/services/therapists';
import { callSignalingService, CallDocument } from '@/services/call-signaling';
import { useAuthStore } from '@/store/auth';
import { Avatar } from '@/components/ui';
import type { InstantCallTherapist } from '@/types';

const CALL_TIMEOUT_MS = __DEV__ ? 5000 : 10000; // 5s in dev, 10s in prod
const MIN_PREPAID_DURATION = 15; // 15 minutes minimum

type SearchState = 'searching' | 'calling' | 'connecting' | 'no_therapists' | 'error';

export default function InstantCallSearchScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [searchState, setSearchState] = useState<SearchState>('searching');
  const [availableTherapists, setAvailableTherapists] = useState<InstantCallTherapist[]>([]);
  const [currentTherapistIndex, setCurrentTherapistIndex] = useState(0);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callSubscriptionRef = useRef<(() => void) | null>(null);

  const currentTherapist = availableTherapists[currentTherapistIndex];

  // Pulse animation for the search indicator
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  // Rotate animation for the searching icon
  useEffect(() => {
    if (searchState === 'searching') {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      return () => rotateAnimation.stop();
    }
  }, [searchState, rotateAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      if (callSubscriptionRef.current) {
        callSubscriptionRef.current();
      }
    };
  }, []);

  // Fetch available therapists on mount
  useEffect(() => {
    fetchAvailableTherapists();
  }, []);

  const fetchAvailableTherapists = async () => {
    try {
      setSearchState('searching');
      const therapists = await therapistsService.findAvailableForInstantCall(
        (user as any)?.preferredLanguage
      );

      if (therapists.length === 0) {
        setSearchState('no_therapists');
        return;
      }

      setAvailableTherapists(therapists);
      // Start calling the first therapist
      callTherapist(therapists[0], 0);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      setSearchState('error');
      setErrorMessage(t('instantCall.errorSearching'));
    }
  };

  const callTherapist = async (therapist: InstantCallTherapist, index: number) => {
    try {
      console.log(`[InstantCall] Calling therapist ${index + 1}/${availableTherapists.length}: ${therapist.firstName} ${therapist.lastName}`);
      setSearchState('calling');
      setCurrentTherapistIndex(index);

      // Create the call
      const callId = await callSignalingService.createCall({
        receiverId: therapist.userId,
        receiverName: `${therapist.firstName} ${therapist.lastName}`,
        receiverAvatar: therapist.avatarUrl,
        therapistId: therapist.id,
        type: 'instant',
      });

      setCurrentCallId(callId);

      // Subscribe to call status changes
      callSubscriptionRef.current = callSignalingService.subscribeToCall(
        callId,
        handleCallStatusChange
      );

      // Set timeout to try next therapist if no response
      callTimeoutRef.current = setTimeout(() => {
        handleCallTimeout(therapist, index);
      }, CALL_TIMEOUT_MS);

    } catch (error) {
      console.error('Error creating call:', error);
      // Try next therapist
      tryNextTherapist(index);
    }
  };

  const handleCallStatusChange = useCallback((call: CallDocument) => {
    console.log('Call status changed:', call.status);

    if (call.status === 'accepted') {
      // Clear timeout and subscription
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      if (callSubscriptionRef.current) {
        callSubscriptionRef.current();
      }

      setSearchState('connecting');

      // Navigate to video session
      setTimeout(() => {
        router.replace({
          pathname: '/session/[id]',
          params: { id: call.channelName },
        } as any);
      }, 500);
    } else if (call.status === 'declined') {
      // Therapist declined, try next
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      if (callSubscriptionRef.current) {
        callSubscriptionRef.current();
      }
      tryNextTherapist(currentTherapistIndex);
    }
  }, [currentTherapistIndex]);

  const handleCallTimeout = async (therapist: InstantCallTherapist, index: number) => {
    console.log(`[InstantCall] ⏰ Timeout after ${CALL_TIMEOUT_MS}ms for therapist ${index + 1}: ${therapist.firstName}`);

    // Cancel the current call
    if (currentCallId) {
      try {
        await callSignalingService.cancelCall(currentCallId);
      } catch (error) {
        console.error('Error cancelling call:', error);
      }
    }

    // Cleanup subscription
    if (callSubscriptionRef.current) {
      callSubscriptionRef.current();
      callSubscriptionRef.current = null;
    }

    // Try next therapist
    tryNextTherapist(index);
  };

  const tryNextTherapist = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;

    if (nextIndex < availableTherapists.length) {
      console.log(`[InstantCall] ➡️ Trying next therapist (${nextIndex + 1}/${availableTherapists.length})`);
      callTherapist(availableTherapists[nextIndex], nextIndex);
    } else {
      console.log(`[InstantCall] ❌ No more therapists to try (tried ${availableTherapists.length})`);
      setSearchState('no_therapists');
    }
  };

  const handleCancel = async () => {
    // Clear timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
    }

    // Cancel current call if exists
    if (currentCallId) {
      try {
        await callSignalingService.cancelCall(currentCallId);
      } catch (error) {
        console.error('Error cancelling call:', error);
      }
    }

    // Cleanup subscription
    if (callSubscriptionRef.current) {
      callSubscriptionRef.current();
    }

    router.back();
  };

  const handleRetry = () => {
    setAvailableTherapists([]);
    setCurrentTherapistIndex(0);
    setCurrentCallId(null);
    setErrorMessage(null);
    fetchAvailableTherapists();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderSearching = () => (
    <View style={styles.content}>
      <Animated.View
        style={[
          styles.pulseCircle,
          { transform: [{ scale: pulseAnim }] },
        ]}
      />
      <View style={styles.searchIconContainer}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="search" size={48} color="#4F46E5" />
        </Animated.View>
      </View>
      <Text style={styles.title}>{t('instantCall.searching')}</Text>
      <Text style={styles.subtitle}>{t('instantCall.searchingSubtitle')}</Text>
    </View>
  );

  const renderCalling = () => (
    <View style={styles.content}>
      <Animated.View
        style={[
          styles.pulseCircle,
          { transform: [{ scale: pulseAnim }] },
        ]}
      />
      <View style={styles.avatarContainer}>
        <Avatar
          source={currentTherapist?.avatarUrl}
          name={`${currentTherapist?.firstName} ${currentTherapist?.lastName}`}
          size="xl"
        />
      </View>
      <Text style={styles.title}>{t('instantCall.calling')}</Text>
      <Text style={styles.therapistName}>
        {currentTherapist?.firstName} {currentTherapist?.lastName}
      </Text>
      <Text style={styles.therapistTitle}>{currentTherapist?.professionalTitle}</Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={16} color="#FBBF24" />
        <Text style={styles.ratingText}>
          {currentTherapist?.averageRating.toFixed(1)} ({currentTherapist?.totalReviews} reviews)
        </Text>
      </View>
      <Text style={styles.waitingText}>{t('instantCall.waitingForResponse')}</Text>
    </View>
  );

  const renderConnecting = () => (
    <View style={styles.content}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
      </View>
      <Text style={styles.title}>{t('instantCall.connecting')}</Text>
      <Text style={styles.subtitle}>{t('instantCall.connectingSubtitle')}</Text>
      <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
    </View>
  );

  const renderNoTherapists = () => (
    <View style={styles.content}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people-outline" size={64} color="#9CA3AF" />
      </View>
      <Text style={styles.title}>{t('instantCall.noTherapists')}</Text>
      <Text style={styles.subtitle}>{t('instantCall.noTherapistsSubtitle')}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Ionicons name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.content}>
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      </View>
      <Text style={styles.title}>{t('common.error')}</Text>
      <Text style={styles.subtitle}>{errorMessage || t('errors.general')}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Ionicons name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
      </View>

      {searchState === 'searching' && renderSearching()}
      {searchState === 'calling' && renderCalling()}
      {searchState === 'connecting' && renderConnecting()}
      {searchState === 'no_therapists' && renderNoTherapists()}
      {searchState === 'error' && renderError()}

      {(searchState === 'searching' || searchState === 'calling') && (
        <View style={styles.footer}>
          <Text style={styles.minDurationText}>
            {t('instantCall.minDuration', { minutes: MIN_PREPAID_DURATION })}
          </Text>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  pulseCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#EEF2FF',
  },
  searchIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  therapistName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  therapistTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  waitingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
  },
  successIcon: {
    marginBottom: 24,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  loader: {
    marginTop: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  minDurationText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
