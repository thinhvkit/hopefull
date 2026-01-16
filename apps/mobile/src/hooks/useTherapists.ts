import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { therapistsService } from '../services';
import type { TherapistFilters } from '../types';

export function useTherapists(filters: TherapistFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['therapists', filters],
    queryFn: ({ pageParam = 1 }) =>
      therapistsService.findAll({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useTherapist(id: string) {
  return useQuery({
    queryKey: ['therapist', id],
    queryFn: () => therapistsService.findById(id),
    enabled: !!id,
  });
}

export function useTherapistAvailability(id: string, date: string) {
  return useQuery({
    queryKey: ['therapist-availability', id, date],
    queryFn: () => therapistsService.getAvailability(id, date),
    enabled: !!id && !!date,
  });
}

export function useTherapistReviews(id: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['therapist-reviews', id, page, limit],
    queryFn: () => therapistsService.getReviews(id, page, limit),
    enabled: !!id,
  });
}
