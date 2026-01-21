import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useIncomingCalls } from '../../src/hooks/useIncomingCalls';

// Module-level flag to prevent redirect loops
let isRedirecting = false;

export default function TherapistTabsLayout() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const isTherapist = user?.role === 'THERAPIST';
  const navigation = useNavigation();

  // Listen for incoming calls (only for therapists)
  useIncomingCalls();

  // Redirect to welcome if not authenticated or not a therapist
  useEffect(() => {
    if (!isLoading && !isRedirecting) {
      if (!isAuthenticated) {
        console.log('TherapistTabsLayout: Not authenticated, resetting to welcome');
        isRedirecting = true;
        const rootNav = navigation.getParent() || navigation;
        rootNav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'index' }],
          })
        );
        setTimeout(() => { isRedirecting = false; }, 1000);
      } else if (!isTherapist) {
        console.log('TherapistTabsLayout: Not a therapist, redirecting to user tabs');
        isRedirecting = true;
        const rootNav = navigation.getParent() || navigation;
        rootNav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: '(tabs)' }],
          })
        );
        setTimeout(() => { isRedirecting = false; }, 1000);
      }
    }
  }, [isLoading, isAuthenticated, isTherapist, navigation]);

  // Show nothing while redirecting
  if (!isLoading && (!isAuthenticated || !isTherapist)) {
    return null;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'index') {
            iconName = 'home';
          } else if (route.name === 'appointments') {
            iconName = 'calendar';
          } else if (route.name === 'earnings') {
            iconName = 'cash';
          } else if (route.name === 'profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        title: route.name === 'index' ? t('therapistDashboard.home') :
               route.name === 'appointments' ? t('therapistDashboard.appointments') :
               route.name === 'earnings' ? t('therapistDashboard.earnings') :
               route.name === 'profile' ? t('profile.title') : route.name,
      })}
    />
  );
}
