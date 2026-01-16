import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppointments } from '@/hooks';
import { Avatar, Badge, Card, EmptyState, Button } from '@/components/ui';
import type { Appointment } from '@/types';

type TabType = 'upcoming' | 'past';

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info' }
> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'success' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
  NO_SHOW: { label: 'No Show', variant: 'error' },
};

export default function AppointmentsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const { data: appointments, isLoading, refetch, isRefetching } = useAppointments({
    status: activeTab,
  });

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
      return `${days} day${days > 1 ? 's' : ''} away`;
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
    router.push(`/session/${appointment.id}`);
  };

  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const timeUntil = getTimeUntil(item.scheduledAt);
    const canJoin =
      item.status === 'CONFIRMED' &&
      new Date(item.scheduledAt).getTime() - Date.now() < 15 * 60 * 1000; // 15 min before

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
          <Badge label={statusConfig.label} variant={statusConfig.variant} size="sm" />
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
                Instant Call
              </Text>
            </View>
          )}
        </View>

        {activeTab === 'upcoming' && (
          <View style={styles.cardFooter}>
            {timeUntil && (
              <View style={styles.countdown}>
                <Ionicons name="hourglass-outline" size={14} color="#4F46E5" />
                <Text style={styles.countdownText}>Starts in {timeUntil}</Text>
              </View>
            )}
            <View style={styles.actions}>
              {canJoin && (
                <Button
                  title="Join"
                  onPress={() => handleJoinSession(item)}
                  size="sm"
                  icon={<Ionicons name="videocam" size={16} color="#FFFFFF" />}
                />
              )}
            </View>
          </View>
        )}

        {activeTab === 'past' && item.status === 'COMPLETED' && !item.review && (
          <View style={styles.cardFooter}>
            <Button
              title="Leave Feedback"
              onPress={() => router.push(`/appointment/${item.id}/review`)}
              variant="outline"
              size="sm"
              fullWidth
            />
          </View>
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      icon={activeTab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
      title={
        activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'
      }
      description={
        activeTab === 'upcoming'
          ? 'Book a session with a therapist to get started'
          : "Your completed sessions will appear here"
      }
      actionLabel={activeTab === 'upcoming' ? 'Find Therapists' : undefined}
      onAction={
        activeTab === 'upcoming' ? () => router.push('/(tabs)/therapists') : undefined
      }
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={renderEmptyState}
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
