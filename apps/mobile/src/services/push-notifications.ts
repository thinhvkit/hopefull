import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import { router, Href } from 'expo-router';
import { notificationsService } from './notifications';

// Track active chat to suppress notifications
let activeChatAppointmentId: string | null = null;

export function setActiveChatAppointmentId(id: string | null) {
  activeChatAppointmentId = id;
}

export interface PushNotificationData {
  notificationId?: string;
  type?: string;
  screen?: string;
  appointmentId?: string;
  therapistId?: string;
  paymentId?: string;
  badgeCount?: string;
}

class PushNotificationService {
  private fcmToken: string | null = null;
  private onNotificationReceivedCallback: (() => void) | null = null;

  setOnNotificationReceived(callback: () => void): void {
    this.onNotificationReceivedCallback = callback;
  }

  async initialize(): Promise<string | null> {
    console.log('[PushNotifications] Initializing...');

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('[PushNotifications] Permission not granted');
      return null;
    }
    console.log('[PushNotifications] Permission granted');

    // Create Android notification channel
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default',
        importance: AndroidImportance.HIGH,
        vibration: true,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // Get FCM token
    const token = await this.getFcmToken();
    console.log('[PushNotifications] Got FCM token:', token ? token.substring(0, 30) + '...' : 'null');

    if (token) {
      this.fcmToken = token;
      await this.registerToken(token);
    } else {
      console.log('[PushNotifications] No token received, skipping registration');
    }

    // Listen for FCM token refresh
    this.setupTokenRefreshListener();

    // Handle notification tap that opened the app from killed state
    this.handleInitialNotification();

    console.log('[PushNotifications] Initialization complete');
    return token;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('[PushNotifications] Push notifications not supported on web');
      return false;
    }

    // Request permission via Firebase Messaging (handles APNs authorization on iOS)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[PushNotifications] Permission denied, status:', authStatus);
      return false;
    }

    return true;
  }

  private async getFcmToken(): Promise<string | null> {
    try {
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }
      const token = await messaging().getToken();
      console.log('[PushNotifications] FCM token:', token.substring(0, 30) + '...');
      return token;
    } catch (error) {
      console.error('[PushNotifications] Error getting FCM token:', error);
      return null;
    }
  }

  private setupTokenRefreshListener(): void {
    messaging().onTokenRefresh(async (newToken) => {
      console.log('[PushNotifications] FCM token refreshed');
      this.fcmToken = newToken;
      await this.registerToken(newToken);
    });
  }

  // Called from top-level onMessage handler in _layout.tsx
  async handleForegroundMessage(remoteMessage: any): Promise<void> {
    const data = (remoteMessage.data || {}) as PushNotificationData;

    console.log('[PushNotifications] handleForegroundMessage:', {
      title: remoteMessage.notification?.title,
      data,
    });

    // Trigger callback to refresh notification count
    if (this.onNotificationReceivedCallback) {
      this.onNotificationReceivedCallback();
    }

    // Update badge
    if (data.badgeCount) {
      const count = parseInt(data.badgeCount, 10);
      if (!isNaN(count)) {
        await this.setBadgeCount(count);
      }
    }

    // Suppress if user is on the active chat screen for this conversation
    if (data.screen === 'chat' && data.appointmentId && data.appointmentId === activeChatAppointmentId) {
      console.log('[PushNotifications] Suppressing chat notification (user is on this chat screen)');
      return;
    }

    // Display notification via notifee
    const title = remoteMessage.notification?.title || 'New Notification';
    const body = remoteMessage.notification?.body || '';

    try {
      await notifee.displayNotification({
        title,
        body,
        data: data as Record<string, string>,
        android: {
          channelId: 'default',
          smallIcon: 'notification_icon',
          sound: 'default',
          pressAction: { id: 'default' },
        },
        ios: {
          sound: 'default',
        },
      });
      console.log('[PushNotifications] Notifee displayed notification');
    } catch (error) {
      console.error('[PushNotifications] Notifee display error:', error);
    }
  }

  private async handleInitialNotification(): Promise<void> {
    // Check if app was opened from a killed state by tapping a notification
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('[PushNotifications] App opened from killed state via notification');
      const data = (remoteMessage.data || {}) as PushNotificationData;
      this.handleNotificationNavigation(data);
    }
  }

  async registerToken(token: string): Promise<void> {
    try {
      const platform = Platform.OS;
      console.log('[PushNotifications] Registering token with backend:', { token: token.substring(0, 20) + '...', platform });
      await notificationsService.registerDeviceToken(token, platform);
      console.log('[PushNotifications] Token registered successfully!');
    } catch (error: any) {
      console.error('[PushNotifications] Error registering token:', error?.message || error);
    }
  }

  async unregisterToken(): Promise<void> {
    if (this.fcmToken) {
      try {
        await notificationsService.removeDeviceToken(this.fcmToken);
        console.log('[PushNotifications] Token unregistered from backend');
      } catch (error) {
        console.error('[PushNotifications] Error unregistering token:', error);
      }
    }
  }

  handleNotificationNavigation(data: PushNotificationData): void {
    if (!data) return;

    const { screen, type, appointmentId, therapistId } = data;

    // Route by screen first, then fall back to type
    const route = screen || this.getScreenFromType(type);

    switch (route) {
      case 'appointment-details':
        if (appointmentId) {
          router.push(`/appointment/${appointmentId}` as Href);
        }
        break;
      case 'join-session':
        if (appointmentId) {
          router.push(`/session/${appointmentId}` as Href);
        }
        break;
      case 'chat':
        if (appointmentId) {
          router.push(`/chat/${appointmentId}` as Href);
        } else if (therapistId) {
          router.push(`/therapist/${therapistId}` as Href);
        }
        break;
      case 'payment-details':
        router.push('/(tabs)/appointments' as Href);
        break;
      default:
        router.push('/notifications' as Href);
        break;
    }
  }

  private getScreenFromType(type?: string): string | undefined {
    switch (type) {
      case 'THERAPIST_MESSAGE':
        return 'chat';
      case 'BOOKING_CONFIRMATION':
      case 'APPOINTMENT_REMINDER':
        return 'appointment-details';
      case 'PAYMENT_RECEIPT':
        return 'payment-details';
      default:
        return undefined;
    }
  }

  removeListeners(): void {
    // Firebase messaging listeners are automatically cleaned up
    // Notifee foreground event is tied to component lifecycle
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await notifee.setBadgeCount(count);
    } catch (error) {
      console.error('[PushNotifications] Error setting badge:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await notifee.getBadgeCount();
    } catch (error) {
      console.error('[PushNotifications] Error getting badge:', error);
      return 0;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
