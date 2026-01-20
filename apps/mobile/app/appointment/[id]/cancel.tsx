import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppointment, useCancelAppointment } from '@/hooks/useAppointments';
import { Avatar, Card } from '@/components/ui';
import { formatCurrencyFromCents } from '@/utils/formatting';

const CANCELLATION_REASONS = [
  { id: 'schedule_conflict', labelKey: 'appointments.cancel.reasons.scheduleConflict' },
  { id: 'found_another', labelKey: 'appointments.cancel.reasons.foundAnother' },
  { id: 'personal_reasons', labelKey: 'appointments.cancel.reasons.personalReasons' },
  { id: 'feeling_better', labelKey: 'appointments.cancel.reasons.feelingBetter' },
  { id: 'financial', labelKey: 'appointments.cancel.reasons.financial' },
  { id: 'other', labelKey: 'appointments.cancel.reasons.other' },
];

export default function CancelAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: appointment, isLoading } = useAppointment(id!);
  const cancelAppointment = useCancelAppointment();

  // Calculate refund based on cancellation policy
  const getRefundInfo = () => {
    if (!appointment) return { percent: 0, amount: 0, policy: '' };

    const now = new Date();
    const appointmentDate = new Date(appointment.scheduledAt);
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil > 24) {
      return {
        percent: 100,
        amount: appointment.amount,
        policy: t('appointments.cancel.policy.fullRefund'),
      };
    } else if (hoursUntil > 2) {
      return {
        percent: 50,
        amount: Math.floor(appointment.amount / 2),
        policy: t('appointments.cancel.policy.halfRefund'),
      };
    } else {
      return {
        percent: 0,
        amount: 0,
        policy: t('appointments.cancel.policy.noRefund'),
      };
    }
  };

  const refundInfo = getRefundInfo();

  const handleCancel = async () => {
    if (!selectedReason) {
      Alert.alert(t('common.error'), t('appointments.cancel.pleaseSelectReason'));
      return;
    }

    const reasonText = CANCELLATION_REASONS.find((r) => r.id === selectedReason);
    const fullReason = additionalInfo
      ? `${t(reasonText?.labelKey || '')}: ${additionalInfo}`
      : t(reasonText?.labelKey || '');

    try {
      await cancelAppointment.mutateAsync({
        id: id!,
        reason: fullReason,
      });

      Alert.alert(
        t('appointments.cancel.success'),
        t('appointments.cancel.successMessage', {
          refundAmount: formatCurrencyFromCents(refundInfo.amount),
        }),
        [
          {
            text: t('common.ok'),
            onPress: () => router.replace('/(tabs)/appointments'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('errors.general'));
    }
  };

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appointments.cancel.title')}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={24} color="#DC2626" />
          <Text style={styles.warningText}>{t('appointments.cancel.warning')}</Text>
        </View>

        {/* Appointment Summary */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.appointmentRow}>
            <Avatar
              source={appointment.therapist?.user.avatarUrl}
              name={`${appointment.therapist?.user.firstName} ${appointment.therapist?.user.lastName}`}
              size="md"
            />
            <View style={styles.appointmentInfo}>
              <Text style={styles.therapistName}>
                {appointment.therapist?.user.firstName} {appointment.therapist?.user.lastName}
              </Text>
              <Text style={styles.appointmentTime}>
                {new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Cancellation Policy */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.cancel.policyTitle')}</Text>

          <View style={styles.policyItem}>
            <View style={[styles.policyDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.policyText}>{t('appointments.cancel.policyMore24')}</Text>
          </View>

          <View style={styles.policyItem}>
            <View style={[styles.policyDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.policyText}>{t('appointments.cancel.policyLess24')}</Text>
          </View>

          <View style={styles.policyItem}>
            <View style={[styles.policyDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.policyText}>{t('appointments.cancel.policyLess2')}</Text>
          </View>

          {/* Refund Preview */}
          <View style={styles.refundPreview}>
            <View style={styles.refundRow}>
              <Text style={styles.refundLabel}>{t('appointments.cancel.yourRefund')}</Text>
              <Text style={[styles.refundPercent, { color: refundInfo.percent === 100 ? '#10B981' : refundInfo.percent === 50 ? '#F59E0B' : '#EF4444' }]}>
                {refundInfo.percent}%
              </Text>
            </View>
            <Text style={styles.refundAmount}>
              {formatCurrencyFromCents(refundInfo.amount)} {t('appointments.cancel.willBeRefunded')}
            </Text>
            <Text style={styles.refundPolicy}>{refundInfo.policy}</Text>
          </View>
        </Card>

        {/* Cancellation Reason */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.cancel.reasonTitle')}</Text>

          {CANCELLATION_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonItem,
                selectedReason === reason.id && styles.reasonItemSelected,
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedReason === reason.id && styles.radioOuterSelected,
                ]}
              >
                {selectedReason === reason.id && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[
                  styles.reasonText,
                  selectedReason === reason.id && styles.reasonTextSelected,
                ]}
              >
                {t(reason.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Additional Information */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.cancel.additionalInfo')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('appointments.cancel.additionalInfoPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={additionalInfo}
            onChangeText={setAdditionalInfo}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.keepButton} onPress={() => router.back()}>
          <Text style={styles.keepButtonText}>{t('appointments.cancel.keepAppointment')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.cancelButton,
            (!selectedReason || cancelAppointment.isPending) && styles.cancelButtonDisabled,
          ]}
          onPress={handleCancel}
          disabled={!selectedReason || cancelAppointment.isPending}
        >
          {cancelAppointment.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.cancelButtonText}>{t('appointments.cancel.confirmCancel')}</Text>
          )}
        </TouchableOpacity>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  policyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  policyText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  refundPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refundLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  refundPercent: {
    fontSize: 18,
    fontWeight: '700',
  },
  refundAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  refundPolicy: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  reasonItemSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#4F46E5',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bottomSpacer: {
    height: 140,
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
    gap: 12,
  },
  keepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  keepButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
  },
  cancelButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
