import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@/store/auth';
import {
  useTherapistProfile,
  useUpdateOnlineStatus,
  useUpdateAutoOffline,
} from '@/hooks/useTherapistDashboard';
import { Avatar } from '@/components/ui';

export default function TherapistProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, refetch } = useTherapistProfile();
  const updateOnlineStatus = useUpdateOnlineStatus();
  const updateAutoOffline = useUpdateAutoOffline();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleToggleOnline = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateOnlineStatus.mutateAsync(value);
    } catch (error) {
      Alert.alert(t('common.error'), t('therapistDashboard.statusUpdateFailed'));
    }
  };

  const handleToggleAutoOffline = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateAutoOffline.mutateAsync({
        enabled: value,
        startTime: '22:00',
        endTime: '08:00',
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('therapistDashboard.autoOfflineUpdateFailed'));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout.title'),
      t('profile.logout.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout.confirm'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logout();
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'edit-profile',
      icon: 'person-outline' as const,
      label: t('profile.menu.personalInfo'),
      onPress: () => router.push('/profile/edit'),
    },
    {
      id: 'availability',
      icon: 'calendar-outline' as const,
      label: t('therapistDashboard.availability'),
      onPress: () => Alert.alert('Coming Soon', 'Availability settings coming soon'),
    },
    {
      id: 'security',
      icon: 'shield-outline' as const,
      label: t('profile.menu.security'),
      onPress: () => router.push('/profile/security'),
    },
    {
      id: 'notifications',
      icon: 'notifications-outline' as const,
      label: t('profile.menu.notifications'),
      onPress: () => Alert.alert('Coming Soon', 'Notification settings coming soon'),
    },
    {
      id: 'language',
      icon: 'language-outline' as const,
      label: t('profile.menu.language'),
      onPress: () => router.push('/profile/language'),
    },
    {
      id: 'help',
      icon: 'help-circle-outline' as const,
      label: t('profile.menu.help'),
      onPress: () => Alert.alert('Coming Soon', 'Help center coming soon'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Avatar
            source={user?.avatarUrl}
            name={`${user?.firstName || ''} ${user?.lastName || ''}`}
            size="xl"
          />
          <Text style={styles.profileName}>
            Dr. {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {profile?.averageRating?.toFixed(1) ?? '0.0'} ({profile?.totalReviews ?? 0}{' '}
              {t('therapistDashboard.reviews')})
            </Text>
          </View>
        </View>

        {/* Online Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('therapistDashboard.statusSettings')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: profile?.isOnline ? '#10B981' : '#6B7280' },
                ]}
              />
              <View>
                <Text style={styles.settingLabel}>
                  {profile?.isOnline
                    ? t('therapistDashboard.online')
                    : t('therapistDashboard.offline')}
                </Text>
                <Text style={styles.settingDescription}>
                  {profile?.isOnline
                    ? t('therapistDashboard.onlineDescription')
                    : t('therapistDashboard.offlineDescription')}
                </Text>
              </View>
            </View>
            <Switch
              value={profile?.isOnline ?? false}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={profile?.isOnline ? '#4F46E5' : '#9CA3AF'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={24} color="#6B7280" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingLabel}>{t('therapistDashboard.autoOffline')}</Text>
                <Text style={styles.settingDescription}>
                  {t('therapistDashboard.autoOfflineDescription')}
                </Text>
              </View>
            </View>
            <Switch
              value={profile?.autoOfflineEnabled ?? false}
              onValueChange={handleToggleAutoOffline}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={profile?.autoOfflineEnabled ? '#4F46E5' : '#9CA3AF'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('therapistDashboard.settings')}</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={24} color="#374151" />
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>{t('profile.menu.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '500',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    marginRight: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
});
