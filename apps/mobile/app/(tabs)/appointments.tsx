import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppointments } from '@/hooks';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui';
import type { Appointment } from '@/types';

type TabType = 'upcoming' | 'past';
type ViewMode = 'list' | 'calendar';

const STATUS_CONFIG: Record<
  string,
  { labelKey: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info'; color: string }
> = {
  PENDING: { labelKey: 'appointments.status.pending', variant: 'warning', color: '#F59E0B' },
  CONFIRMED: { labelKey: 'appointments.status.confirmed', variant: 'success', color: '#10B981' },
  IN_PROGRESS: { labelKey: 'appointments.status.inProgress', variant: 'info', color: '#3B82F6' },
  COMPLETED: { labelKey: 'appointments.status.completed', variant: 'default', color: '#6B7280' },
  CANCELLED: { labelKey: 'appointments.status.cancelled', variant: 'error', color: '#EF4444' },
  NO_SHOW: { labelKey: 'appointments.status.noShow', variant: 'error', color: '#EF4444' },
};

export default function AppointmentsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const { data: appointments, isLoading, refetch, isRefetching } = useAppointments({
    status: activeTab,
  });

  // Filter appointments based on search query
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];

    let filtered = appointments;

    // Filter by search query (therapist name or date)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((apt) => {
        const therapistName = `${apt.therapist?.user.firstName} ${apt.therapist?.user.lastName}`.toLowerCase();
        const dateStr = new Date(apt.scheduledAt).toLocaleDateString().toLowerCase();
        return therapistName.includes(query) || dateStr.includes(query);
      });
    }

    // Filter by selected date in calendar view
    if (viewMode === 'calendar' && selectedDate) {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.scheduledAt);
        return (
          aptDate.getDate() === selectedDate.getDate() &&
          aptDate.getMonth() === selectedDate.getMonth() &&
          aptDate.getFullYear() === selectedDate.getFullYear()
        );
      });
    }

    return filtered;
  }, [appointments, searchQuery, viewMode, selectedDate]);

  // Get appointments for calendar dots
  const appointmentDates = useMemo(() => {
    if (!appointments) return new Map<string, Appointment[]>();

    const dateMap = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const dateKey = new Date(apt.scheduledAt).toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(apt);
    });
    return dateMap;
  }, [appointments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const appointmentDate = new Date(dateString);
    const diff = appointmentDate.getTime() - now.getTime();

    if (diff < 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    router.push(`/appointment/${appointment.id}`);
  };

  const handleJoinSession = (appointment: Appointment) => {
    // TODO: Implement video session screen at /session/[id]
    // For now, navigate to appointment details
    router.push(`/appointment/${appointment.id}`);
  };

  const handleCancelPress = (appointment: Appointment) => {
    router.push(`/appointment/${appointment.id}/cancel`);
  };

  const handleBookAgain = (appointment: Appointment) => {
    if (appointment.therapist) {
      router.push(`/book/${appointment.therapist.id}`);
    }
  };

  // Calendar rendering
  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const days = [];
    // Add empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toDateString();
      const dayAppointments = appointmentDates.get(dateKey) || [];
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate?.toDateString() === dateKey;

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.calendarDayToday,
            isSelected && styles.calendarDaySelected,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text
            style={[
              styles.calendarDayText,
              isToday && styles.calendarDayTextToday,
              isSelected && styles.calendarDayTextSelected,
            ]}
          >
            {day}
          </Text>
          {dayAppointments.length > 0 && (
            <View style={styles.appointmentDots}>
              {dayAppointments.slice(0, 3).map((apt, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.appointmentDot,
                    { backgroundColor: STATUS_CONFIG[apt.status]?.color || '#6B7280' },
                  ]}
                />
              ))}
              {dayAppointments.length > 3 && (
                <Text style={styles.moreDotsText}>+{dayAppointments.length - 3}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => setCalendarMonth(new Date(year, month - 1, 1))}
            style={styles.calendarNavButton}
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            onPress={() => setCalendarMonth(new Date(year, month + 1, 1))}
            style={styles.calendarNavButton}
          >
            <Ionicons name="chevron-forward" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarWeekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.calendarWeekdayText}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>{days}</View>

        {selectedDate && (
          <View style={styles.selectedDateHeader}>
            <Text style={styles.selectedDateText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Text style={styles.clearDateText}>{t('common.all')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const timeUntil = getTimeUntil(item.scheduledAt);
    const canJoin =
      (item.status === 'CONFIRMED' || item.status === 'IN_PROGRESS') &&
      new Date(item.scheduledAt).getTime() - Date.now() < 15 * 60 * 1000;

    const isPast = activeTab === 'past';
    const canCancel = !isPast && (item.status === 'PENDING' || item.status === 'CONFIRMED');

    return (
      <Card
        variant="elevated"
        style={styles.appointmentCard}
        onPress={() => handleAppointmentPress(item)}
      >
        <View style={styles.cardHeader}>
          <Avatar
            source={item.therapist?.user.avatarUrl}
            name={`${item.therapist?.user.firstName} ${item.therapist?.user.lastName}`}
            size="md"
          />
          <View style={styles.cardInfo}>
            <Text style={styles.therapistName}>
              {item.therapist?.user.firstName} {item.therapist?.user.lastName}
            </Text>
            <Text style={styles.therapistTitle}>
              {item.therapist?.professionalTitle}
            </Text>
          </View>
          <Badge label={t(statusConfig.labelKey)} variant={statusConfig.variant} size="sm" />
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{formatDate(item.scheduledAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {formatTime(item.scheduledAt)} ({item.duration} min)
            </Text>
          </View>
          {item.type === 'INSTANT' && (
            <View style={styles.detailRow}>
              <Ionicons name="flash-outline" size={16} color="#F59E0B" />
              <Text style={[styles.detailText, { color: '#F59E0B' }]}>
                {t('appointments.instantCall')}
              </Text>
            </View>
          )}
          {isPast && item.review && (
            <View style={styles.detailRow}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.detailText}>
                {t('appointments.ratedWith', { rating: item.review.rating })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          {!isPast && timeUntil && (
            <View style={styles.countdown}>
              <Ionicons name="hourglass-outline" size={14} color="#4F46E5" />
              <Text style={styles.countdownText}>
                {t('appointments.startsIn', { time: timeUntil })}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {canJoin && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleJoinSession(item)}
              >
                <Ionicons name="videocam" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{t('appointments.join')}</Text>
              </TouchableOpacity>
            )}

            {canCancel && !canJoin && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonOutline]}
                onPress={() => handleCancelPress(item)}
              >
                <Text style={styles.actionButtonOutlineText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            )}

            {isPast && item.status === 'COMPLETED' && !item.review && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonOutline]}
                onPress={() => router.push(`/appointment/${item.id}/review`)}
              >
                <Ionicons name="star-outline" size={16} color="#4F46E5" />
                <Text style={styles.actionButtonOutlineText}>{t('appointments.leaveFeedback')}</Text>
              </TouchableOpacity>
            )}

            {isPast && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleBookAgain(item)}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{t('appointments.bookAgain')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      icon={activeTab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
      title={t(activeTab === 'upcoming' ? 'appointments.empty.upcoming' : 'appointments.empty.past')}
      description={t(
        activeTab === 'upcoming'
          ? 'appointments.empty.bookFirst'
          : 'appointments.empty.pastDescription'
      )}
      actionLabel={activeTab === 'upcoming' ? t('therapists.title') : undefined}
      onAction={activeTab === 'upcoming' ? () => router.push('/(tabs)/therapists') : undefined}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('appointments.title')}</Text>
        <TouchableOpacity
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
        >
          <Ionicons
            name={viewMode === 'list' ? 'calendar' : 'list'}
            size={24}
            color="#4F46E5"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('appointments.searchPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            {t('appointments.tabs.upcoming')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            {t('appointments.tabs.past')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar View (if enabled) */}
      {viewMode === 'calendar' && renderCalendar()}

      {/* Appointment List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={renderEmptyState}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  // Calendar Styles
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  calendarDayToday: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#374151',
  },
  calendarDayTextToday: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  appointmentDots: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  appointmentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moreDotsText: {
    fontSize: 8,
    color: '#6B7280',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  clearDateText: {
    fontSize: 14,
    color: '#4F46E5',
  },
  // List Styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  appointmentCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  therapistTitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  appointmentDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  cardFooter: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  countdownText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  actionButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
