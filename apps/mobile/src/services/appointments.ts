import api from './api';
import type { Appointment, AppointmentFilters, Review } from '../types';

export interface CreateAppointmentData {
  therapistId: string;
  scheduledAt: string;
  duration: number;
  timezone: string;
  amount: number;
  bookingNotes?: string;
}

export interface CreateReviewData {
  rating: number;
  feedback?: string;
  tags?: string[];
  isAnonymous?: boolean;
}

export const appointmentsService = {
  async create(data: CreateAppointmentData): Promise<Appointment> {
    const response = await api.post('/appointments', data);
    return response.data;
  },

  async findByUser(filters?: AppointmentFilters): Promise<Appointment[]> {
    const params = filters?.status ? `?status=${filters.status}` : '';
    const { data } = await api.get(`/appointments${params}`);
    return data;
  },

  async findById(id: string): Promise<Appointment> {
    const { data } = await api.get(`/appointments/${id}`);
    return data;
  },

  async confirm(id: string): Promise<Appointment> {
    const { data } = await api.patch(`/appointments/${id}/confirm`);
    return data;
  },

  async cancel(id: string, reason: string): Promise<Appointment> {
    const { data } = await api.patch(`/appointments/${id}/cancel`, { reason });
    return data;
  },

  async complete(id: string, sessionNotes?: string): Promise<Appointment> {
    const { data } = await api.patch(`/appointments/${id}/complete`, { sessionNotes });
    return data;
  },

  async addReview(id: string, reviewData: CreateReviewData): Promise<Review> {
    const { data } = await api.post(`/appointments/${id}/review`, reviewData);
    return data;
  },
};
