import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

import {
  useTherapistAppointments,
  useCancelTherapistAppointment,
} from '@/hooks/useTherapistDashboard';
import { Avatar } from '@/components/ui';
import type { Appointment, TherapistAppointmentFilters } from '@/types';

type TabType = 'upcoming' | 'past' | 'cancelled';

export default function TherapistAppointmentsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Build filters based on active tab and search
  const filters: TherapistAppointmentFilters = useMemo(() => ({
    status: activeTab,
    search: searchQuery || undefined,
    limit: 20,
  }), [activeTab, searchQuery]);

  // Query
  const { data, refetch, isLoading, isFetching } = useTherapistAppointments(filters);
  const appointments = data?.data || [];

  // Mutations
  const cancelAppointment = useCancelTherapistAppointment();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleStartCall = (appointment: Appointment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/session/${appointment.id}`);
  };

  const handleViewDetails = (appointment: Appointment) => {
    router.push(`/appointment/${appointment.id}`);
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    Alert.alert(
      t('therapistDashboard.cancelAppointment'),
      t('therapistDashboard.cancelAppointmentConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment.mutateAsync({
                appointmentId: appointment.id,
                reason: 'Cancelled by therapist',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert(t('common.error'), t('therapistDashboard.cancelFailed'));
            }
          },
        },
      ]
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const formatAppointmentDate = (date: string) => {
    const parsed = parseISO(date);
    if (isToday(parsed)) return t('dates.today');
    if (isTomorrow(parsed)) return t('dates.tomorrow');
    return format(parsed, 'EEE, MMM d');
  };

  const formatAppointmentTime = (date: string) => {
    return format(parseISO(date), 'h:mm a');
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const canStartCall = (appointment: Appointment) => {
    if (appointment.status !== 'CONFIRMED') return false;
    const scheduledTime = parseISO(appointment.scheduledAt);
    const now = new Date();
    // Can start call 5 minutes before scheduled time
    const timeDiff = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);
    return timeDiff <= 5 && timeDiff >= -appointment.duration;
  };

  const renderAppointmentCard = ({ item: appointment }: { item: Appointment }) => {
    const showStartCall = activeTab === 'upcoming' && canStartCall(appointment);
    const showCancel = activeTab === 'upcoming' && appointment.status !== 'CANCELLED';

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => handleViewDetails(appointment)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.clientInfo}>
            <Avatar
              source={appointment.user?.avatarUrl}
              name={`${appointment.user?.firstName || ''} ${appointment.user?.lastName || ''}`}
              size="md"
            />
            <View style={styles.clientDetails}>
              <Text style={styles.clientName}>
                {appointment.user?.firstName} {appointment.user?.lastName}
              </Text>
              <View style={styles.appointmentTypeRow}>
                <View
                  style={[
                    styles.typeBadge,
                    appointment.type === 'INSTANT' && styles.instantBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      appointment.type === 'INSTANT' && styles.instantText,
                    ]}
                  >
                    {appointment.type === 'INSTANT'
                      ? t('therapistDashboard.instant')
                      : t('therapistDashboard.scheduled')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.appointmentMeta}>
            <Text style={styles.dateText}>{formatAppointmentDate(appointment.scheduledAt)}</Text>
            <Text style={styles.timeText}>{formatAppointmentTime(appointment.scheduledAt)}</Text>
            <Text style={styles.durationText}>{appointment.duration} min</Text>
          </View>
        </View>

        {activeTab === 'past' && (
          <View style={styles.cardFooter}>
            <View style={styles.earningsInfo}>
              <Ionicons name="cash-outline" size={16} color="#10B981" />
              <Text style={styles.earningsText}>{formatCurrency(appointment.amount)}</Text>
            </View>
            {appointment.review && (
              <View style={styles.ratingInfo}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{appointment.review.rating}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardActions}>
          {showStartCall && (
            <TouchableOpacity
              style={styles.startCallButton}
              onPress={() => handleStartCall(appointment)}
            >
              <Ionicons name="videocam" size={18} color="#fff" />
              <Text style={styles.startCallText}>{t('therapistDashboard.startCall')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleViewDetails(appointment)}
          >
            <Text style={styles.detailsButtonText}>{t('therapistDashboard.viewDetails')}</Text>
          </TouchableOpacity>

          {showCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelAppointment(appointment)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'past' && appointment.review && (
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleViewDetails(appointment)}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#4F46E5" />
              <Text style={styles.feedbackButtonText}>{t('therapistDashboard.viewFeedback')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={activeTab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
        size={64}
        color="#D1D5DB"
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'upcoming'
          ? t('therapistDashboard.noUpcomingAppointments')
          : activeTab === 'past'
          ? t('therapistDashboard.noPastAppointments')
          : t('therapistDashboard.noCancelledAppointments')}
      </Text>
      {searchQuery && (
        <Text style={styles.emptyStateSubtitle}>
          {t('therapistDashboard.noSearchResults')}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('therapistDashboard.appointments')}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('therapistDashboard.searchPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => handleTabChange('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            {t('therapistDashboard.upcoming')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => handleTabChange('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            {t('therapistDashboard.past')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.activeTab]}
          onPress={() => handleTabChange('cancelled')}
        >
          <Text style={[styles.tabText, activeTab === 'cancelled' && styles.activeTabText]}>
            {t('therapistDashboard.cancelled')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Appointments List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clientInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  clientDetails: {
    marginLeft: 12,
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  appointmentTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instantBadge: {
    backgroundColor: '#FEF3C7',
  },
  typeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  instantText: {
    color: '#D97706',
  },
  appointmentMeta: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  durationText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  earningsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  startCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startCallText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  detailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  feedbackButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
