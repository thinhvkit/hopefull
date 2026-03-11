import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { ChatProvider } from 'rn-firebase-chat';
import { StripeProvider } from '@stripe/stripe-react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { useAuthStore } from '@/store/auth';
import { useLocaleStore } from '@/store/locale';
import { configureGoogleSignIn } from '@/services/social-auth';
import { pushNotificationService } from '@/services';
import i18n from '@/i18n';

// Register Firebase background message handler (must be top-level, outside component)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[PushNotifications] Background message:', remoteMessage.messageId);
});

// Foreground message handler — display notification via notifee
messaging().onMessage(async (remoteMessage) => {
  console.log('[PushNotifications] Foreground message:', remoteMessage.messageId);
  pushNotificationService.handleForegroundMessage(remoteMessage);
});

// Notification tap from foreground (notifee-displayed notifications)
notifee.onForegroundEvent(({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification) {
    const data = (detail.notification.data || {}) as Record<string, string>;
    console.log('[PushNotifications] Foreground notification tapped:', data);
    pushNotificationService.handleNotificationNavigation(data);
  }
});

// Notification tap from background/killed state (notifee)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification) {
    const data = (detail.notification.data || {}) as Record<string, string>;
    console.log('[PushNotifications] Background notification tapped:', data);
    pushNotificationService.handleNotificationNavigation(data);
  }
});

// Notification tap that opened app from background (Firebase — for system-displayed notifications)
messaging().onNotificationOpenedApp((remoteMessage) => {
  console.log('[PushNotifications] Firebase notification opened app:', remoteMessage.data);
  const data = (remoteMessage.data || {}) as Record<string, string>;
  pushNotificationService.handleNotificationNavigation(data);
});

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function useProtectedRoute() {
  const { user, isAuthenticated, isLoading, hasSeenOnboarding } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const pushNotificationsInitialized = useRef(false);

  // Initialize push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && !pushNotificationsInitialized.current) {
      pushNotificationsInitialized.current = true;

      pushNotificationService.setOnNotificationReceived(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      pushNotificationService.initialize().catch((error) => {
        console.warn('[PushNotifications] Init error:', error);
      });
    }

    if (!isAuthenticated && pushNotificationsInitialized.current) {
      pushNotificationsInitialized.current = false;
      pushNotificationService.removeListeners();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const inTherapistTabsGroup = segments[0] === '(therapist-tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const isOnWelcome = segments.length === 0 || segments[0] === 'index';
    const isTherapist = user?.role === 'THERAPIST';

    if (__DEV__) {
      console.log('=== useProtectedRoute ===');
      console.log('isAuthenticated:', isAuthenticated);
      console.log('isTherapist:', isTherapist);
      console.log('segments:', segments);
      console.log('========================');
    }

    // First time user - show onboarding
    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    // Authenticated and on auth/welcome screens - go to appropriate tabs
    if (isAuthenticated && (inAuthGroup || isOnWelcome)) {
      const target = isTherapist ? '/(therapist-tabs)' : '/(tabs)';
      if (__DEV__) console.log('Redirect:', target);
      // Defer to next tick so navigator tree is fully mounted on cold start
      setTimeout(() => router.replace(target as any), 0);
      return;
    }
  }, [user, isAuthenticated, segments, isLoading, navigationState?.key, hasSeenOnboarding]);
}

export default function RootLayout() {
  const { loadStoredAuth, user, isAuthenticated } = useAuthStore();
  const { initializeLocale } = useLocaleStore();

  const chatUserInfo = useMemo(() => {
    if (!isAuthenticated || !user) return undefined;
    return {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      avatar: user.avatarUrl || '',
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const init = async () => {
      // Configure Google Sign-In
      configureGoogleSignIn();

      // Initialize locale and language
      await initializeLocale();

      await loadStoredAuth();
      await SplashScreen.hideAsync();
    };
    init();
  }, []);

  useProtectedRoute();

  const content = (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          presentation: route.name === 'therapist/[id]' ? 'card' : undefined,
        })}
      />
    </>
  );

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.hopefull">
          {chatUserInfo ? (
            <ChatProvider
              {...{ userInfo: chatUserInfo, enableEncrypt: false } as any}
            >
              {content}
            </ChatProvider>
          ) : (
            content
          )}
        </StripeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
