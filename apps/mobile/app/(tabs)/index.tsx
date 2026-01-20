import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth';
import { useTherapists, useAppointments } from '@/hooks';
import { Avatar, Rating, Card, Badge } from '@/components/ui';
import { formatDateTime, formatCurrencyFromCents } from '@/utils/formatting';
import type { Therapist, Appointment } from '@/types';

const categoryConfig = [
  { id: '1', nameKey: 'therapists.specializations.anxiety', icon: 'sad-outline' },
  { id: '2', nameKey: 'therapists.specializations.depression', icon: 'cloud-outline' },
  { id: '3', nameKey: 'therapists.specializations.relationships', icon: 'heart-outline' },
  { id: '4', nameKey: 'therapists.specializations.trauma', icon: 'shield-outline' },
  { id: '5', nameKey: 'therapists.specializations.addiction', icon: 'warning-outline' },
  { id: '6', nameKey: 'therapists.specializations.familyTherapy', icon: 'people-outline' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isTherapist = user?.role === 'THERAPIST';

  const { data: therapistsData, isLoading: therapistsLoading, refetch: refetchTherapists } = useTherapists({ limit: 5, isOnline: true });
  const { data: appointments, isLoading: appointmentsLoading, refetch: refetchAppointments } = useAppointments({ status: 'upcoming' });

  const featuredTherapists = therapistsData?.pages[0]?.data || [];
  const upcomingAppointments = appointments?.slice(0, 3) || [];

  const handleRefresh = () => {
    refetchTherapists();
    refetchAppointments();
  };

  if (isTherapist) {
    return <TherapistDashboard />;
  }

  const renderTherapistCard = (therapist: Therapist) => (
    <TouchableOpacity
      key={therapist.id}
      style={styles.therapistCard}
      onPress={() => router.push(`/therapist/${therapist.id}`)}
    >
      <Avatar
        source={therapist.user.avatarUrl}
        name={`${therapist.user.firstName} ${therapist.user.lastName}`}
        size="lg"
        showOnlineStatus
        isOnline={therapist.isOnline}
      />
      <Text style={styles.therapistName} numberOfLines={1}>
        {therapist.user.firstName} {therapist.user.lastName}
      </Text>
      <View style={styles.therapistRating}>
        <Ionicons name="star" size={12} color="#FBBF24" />
        <Text style={styles.ratingText}>{therapist.averageRating.toFixed(1)}</Text>
      </View>
      <Text style={styles.therapistPrice}>
        {formatCurrencyFromCents(therapist.hourlyRate)}/hr
      </Text>
    </TouchableOpacity>
  );

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card
      key={appointment.id}
      variant="outlined"
      style={styles.appointmentCard}
      onPress={() => router.push(`/appointment/${appointment.id}`)}
    >
      <View style={styles.appointmentRow}>
        <Avatar
          source={appointment.therapist?.user.avatarUrl}
          name={`${appointment.therapist?.user.firstName}`}
          size="sm"
        />
        <View style={styles.appointmentInfo}>
          <Text style={styles.appointmentTherapist}>
            {appointment.therapist?.user.firstName} {appointment.therapist?.user.lastName}
          </Text>
          <Text style={styles.appointmentTime}>
            {formatDateTime(appointment.scheduledAt)}
          </Text>
        </View>
        <Badge
          label={appointment.status === 'CONFIRMED' ? t('appointments.status.confirmed') : t('appointments.status.pending')}
          variant={appointment.status === 'CONFIRMED' ? 'success' : 'warning'}
          size="sm"
        />
      </View>
    </Card>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={therapistsLoading || appointmentsLoading}
          onRefresh={handleRefresh}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {user?.firstName ? t('home.greeting', { name: user.firstName }) : t('home.greetingDefault')}
          </Text>
          <Text style={styles.subtitle}>{t('home.welcomeBack')}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push('/(tabs)/therapists')}
      >
        <Ionicons name="search" size={20} color="#6B7280" />
        <Text style={styles.searchPlaceholder}>{t('therapists.searchPlaceholder')}</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('therapists.filters.specialization')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categoryConfig.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryChip}
              onPress={() => router.push({
                pathname: '/(tabs)/therapists',
                params: { specialization: t(category.nameKey) }
              })}
            >
              <Ionicons name={category.icon as any} size={20} color="#4F46E5" />
              <Text style={styles.categoryText}>{t(category.nameKey)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.talkNowCard}
        onPress={() => router.push('/instant-call')}
      >
        <View style={styles.talkNowContent}>
          <Text style={styles.talkNowTitle}>Need to talk now?</Text>
          <Text style={styles.talkNowSubtitle}>
            Connect instantly with an available therapist
          </Text>
        </View>
        <View style={styles.talkNowButton}>
          <Ionicons name="videocam" size={24} color="#4F46E5" />
          <Text style={styles.talkNowButtonText}>Talk Now</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('common.online')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/therapists')}>
            <Text style={styles.seeAllText}>{t('home.viewAll')}</Text>
          </TouchableOpacity>
        </View>
        {therapistsLoading ? (
          <ActivityIndicator size="small" color="#4F46E5" />
        ) : featuredTherapists.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredTherapists.map(renderTherapistCard)}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>{t('therapists.noResults')}</Text>
        )}
      </View>

      <View style={[styles.section, { marginBottom: 100 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.upcomingAppointments')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
            <Text style={styles.seeAllText}>{t('home.viewAll')}</Text>
          </TouchableOpacity>
        </View>
        {appointmentsLoading ? (
          <ActivityIndicator size="small" color="#4F46E5" />
        ) : upcomingAppointments.length > 0 ? (
          <View style={styles.appointmentsList}>
            {upcomingAppointments.map(renderAppointmentCard)}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('home.noUpcoming')}</Text>
        )}
      </View>
    </ScrollView>
  );
}

function TherapistDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {t('home.greeting', { name: `Dr. ${user?.lastName}` })}
          </Text>
          <Text style={styles.subtitle}>{t('home.welcomeBack')}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.onlineToggle}>
        <Text style={styles.onlineLabel}>{t('common.online')}</Text>
        <TouchableOpacity style={styles.toggleButton}>
          <View style={[styles.toggleDot, styles.toggleDotActive]} />
          <Text style={styles.toggleText}>{t('common.online')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>{t('dates.today')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>$450</Text>
          <Text style={styles.statLabel}>{t('dates.thisWeek')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>{t('appointments.status.pending')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>4.9</Text>
          <Text style={styles.statLabel}>{t('therapists.filters.rating')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.upcomingAppointments')}</Text>
        <Text style={styles.comingSoon}>{t('home.noUpcoming')}</Text>
      </View>
    </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  talkNowCard: {
    backgroundColor: '#4F46E5',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
  },
  talkNowContent: {
    marginBottom: 16,
  },
  talkNowTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  talkNowSubtitle: {
    fontSize: 14,
    color: '#C7D2FE',
  },
  talkNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  talkNowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  comingSoon: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  onlineToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  onlineLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
  },
  toggleDotActive: {
    backgroundColor: '#22C55E',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  therapistCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  therapistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  therapistRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  therapistPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 4,
  },
  appointmentCard: {
    marginBottom: 8,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTherapist: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  appointmentTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  appointmentsList: {
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
