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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';

import { useAuthStore } from '@/store/auth';
import {
  useTherapistProfile,
  useTherapistStats,
  useUpcomingAppointments,
  useUpdateOnlineStatus,
} from '@/hooks/useTherapistDashboard';
import { Avatar } from '@/components/ui';
import type { Appointment } from '@/types';

export default function TherapistDashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const { data: profile, refetch: refetchProfile } = useTherapistProfile();
  const { data: stats, refetch: refetchStats } = useTherapistStats();
  const { data: upcomingAppointments, refetch: refetchAppointments } = useUpcomingAppointments(3);

  // Mutations
  const updateOnlineStatus = useUpdateOnlineStatus();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchStats(), refetchAppointments()]);
    setRefreshing(false);
  }, [refetchProfile, refetchStats, refetchAppointments]);

  const handleToggleOnline = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateOnlineStatus.mutateAsync(value);
    } catch (error) {
      Alert.alert(t('common.error'), t('therapistDashboard.statusUpdateFailed'));
    }
  };

  const handleStartCall = (appointment: Appointment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/session/${appointment.id}`);
  };

  const handleViewAppointment = (appointment: Appointment) => {
    router.push(`/appointment/${appointment.id}`);
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatAppointmentTime = (date: string) => {
    return format(parseISO(date), 'MMM d, h:mm a');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('therapistDashboard.goodMorning');
    if (hour < 18) return t('therapistDashboard.goodAfternoon');
    return t('therapistDashboard.goodEvening');
  };

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>
              {user?.firstName ? `Dr. ${user.firstName}` : t('therapistDashboard.doctor')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            {/* Notification badge */}
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Online/Offline Toggle */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: profile?.isOnline ? '#10B981' : '#6B7280' },
                ]}
              />
              <Text style={styles.statusText}>
                {profile?.isOnline
                  ? t('therapistDashboard.online')
                  : t('therapistDashboard.offline')}
              </Text>
            </View>
            <Switch
              value={profile?.isOnline ?? false}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={profile?.isOnline ? '#4F46E5' : '#9CA3AF'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>
          <Text style={styles.statusDescription}>
            {profile?.isOnline
              ? t('therapistDashboard.onlineDescription')
              : t('therapistDashboard.offlineDescription')}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Ionicons name="calendar-outline" size={24} color="#4F46E5" />
            <Text style={styles.statValue}>{stats?.todayAppointments ?? 0}</Text>
            <Text style={styles.statLabel}>{t('therapistDashboard.todayAppointments')}</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={24} color="#10B981" />
            <Text style={styles.statValue}>{formatCurrency(stats?.weekEarnings ?? 0)}</Text>
            <Text style={styles.statLabel}>{t('therapistDashboard.weekEarnings')}</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{stats?.pendingRequests ?? 0}</Text>
            <Text style={styles.statLabel}>{t('therapistDashboard.pendingRequests')}</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={24} color="#EF4444" />
            <Text style={styles.statValue}>{stats?.averageRating?.toFixed(1) ?? '0.0'}</Text>
            <Text style={styles.statLabel}>{t('therapistDashboard.averageRating')}</Text>
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('therapistDashboard.upcomingAppointments')}</Text>
            <TouchableOpacity onPress={() => router.push('/(therapist-tabs)/appointments')}>
              <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
            </TouchableOpacity>
          </View>

          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => handleViewAppointment(appointment)}
                activeOpacity={0.7}
              >
                <View style={styles.appointmentLeft}>
                  <Avatar
                    source={appointment.user?.avatarUrl}
                    name={`${appointment.user?.firstName || ''} ${appointment.user?.lastName || ''}`}
                    size="md"
                  />
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.clientName}>
                      {appointment.user?.firstName} {appointment.user?.lastName}
                    </Text>
                    <Text style={styles.appointmentTime}>
                      {formatAppointmentTime(appointment.scheduledAt)}
                    </Text>
                    <View style={styles.appointmentMeta}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>
                          {appointment.type === 'INSTANT'
                            ? t('therapistDashboard.instant')
                            : t('therapistDashboard.scheduled')}
                        </Text>
                      </View>
                      <Text style={styles.duration}>{appointment.duration} min</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.startCallButton}
                  onPress={() => handleStartCall(appointment)}
                >
                  <Ionicons name="videocam" size={20} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                {t('therapistDashboard.noUpcomingAppointments')}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('therapistDashboard.quickActions')}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/(therapist-tabs)/appointments')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="calendar" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.quickActionText}>{t('therapistDashboard.viewCalendar')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/(therapist-tabs)/earnings')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="wallet" size={24} color="#10B981" />
              </View>
              <Text style={styles.quickActionText}>{t('therapistDashboard.viewEarnings')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/(therapist-tabs)/profile')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="settings" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.quickActionText}>{t('therapistDashboard.settings')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statusCard: {
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statCardPrimary: {},
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  appointmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appointmentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  typeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  duration: {
    fontSize: 12,
    color: '#6B7280',
  },
  startCallButton: {
    backgroundColor: '#4F46E5',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
});
