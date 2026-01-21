import api from './api';
import type {
  Therapist,
  Appointment,
  TherapistStats,
  TherapistAppointmentFilters,
  PaginatedResponse
} from '@/types';

export interface TherapistProfile extends Therapist {
  autoOfflineEnabled: boolean;
  autoOfflineStart?: string;
  autoOfflineEnd?: string;
}

export const therapistDashboardService = {
  // Get therapist's own profile
  async getMyProfile(): Promise<TherapistProfile> {
    const response = await api.get<TherapistProfile>('/therapists/me');
    return response.data;
  },

  // Update online status
  async updateOnlineStatus(isOnline: boolean): Promise<TherapistProfile> {
    const response = await api.patch<TherapistProfile>('/therapists/me/status', { isOnline });
    return response.data;
  },

  // Update auto-offline settings
  async updateAutoOffline(settings: { enabled: boolean; startTime?: string; endTime?: string }): Promise<TherapistProfile> {
    const response = await api.patch<TherapistProfile>('/therapists/me/auto-offline', settings);
    return response.data;
  },

  // Get dashboard stats
  async getStats(): Promise<TherapistStats> {
    const response = await api.get<TherapistStats>('/therapists/me/stats');
    return response.data;
  },

  // Get therapist's appointments
  async getAppointments(filters: TherapistAppointmentFilters = {}): Promise<PaginatedResponse<Appointment>> {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<PaginatedResponse<Appointment>>(
      `/therapists/me/appointments?${params.toString()}`
    );
    return response.data;
  },

  // Get upcoming appointments (next 7 days)
  async getUpcomingAppointments(limit = 10): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>(`/therapists/me/appointments/upcoming?limit=${limit}`);
    return response.data;
  },

  // Accept appointment request
  async acceptAppointment(appointmentId: string): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/therapists/me/appointments/${appointmentId}/accept`);
    return response.data;
  },

  // Decline appointment request
  async declineAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/therapists/me/appointments/${appointmentId}/decline`, { reason });
    return response.data;
  },

  // Cancel appointment
  async cancelAppointment(appointmentId: string, reason: string): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/therapists/me/appointments/${appointmentId}/cancel`, { reason });
    return response.data;
  },

  // Add session notes
  async addSessionNotes(appointmentId: string, notes: string): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/therapists/me/appointments/${appointmentId}/notes`, { sessionNotes: notes });
    return response.data;
  },

  // Get earnings summary
  async getEarnings(period: 'week' | 'month' | 'year' = 'month'): Promise<{
    total: number;
    sessions: number;
    breakdown: Array<{ date: string; amount: number; sessions: number }>;
  }> {
    const response = await api.get(`/therapists/me/earnings?period=${period}`);
    return response.data;
  },
};

export default therapistDashboardService;
