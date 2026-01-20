import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppointment } from '@/hooks/useAppointments';
import { Avatar, Badge, Card } from '@/components/ui';
import { formatCurrencyFromCents, formatDate, formatTime } from '@/utils/formatting';

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

export default function AppointmentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const { data: appointment, isLoading } = useAppointment(id!);

  const canJoin =
    appointment &&
    (appointment.status === 'CONFIRMED' || appointment.status === 'IN_PROGRESS') &&
    new Date(appointment.scheduledAt).getTime() - Date.now() < 15 * 60 * 1000;

  const canCancel =
    appointment &&
    (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED');

  const canReschedule = canCancel;

  const canLeaveReview =
    appointment &&
    appointment.status === 'COMPLETED' &&
    !appointment.review;

  const isPast =
    appointment && new Date(appointment.scheduledAt).getTime() < Date.now();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('errors.notFound')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[appointment.status];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appointments.details.title')}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusConfig.color + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {t(statusConfig.labelKey)}
          </Text>
        </View>

        {/* Therapist Card */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.details.therapist')}</Text>
          <View style={styles.therapistRow}>
            <Avatar
              source={appointment.therapist?.user.avatarUrl}
              name={`${appointment.therapist?.user.firstName} ${appointment.therapist?.user.lastName}`}
              size="lg"
            />
            <View style={styles.therapistInfo}>
              <Text style={styles.therapistName}>
                {appointment.therapist?.user.firstName} {appointment.therapist?.user.lastName}
              </Text>
              <Text style={styles.therapistTitle}>
                {appointment.therapist?.professionalTitle}
              </Text>
              {appointment.therapist?.averageRating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {appointment.therapist.averageRating.toFixed(1)} ({appointment.therapist.totalReviews} reviews)
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => router.push(`/therapist/${appointment.therapist?.id}`)}
          >
            <Text style={styles.viewProfileText}>{t('appointments.details.viewProfile')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
          </TouchableOpacity>
        </Card>

        {/* Appointment Details */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.details.sessionDetails')}</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('appointments.details.date')}</Text>
              <Text style={styles.detailValue}>
                {new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('appointments.details.time')}</Text>
              <Text style={styles.detailValue}>
                {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="hourglass-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('appointments.details.duration')}</Text>
              <Text style={styles.detailValue}>{appointment.duration} minutes</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name={appointment.type === 'INSTANT' ? 'flash-outline' : 'videocam-outline'} size={20} color="#6B7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('appointments.details.type')}</Text>
              <Text style={styles.detailValue}>
                {appointment.type === 'INSTANT' ? t('appointments.instantCall') : t('appointments.scheduledCall')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Booking Notes */}
        {appointment.bookingNotes && (
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.sectionTitle}>{t('appointments.details.bookingNotes')}</Text>
            <Text style={styles.notesText}>{appointment.bookingNotes}</Text>
          </Card>
        )}

        {/* Session Notes (from therapist) */}
        {appointment.sessionNotes && (
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.sectionTitle}>{t('appointments.details.sessionNotes')}</Text>
            <Text style={styles.notesText}>{appointment.sessionNotes}</Text>
          </Card>
        )}

        {/* Invoice Section */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.details.invoice')}</Text>

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>{t('appointments.details.sessionFee')}</Text>
            <Text style={styles.invoiceValue}>{formatCurrencyFromCents(appointment.amount)}</Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>{t('appointments.details.platformFee')}</Text>
            <Text style={styles.invoiceValue}>{formatCurrencyFromCents(0)}</Text>
          </View>

          <View style={styles.invoiceDivider} />

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceTotalLabel}>{t('appointments.details.total')}</Text>
            <Text style={styles.invoiceTotalValue}>{formatCurrencyFromCents(appointment.amount)}</Text>
          </View>

          <TouchableOpacity style={styles.downloadButton}>
            <Ionicons name="download-outline" size={18} color="#4F46E5" />
            <Text style={styles.downloadText}>{t('appointments.details.downloadReceipt')}</Text>
          </TouchableOpacity>
        </Card>

        {/* Feedback Section */}
        {appointment.review && (
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.sectionTitle}>{t('appointments.details.yourFeedback')}</Text>
            <View style={styles.feedbackStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= appointment.review!.rating ? 'star' : 'star-outline'}
                  size={24}
                  color="#F59E0B"
                />
              ))}
            </View>
            {appointment.review.feedback && (
              <Text style={styles.feedbackText}>{appointment.review.feedback}</Text>
            )}
            {appointment.review.tags && appointment.review.tags.length > 0 && (
              <View style={styles.feedbackTags}>
                {appointment.review.tags.map((tag, index) => (
                  <View key={index} style={styles.feedbackTag}>
                    <Text style={styles.feedbackTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Cancellation Info */}
        {appointment.status === 'CANCELLED' && appointment.cancellationReason && (
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.sectionTitle}>{t('appointments.details.cancellationReason')}</Text>
            <Text style={styles.notesText}>{appointment.cancellationReason}</Text>
          </Card>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        {canJoin && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/session/${appointment.id}`)}
          >
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{t('appointments.join')}</Text>
          </TouchableOpacity>
        )}

        {canLeaveReview && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/appointment/${appointment.id}/review`)}
          >
            <Ionicons name="star-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{t('appointments.leaveFeedback')}</Text>
          </TouchableOpacity>
        )}

        {!canJoin && !canLeaveReview && isPast && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/book/${appointment.therapist?.id}`)}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{t('appointments.bookAgain')}</Text>
          </TouchableOpacity>
        )}

        {(canCancel || canReschedule) && (
          <View style={styles.secondaryButtons}>
            {canReschedule && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => Alert.alert(t('common.comingSoon'), t('appointments.rescheduleComingSoon'))}
              >
                <Text style={styles.secondaryButtonText}>{t('appointments.reschedule')}</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.secondaryButton, styles.dangerButton]}
                onPress={() => router.push(`/appointment/${appointment.id}/cancel`)}
              >
                <Text style={styles.dangerButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  therapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  therapistTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 4,
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  invoiceValue: {
    fontSize: 14,
    color: '#111827',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  invoiceTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  downloadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  feedbackStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  feedbackTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  feedbackTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  feedbackTagText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 120,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dangerButton: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});
