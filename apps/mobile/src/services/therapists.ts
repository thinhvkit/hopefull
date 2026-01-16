import api from './api';
import type {
  Therapist,
  TherapistFilters,
  TherapistAvailability,
  Review,
  PaginatedResponse,
} from '../types';

export const therapistsService = {
  async findAll(filters: TherapistFilters = {}): Promise<PaginatedResponse<Therapist>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.specialization) params.append('specialization', filters.specialization);
    if (filters.language) params.append('language', filters.language);
    if (filters.minRating) params.append('minRating', String(filters.minRating));
    if (filters.maxPrice) params.append('maxPrice', String(filters.maxPrice));
    if (filters.isOnline !== undefined) params.append('isOnline', String(filters.isOnline));

    const { data } = await api.get(`/therapists?${params.toString()}`);
    return data;
  },

  async findById(id: string): Promise<Therapist> {
    const { data } = await api.get(`/therapists/${id}`);
    return data;
  },

  async getAvailability(id: string, date: string): Promise<TherapistAvailability> {
    const { data } = await api.get(`/therapists/${id}/availability?date=${date}`);
    return data;
  },

  async getReviews(
    id: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Review>> {
    const { data } = await api.get(`/therapists/${id}/reviews?page=${page}&limit=${limit}`);
    return data;
  },
};
