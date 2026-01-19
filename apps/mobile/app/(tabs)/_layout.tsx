import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { CommonActions, useNavigation } from '@react-navigation/native';

// Module-level flag to prevent redirect loops
let isRedirectingToWelcome = false;

export default function TabsLayout() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const isTherapist = user?.role === 'THERAPIST';
  const navigation = useNavigation();

  // Redirect to welcome if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isRedirectingToWelcome) {
      console.log('TabsLayout: Not authenticated, resetting to welcome');
      isRedirectingToWelcome = true;

      // Get root navigator and reset it
      const rootNav = navigation.getParent() || navigation;
      rootNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );

      // Reset flag after navigation settles
      setTimeout(() => {
        isRedirectingToWelcome = false;
      }, 1000);
    }
  }, [isLoading, isAuthenticated, navigation]);

  // Show nothing while redirecting
  if (!isLoading && !isAuthenticated) {
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
          } else if (route.name === 'therapists') {
            iconName = 'people';
          } else if (route.name === 'profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        title: route.name === 'index' ? 'Home' :
               route.name === 'appointments' ? 'Appointments' :
               route.name === 'therapists' ? 'Therapists' :
               route.name === 'profile' ? 'Profile' : route.name,
        href: route.name === 'therapists' && isTherapist ? null : undefined,
      })}
    />
  );
}
