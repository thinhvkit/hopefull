import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatScreen, useChatContext, setConversation } from 'rn-firebase-chat';
import { useAppointment } from '@/hooks/useAppointments';
import { useAuthStore } from '@/store/auth';
import { notificationsService } from '@/services/notifications';
import { setActiveChatAppointmentId } from '@/services/push-notifications';

export default function AppointmentChatScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const { data: appointment, isLoading } = useAppointment(appointmentId!);

  const isTherapist = user?.role === 'THERAPIST';

  // Derive partner info based on current user's role
  const partner = React.useMemo(() => {
    if (!appointment) return null;

    if (isTherapist) {
      return {
        id: appointment.userId,
        name: [appointment.user?.firstName, appointment.user?.lastName]
          .filter(Boolean)
          .join(' ') || 'Patient',
        avatar: appointment.user?.avatarUrl || '',
      };
    }

    return {
      id: appointment.therapist?.userId || '',
      name: [appointment.therapist?.user.firstName, appointment.therapist?.user.lastName]
        .filter(Boolean)
        .join(' ') || 'Therapist',
      avatar: appointment.therapist?.user.avatarUrl || '',
    };
  }, [appointment, isTherapist]);

  // Pre-set conversation in chat state so ChatScreen initializes conversationRef correctly.
  // ChatScreen must NOT mount until state.conversation is set, otherwise its internal
  // conversationRef = useRef(conversationInfo) will be null and never update.
  const { chatDispatch, chatState } = useChatContext();
  useEffect(() => {
    if (partner && appointmentId && user?.id) {
      chatDispatch(
        setConversation({
          id: `apt-${appointmentId}`,
          members: [user.id, partner.id],
          name: partner.name,
          image: partner.avatar,
          updatedAt: Date.now(),
        })
      );

    }
  }, [partner, appointmentId, chatDispatch, user?.id]);

  // ChatScreen should only render once conversation is in state
  const conversationReady = !!(chatState as any)?.conversation?.id;

  // Debug logging — all hooks called before any early returns
  useEffect(() => {
    if (__DEV__ && appointment && partner) {
      console.log('[Chat] appointmentId:', appointmentId);
      console.log('[Chat] conversationId:', `apt-${appointmentId}`);
      console.log('[Chat] conversationReady:', conversationReady);
      console.log('[Chat] current user id:', user?.id);
      console.log('[Chat] partner:', JSON.stringify(partner));
    }
  }, [appointment, partner, appointmentId, user?.id, conversationReady]);

  const onStartLoad = useCallback(() => {
    if (__DEV__) console.log('[Chat] onStartLoad - fetching message history...');
  }, []);

  const onLoadEnd = useCallback(() => {
    if (__DEV__) {
      console.log('[Chat] onLoadEnd - messages loaded');
      // const firebaseInstance = FirestoreServices.getInstance();
      // firebaseInstance.getMessageHistory(20).then((messages: any[]) => {
      //   console.log('[Chat] Message history count:', messages.length);
      //   messages.forEach((msg: any, index: number) => {
      //     console.log(`[Chat] Message ${index}:`, JSON.stringify(msg));
      //   });
      // });
    }
  }, []);

  // Track active chat screen for notification suppression
  useEffect(() => {
    if (appointmentId) {
      setActiveChatAppointmentId(appointmentId);
    }
    return () => setActiveChatAppointmentId(null);
  }, [appointmentId]);

  const onSendNotification = useCallback(() => {
    if (!partner || !appointmentId || !user) return;
    notificationsService
      .sendChatMessageNotification(partner.id, user.firstName || 'Someone', appointmentId)
      .catch((err) => {
        if (__DEV__) console.warn('[Chat] Failed to send notification:', err);
      });
  }, [partner, appointmentId, user]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  if (!appointment || !partner) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{t('errors.notFound')}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {partner.name}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {/* Chat — only mount after conversation is set in state so ChatScreen's
           internal conversationRef initializes correctly */}
      {conversationReady ? (
        <ChatScreen
          memberIds={[partner.id]}
          partners={[partner]}
          customConversationInfo={{ id: `apt-${appointmentId}` }}
          enableTyping
          messageStatusEnable
          isKeyboardInternallyHandled
          onStartLoad={onStartLoad}
          onLoadEnd={onLoadEnd}
          sendMessageNotification={onSendNotification}
        />
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#4F46E5" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 8,
  },
});
