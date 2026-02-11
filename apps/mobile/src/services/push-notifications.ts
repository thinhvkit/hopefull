import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router, Href } from 'expo-router';
import { notificationsService } from './notifications';

// Track active chat to suppress notifications
let activeChatAppointmentId: string | null = null;

export function setActiveChatAppointmentId(id: string | null) {
  activeChatAppointmentId = id;
}

// Store last received notification data for tap handling
let lastNotificationData: PushNotificationData | null = null;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as PushNotificationData & { appointmentId?: string };
    lastNotificationData = data;
    // Suppress notification if user is already on this chat screen
    if (data?.screen === 'chat' && data?.appointmentId && data.appointmentId === activeChatAppointmentId) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export interface PushNotificationData {
  notificationId?: string;
  type?: string;
  screen?: string;
  appointmentId?: string;
  therapistId?: string;
  paymentId?: string;
}

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private onNotificationReceivedCallback: (() => void) | null = null;

  // Set callback for when notification is received (used to refresh badge count)
  setOnNotificationReceived(callback: () => void): void {
    this.onNotificationReceivedCallback = callback;
  }

  async initialize(): Promise<string | null> {
    console.log('[PushNotifications] Initializing...');

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('[PushNotifications] Permission not granted');
      return null;
    }
    console.log('[PushNotifications] Permission granted');

    // Get push token
    const token = await this.getExpoPushToken();
    console.log('[PushNotifications] Got token:', token ? token.substring(0, 30) + '...' : 'null');

    if (token) {
      this.expoPushToken = token;
      // Register with backend
      await this.registerToken(token);
    } else {
      console.log('[PushNotifications] No token received, skipping registration');
    }

    // Set up listeners
    this.setupListeners();
    console.log('[PushNotifications] Initialization complete');

    return token;
  }

  async requestPermissions(): Promise<boolean> {
    // Note: Device.isDevice is false on emulators, but we still want to test push notifications
    // Only skip on web/Expo Go where push isn't supported
    if (Platform.OS === 'web') {
      console.log('[PushNotifications] Push notifications not supported on web');
      return false;
    }

    console.log('[PushNotifications] Device.isDevice:', Device.isDevice);

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission denied');
      return false;
    }

    // Android specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    return true;
  }

  async getExpoPushToken(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      // Validate projectId is a valid UUID format
      const isValidUuid = projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

      console.log('[PushNotifications] projectId:', projectId, 'isValidUuid:', isValidUuid);

      if (!isValidUuid) {
        // In development without EAS or with invalid projectId, use FCM token directly
        console.log('[PushNotifications] No valid Expo project ID, using native FCM token');
        return await this.getNativePushToken();
      }

      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        console.log('[PushNotifications] Expo push token:', pushTokenData.data);
        return pushTokenData.data;
      } catch (expoError) {
        // If Expo token fails, fall back to native FCM token
        console.log('[PushNotifications] Expo token failed, falling back to FCM:', expoError);
        return await this.getNativePushToken();
      }
    } catch (error) {
      console.error('[PushNotifications] Error getting token:', error);
      return null;
    }
  }

  private async getNativePushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getDevicePushTokenAsync();
      console.log('[PushNotifications] Native FCM token:', token.data);
      return token.data;
    } catch (error) {
      console.error('[PushNotifications] Error getting native token:', error);
      return null;
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
    if (this.expoPushToken) {
      try {
        await notificationsService.removeDeviceToken(this.expoPushToken);
        console.log('[PushNotifications] Token unregistered from backend');
      } catch (error) {
        console.error('[PushNotifications] Error unregistering token:', error);
      }
    }
  }

  setupListeners(): void {
    // Handle notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[PushNotifications] Foreground notification:', notification);
      // The notification will be shown automatically due to setNotificationHandler config

      // Update badge count from notification data
      const data = notification.request.content.data as PushNotificationData & { badgeCount?: string };
      if (data?.badgeCount) {
        const count = parseInt(data.badgeCount, 10);
        if (!isNaN(count)) {
          this.setBadgeCount(count);
        }
      }

      // Trigger callback to refresh notification count
      if (this.onNotificationReceivedCallback) {
        this.onNotificationReceivedCallback();
      }
    });

    // Handle notification interactions (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      let data = this.extractNotificationData(response.notification);
      // Fallback: if tap data is missing screen, use last received notification data
      if (!data.screen && lastNotificationData?.screen) {
        data = lastNotificationData;
      }
      lastNotificationData = null;
      this.handleNotificationNavigation(data);
    });

    // Handle cold-start: notification tapped before listener was set up
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        console.log('[PushNotifications] Cold-start notification:', JSON.stringify(response.notification.request.content.data));
        const data = this.extractNotificationData(response.notification);
        this.handleNotificationNavigation(data);
      }
    });
  }

  private extractNotificationData(notification: Notifications.Notification): PushNotificationData {
    const raw = notification.request.content.data ?? {};
    // On Android, FCM data may be nested under a 'data' key or at top level
    const data = (raw.data && typeof raw.data === 'object' ? { ...raw, ...raw.data } : raw) as PushNotificationData;
    return data;
  }

  handleNotificationNavigation(data: PushNotificationData): void {
    if (!data) return;

    const { screen, appointmentId, therapistId } = data;

    switch (screen) {
      case 'appointment-details':
        if (appointmentId) {
          router.push(`/appointment/${appointmentId}` as Href);
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
        // Navigate to appointments as payment details screen may not exist
        router.push('/(tabs)/appointments' as Href);
        break;
      default:
        // Default: open notifications screen
        router.push('/notifications' as Href);
        break;
    }
  }

  removeListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('[PushNotifications] Error setting badge:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('[PushNotifications] Error getting badge:', error);
      return 0;
    }
  }

  // Schedule a local notification (useful for testing)
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationData,
    seconds = 1
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
    return identifier;
  }
}

export const pushNotificationService = new PushNotificationService();
