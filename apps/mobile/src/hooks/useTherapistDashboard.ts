import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import therapistDashboardService, { TherapistProfile } from '@/services/therapist-dashboard';
import type { TherapistStats, TherapistAppointmentFilters, Appointment } from '@/types';

// Query keys
export const therapistKeys = {
  all: ['therapist'] as const,
  profile: () => [...therapistKeys.all, 'profile'] as const,
  stats: () => [...therapistKeys.all, 'stats'] as const,
  appointments: (filters?: TherapistAppointmentFilters) => [...therapistKeys.all, 'appointments', filters] as const,
  upcomingAppointments: (limit?: number) => [...therapistKeys.all, 'upcoming', limit] as const,
  earnings: (period?: string) => [...therapistKeys.all, 'earnings', period] as const,
};

// Get therapist profile
export function useTherapistProfile() {
  return useQuery({
    queryKey: therapistKeys.profile(),
    queryFn: () => therapistDashboardService.getMyProfile(),
  });
}

// Get dashboard stats
export function useTherapistStats() {
  return useQuery({
    queryKey: therapistKeys.stats(),
    queryFn: () => therapistDashboardService.getStats(),
    refetchInterval: 60000, // Refetch every minute
  });
}

// Get therapist appointments with filters
export function useTherapistAppointments(filters: TherapistAppointmentFilters = {}) {
  return useQuery({
    queryKey: therapistKeys.appointments(filters),
    queryFn: () => therapistDashboardService.getAppointments(filters),
  });
}

// Get upcoming appointments
export function useUpcomingAppointments(limit = 3) {
  return useQuery({
    queryKey: therapistKeys.upcomingAppointments(limit),
    queryFn: () => therapistDashboardService.getUpcomingAppointments(limit),
  });
}

// Get earnings
export function useTherapistEarnings(period: 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: therapistKeys.earnings(period),
    queryFn: () => therapistDashboardService.getEarnings(period),
  });
}

// Update online status mutation
export function useUpdateOnlineStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isOnline: boolean) => therapistDashboardService.updateOnlineStatus(isOnline),
    onMutate: async (isOnline) => {
      // Optimistically update the profile
      await queryClient.cancelQueries({ queryKey: therapistKeys.profile() });
      const previousProfile = queryClient.getQueryData<TherapistProfile>(therapistKeys.profile());

      if (previousProfile) {
        queryClient.setQueryData<TherapistProfile>(therapistKeys.profile(), {
          ...previousProfile,
          isOnline,
        });
      }

      return { previousProfile };
    },
    onError: (_err, _isOnline, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(therapistKeys.profile(), context.previousProfile);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: therapistKeys.profile() });
    },
  });
}

// Update auto-offline settings mutation
export function useUpdateAutoOffline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: { enabled: boolean; startTime?: string; endTime?: string }) =>
      therapistDashboardService.updateAutoOffline(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: therapistKeys.profile() });
    },
  });
}

// Accept appointment mutation
export function useAcceptAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => therapistDashboardService.acceptAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: therapistKeys.appointments() });
      queryClient.invalidateQueries({ queryKey: therapistKeys.upcomingAppointments() });
      queryClient.invalidateQueries({ queryKey: therapistKeys.stats() });
    },
  });
}

// Decline appointment mutation
export function useDeclineAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason?: string }) =>
      therapistDashboardService.declineAppointment(appointmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: therapistKeys.appointments() });
      queryClient.invalidateQueries({ queryKey: therapistKeys.stats() });
    },
  });
}

// Cancel appointment mutation
export function useCancelTherapistAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason: string }) =>
      therapistDashboardService.cancelAppointment(appointmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: therapistKeys.appointments() });
      queryClient.invalidateQueries({ queryKey: therapistKeys.upcomingAppointments() });
      queryClient.invalidateQueries({ queryKey: therapistKeys.stats() });
    },
  });
}

// Add session notes mutation
export function useAddSessionNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, notes }: { appointmentId: string; notes: string }) =>
      therapistDashboardService.addSessionNotes(appointmentId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: therapistKeys.appointments() });
    },
  });
}
