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
import { useAppointment, useAddReview } from '@/hooks/useAppointments';
import { Avatar, Card } from '@/components/ui';

const RATING_LABELS = [
  { value: 1, labelKey: 'appointments.review.rating.terrible' },
  { value: 2, labelKey: 'appointments.review.rating.poor' },
  { value: 3, labelKey: 'appointments.review.rating.okay' },
  { value: 4, labelKey: 'appointments.review.rating.good' },
  { value: 5, labelKey: 'appointments.review.rating.excellent' },
];

const QUICK_FEEDBACK = [
  { id: 'professional', labelKey: 'appointments.review.feedback.professional' },
  { id: 'empathetic', labelKey: 'appointments.review.feedback.empathetic' },
  { id: 'helpful', labelKey: 'appointments.review.feedback.helpful' },
  { id: 'goodListener', labelKey: 'appointments.review.feedback.goodListener' },
  { id: 'knowledgeable', labelKey: 'appointments.review.feedback.knowledgeable' },
  { id: 'punctual', labelKey: 'appointments.review.feedback.punctual' },
];

export default function ReviewAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [rating, setRating] = useState<number>(0);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: appointment, isLoading } = useAppointment(id!);
  const addReview = useAddReview();

  const toggleFeedback = (feedbackId: string) => {
    setSelectedFeedback((prev) =>
      prev.includes(feedbackId)
        ? prev.filter((f) => f !== feedbackId)
        : [...prev, feedbackId]
    );
  };

  const getRatingLabel = () => {
    const ratingItem = RATING_LABELS.find((r) => r.value === rating);
    return ratingItem ? t(ratingItem.labelKey) : '';
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t('common.error'), t('appointments.review.pleaseSelectRating'));
      return;
    }

    // Build feedback string from selected quick feedback and comment
    const feedbackTags = selectedFeedback
      .map((id) => {
        const item = QUICK_FEEDBACK.find((f) => f.id === id);
        return item ? t(item.labelKey) : '';
      })
      .filter(Boolean)
      .join(', ');

    const fullFeedback = [feedbackTags, comment].filter(Boolean).join('\n\n');

    try {
      await addReview.mutateAsync({
        id: id!,
        reviewData: {
          rating,
          feedback: fullFeedback || undefined,
          tags: selectedFeedback,
          isAnonymous,
        },
      });

      Alert.alert(
        t('appointments.review.success'),
        t('appointments.review.successMessage'),
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
        <Text style={styles.headerTitle}>{t('appointments.review.title')}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Therapist Info */}
        <Card variant="elevated" style={styles.card}>
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
              <Text style={styles.sessionDate}>
                {t('appointments.review.sessionOn')}{' '}
                {new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Rating */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.review.howWasSession')}</Text>
          <Text style={styles.sectionSubtitle}>{t('appointments.review.tapToRate')}</Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingLabel}>{getRatingLabel()}</Text>
          )}
        </Card>

        {/* Quick Feedback Tags */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.review.whatDidYouLike')}</Text>
          <Text style={styles.sectionSubtitle}>{t('appointments.review.selectAll')}</Text>

          <View style={styles.feedbackGrid}>
            {QUICK_FEEDBACK.map((feedback) => (
              <TouchableOpacity
                key={feedback.id}
                style={[
                  styles.feedbackTag,
                  selectedFeedback.includes(feedback.id) && styles.feedbackTagSelected,
                ]}
                onPress={() => toggleFeedback(feedback.id)}
              >
                <Ionicons
                  name={selectedFeedback.includes(feedback.id) ? 'checkmark-circle' : 'add-circle-outline'}
                  size={18}
                  color={selectedFeedback.includes(feedback.id) ? '#4F46E5' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.feedbackTagText,
                    selectedFeedback.includes(feedback.id) && styles.feedbackTagTextSelected,
                  ]}
                >
                  {t(feedback.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Written Feedback */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>{t('appointments.review.additionalComments')}</Text>
          <Text style={styles.sectionSubtitle}>{t('appointments.review.optional')}</Text>

          <TextInput
            style={styles.textInput}
            placeholder={t('appointments.review.commentsPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        {/* Anonymous Toggle */}
        <Card variant="elevated" style={styles.card}>
          <TouchableOpacity
            style={styles.anonymousRow}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <View style={styles.anonymousInfo}>
              <Text style={styles.anonymousTitle}>{t('appointments.review.anonymous')}</Text>
              <Text style={styles.anonymousDescription}>
                {t('appointments.review.anonymousDescription')}
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                isAnonymous && styles.toggleActive,
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  isAnonymous && styles.toggleKnobActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
          <Text style={styles.skipButtonText}>{t('appointments.review.skip')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (rating === 0 || addReview.isPending) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || addReview.isPending}
        >
          {addReview.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{t('appointments.review.submit')}</Text>
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
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  therapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sessionDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  feedbackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feedbackTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  feedbackTagSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  feedbackTagText: {
    fontSize: 14,
    color: '#6B7280',
  },
  feedbackTagTextSelected: {
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
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anonymousInfo: {
    flex: 1,
    marginRight: 16,
  },
  anonymousTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  anonymousDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#4F46E5',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
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
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
