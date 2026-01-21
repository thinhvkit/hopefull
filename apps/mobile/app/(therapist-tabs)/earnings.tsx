import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useTherapistEarnings, useTherapistStats } from '@/hooks/useTherapistDashboard';

type PeriodType = 'week' | 'month' | 'year';

export default function TherapistEarningsScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodType>('month');
  const [refreshing, setRefreshing] = useState(false);

  const { data: earnings, refetch: refetchEarnings } = useTherapistEarnings(period);
  const { data: stats, refetch: refetchStats } = useTherapistStats();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEarnings(), refetchStats()]);
    setRefreshing(false);
  }, [refetchEarnings, refetchStats]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(newPeriod);
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
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
          <Text style={styles.headerTitle}>{t('therapistDashboard.earnings')}</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as PeriodType[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.activePeriodButton]}
              onPress={() => handlePeriodChange(p)}
            >
              <Text style={[styles.periodButtonText, period === p && styles.activePeriodButtonText]}>
                {t(`therapistDashboard.${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Earnings Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{t('therapistDashboard.totalEarnings')}</Text>
          <Text style={styles.totalAmount}>{formatCurrency(earnings?.total ?? 0)}</Text>
          <View style={styles.sessionsInfo}>
            <Ionicons name="videocam-outline" size={16} color="#6B7280" />
            <Text style={styles.sessionsText}>
              {earnings?.sessions ?? 0} {t('therapistDashboard.sessions')}
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(stats?.totalEarnings ?? 0)}</Text>
            <Text style={styles.statLabel}>{t('therapistDashboard.allTimeEarnings')}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.statValue}>{stats?.totalSessions ?? 0}</Text>
            <Text style={styles.statLabel}>{t('therapistDashboard.totalSessions')}</Text>
          </View>
        </View>

        {/* Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('therapistDashboard.breakdown')}</Text>
          {earnings?.breakdown && earnings.breakdown.length > 0 ? (
            earnings.breakdown.map((item, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <Text style={styles.breakdownDate}>{item.date}</Text>
                  <Text style={styles.breakdownSessions}>
                    {item.sessions} {t('therapistDashboard.sessions')}
                  </Text>
                </View>
                <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                {t('therapistDashboard.noEarningsYet')}
              </Text>
            </View>
          )}
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePeriodButton: {
    backgroundColor: '#4F46E5',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activePeriodButtonText: {
    color: '#fff',
  },
  totalCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  sessionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sessionsText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownLeft: {},
  breakdownDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  breakdownSessions: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
});
