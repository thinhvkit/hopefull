import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTherapists } from '@/hooks';
import { Avatar, Badge, Rating, Card, EmptyState } from '@/components/ui';
import type { Therapist, TherapistFilters } from '@/types';
import { SPECIALIZATIONS } from '@/types';

export default function TherapistsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TherapistFilters>({
    limit: 20,
    isOnline: undefined,
    minRating: undefined,
    maxPrice: undefined,
  });

  const appliedFilters: TherapistFilters = {
    ...filters,
    search: searchQuery || undefined,
    specialization: selectedSpecialization || undefined,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useTherapists(appliedFilters);

  const therapists = data?.pages.flatMap((page) => page.data) ?? [];

  const handleTherapistPress = (therapist: Therapist) => {
    router.push(`/therapist/${therapist.id}`);
  };

  const renderTherapistCard = ({ item }: { item: Therapist }) => (
    <Card
      variant="elevated"
      style={styles.therapistCard}
      onPress={() => handleTherapistPress(item)}
    >
      <View style={styles.cardHeader}>
        <Avatar
          source={item.user.avatarUrl}
          name={`${item.user.firstName} ${item.user.lastName}`}
          size="lg"
          showOnlineStatus
          isOnline={item.isOnline}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.therapistName}>
            {item.user.firstName} {item.user.lastName}
          </Text>
          <Text style={styles.therapistTitle}>{item.professionalTitle}</Text>
          <View style={styles.ratingRow}>
            <Rating value={item.averageRating} size={14} />
            <Text style={styles.reviewCount}>({item.totalReviews})</Text>
          </View>
        </View>
        {item.isOnline && (
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineText}>Online</Text>
          </View>
        )}
      </View>

      <View style={styles.specializations}>
        {item.specializations.slice(0, 3).map((spec, index) => (
          <Badge
            key={index}
            label={spec.specialization.name}
            variant="primary"
            size="sm"
          />
        ))}
        {item.specializations.length > 3 && (
          <Badge
            label={`+${item.specializations.length - 3}`}
            variant="default"
            size="sm"
          />
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.languages}>
          <Ionicons name="globe-outline" size={14} color="#6B7280" />
          <Text style={styles.languagesText}>
            {item.languages.map((l) => l.language).join(', ')}
          </Text>
        </View>
        <View style={styles.pricing}>
          <Text style={styles.price}>${(item.hourlyRate / 100).toFixed(0)}</Text>
          <Text style={styles.priceUnit}>/hour</Text>
        </View>
      </View>
    </Card>
  );

  const renderSpecializationChip = (specialization: string) => (
    <TouchableOpacity
      key={specialization}
      style={[
        styles.chip,
        selectedSpecialization === specialization && styles.chipSelected,
      ]}
      onPress={() =>
        setSelectedSpecialization(
          selectedSpecialization === specialization ? null : specialization
        )
      }
    >
      <Text
        style={[
          styles.chipText,
          selectedSpecialization === specialization && styles.chipTextSelected,
        ]}
      >
        {specialization}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search therapists..."
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

      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons name="options-outline" size={20} color="#4F46E5" />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={SPECIALIZATIONS as unknown as string[]}
        renderItem={({ item }) => renderSpecializationChip(item)}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.chipsContainer}
      />

      {showFilters && (
        <View style={styles.advancedFilters}>
          <TouchableOpacity
            style={[styles.filterOption, filters.isOnline && styles.filterOptionSelected]}
            onPress={() =>
              setFilters((prev) => ({
                ...prev,
                isOnline: prev.isOnline ? undefined : true,
              }))
            }
          >
            <Ionicons
              name="radio-button-on-outline"
              size={16}
              color={filters.isOnline ? '#4F46E5' : '#6B7280'}
            />
            <Text
              style={[
                styles.filterOptionText,
                filters.isOnline && styles.filterOptionTextSelected,
              ]}
            >
              Online Now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterOption,
              filters.minRating === 4 && styles.filterOptionSelected,
            ]}
            onPress={() =>
              setFilters((prev) => ({
                ...prev,
                minRating: prev.minRating === 4 ? undefined : 4,
              }))
            }
          >
            <Ionicons
              name="star"
              size={16}
              color={filters.minRating === 4 ? '#4F46E5' : '#6B7280'}
            />
            <Text
              style={[
                styles.filterOptionText,
                filters.minRating === 4 && styles.filterOptionTextSelected,
              ]}
            >
              4+ Rating
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderFilters()}

      {therapists.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No therapists found"
          description="Try adjusting your filters or search query"
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedSpecialization(null);
            setFilters({ limit: 20 });
          }}
        />
      ) : (
        <FlatList
          data={therapists}
          renderItem={renderTherapistCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#4F46E5',
  },
  chipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  advancedFilters: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  filterOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterOptionTextSelected: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  therapistCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
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
    marginBottom: 2,
  },
  therapistTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  onlineBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  onlineText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  specializations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  languages: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languagesText: {
    fontSize: 13,
    color: '#6B7280',
  },
  pricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  priceUnit: {
    fontSize: 13,
    color: '#6B7280',
  },
  loadingFooter: {
    paddingVertical: 20,
  },
});
