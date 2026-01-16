import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';

export default function TabsLayout() {
  const { user } = useAuthStore();
  const isTherapist = user?.role === 'THERAPIST';

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
