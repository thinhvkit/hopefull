import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { callSignalingService, CallDocument } from '@/services/call-signaling';

/**
 * Hook to listen for incoming calls and navigate to incoming call screen
 * Should be used in the therapist dashboard layout
 */
export function useIncomingCalls() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  const handleIncomingCall = useCallback((call: CallDocument) => {
    // Prevent showing the same call multiple times
    if (currentCallIdRef.current === call.id) {
      return;
    }

    currentCallIdRef.current = call.id;
    console.log('Incoming call received:', call);

    // Navigate to incoming call screen with call details
    router.push({
      pathname: '/incoming-call',
      params: {
        callId: call.id,
        callerId: call.callerId,
        callerName: call.callerName,
        callerAvatar: call.callerAvatar || '',
        channelName: call.channelName,
      },
    });
  }, [router]);

  // Keep a stable ref to the latest callback so the subscription never needs to re-run
  // just because the router reference changed.
  const handleIncomingCallRef = useRef(handleIncomingCall);
  useEffect(() => {
    handleIncomingCallRef.current = handleIncomingCall;
  }, [handleIncomingCall]);

  useEffect(() => {
    // Only subscribe if user is authenticated and is a therapist
    if (!isAuthenticated || !user || user.role !== 'THERAPIST') {
      return;
    }

    console.log('Subscribing to incoming calls for user:', user.id);

    // Subscribe to incoming calls — use a stable wrapper so the Firestore
    // listener is not torn down and re-created every time the router changes.
    unsubscribeRef.current = callSignalingService.subscribeToIncomingCalls(
      user.id,
      (call) => handleIncomingCallRef.current(call)
    );

    return () => {
      console.log('Unsubscribing from incoming calls');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Don't reset currentCallIdRef here — resetting it causes re-subscription
      // snapshots to re-trigger navigation for the same call.
    };
  }, [isAuthenticated, user?.id, user?.role]);

  // Return function to manually unsubscribe if needed
  return {
    unsubscribe: () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    },
  };
}
