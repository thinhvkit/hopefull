import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/store/auth';

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
  const { isAuthenticated, isLoading, hasSeenOnboarding } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';

    const isOnWelcome = segments.length === 0 || segments[0] === 'index';

    // First time user - show onboarding
    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    // Not authenticated and trying to access protected routes (tabs)
    if (!isAuthenticated && inTabsGroup) {
      router.replace('/');
      return;
    }

    // Authenticated and on auth/welcome screens - go to tabs
    if (isAuthenticated && (inAuthGroup || isOnWelcome)) {
      router.replace('/(tabs)');
      return;
    }
  }, [isAuthenticated, segments, isLoading, navigationState?.key, hasSeenOnboarding]);
}

export default function RootLayout() {
  const { loadStoredAuth } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await loadStoredAuth();
      await SplashScreen.hideAsync();
    };
    init();
  }, []);

  useProtectedRoute();

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          presentation: route.name === 'therapist/[id]' ? 'card' : undefined,
        })}
      />
    </QueryClientProvider>
  );
}
