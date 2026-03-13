import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { useAuthStore } from '@/store/auth';

// Disable offline persistence to avoid queue issues
firestore().settings({
  persistence: false,
});

export type CallStatus = 'pending' | 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed' | 'cancelled';

export interface ParticipantMediaState {
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export interface CallDocument {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerRole: 'USER' | 'THERAPIST' | 'ADMIN';
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  receiverRole: 'USER' | 'THERAPIST' | 'ADMIN';
  therapistId: string;
  channelName: string;
  status: CallStatus;
  type: 'instant' | 'scheduled';
  appointmentId?: string;
  createdAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  // Media state for each participant
  callerMedia?: ParticipantMediaState;
  receiverMedia?: ParticipantMediaState;
}

export interface CreateCallParams {
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  therapistId: string;
  appointmentId?: string;
  type?: 'instant' | 'scheduled';
}

const CALLS_COLLECTION = 'calls';

class CallSignalingService {
  private currentCallId: string | null = null;
  private callListener: (() => void) | null = null;

  /**
   * Test Firestore connectivity - call this to diagnose issues
   */
  async testFirestoreConnection(): Promise<boolean> {
    try {
      console.log('[Firestore Test] Starting connectivity test...');

      // Try a simple read first
      const testRead = await firestore()
        .collection(CALLS_COLLECTION)
        .limit(1)
        .get();
      console.log('[Firestore Test] Read test passed, docs:', testRead.size);

      // Try a simple write
      const testDocId = `test-${Date.now()}`;
      await firestore()
        .collection(CALLS_COLLECTION)
        .doc(testDocId)
        .set({ test: true, timestamp: firestore.FieldValue.serverTimestamp() });
      console.log('[Firestore Test] Write test passed');

      // Clean up test doc
      await firestore()
        .collection(CALLS_COLLECTION)
        .doc(testDocId)
        .delete();
      console.log('[Firestore Test] Delete test passed');

      console.log('[Firestore Test] All tests passed!');
      return true;
    } catch (error: any) {
      console.error('[Firestore Test] FAILED');
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      return false;
    }
  }

  /**
   * Create a new call request
   */
  async createCall(params: CreateCallParams): Promise<string> {
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate shorter IDs for Agora channel name (max 64 chars)
    const timestamp = Date.now().toString(36); // Base36 for shorter timestamp
    const shortUserId = user.id.slice(-8); // Last 8 chars of user ID
    const shortTherapistId = params.therapistId.slice(-8); // Last 8 chars of therapist ID

    const callId = `call-${shortUserId}-${shortTherapistId}-${timestamp}`;
    const channelName = `ch-${shortUserId}-${shortTherapistId}-${timestamp}`; // Shorter prefix

    const callerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

    // Build call data, excluding undefined values (Firestore doesn't accept undefined)
    const callData: Record<string, any> = {
      callerId: user.id,
      callerName,
      callerRole: user.role,
      receiverId: params.receiverId,
      receiverName: params.receiverName,
      receiverRole: user.role === 'USER' ? 'THERAPIST' : 'USER',
      therapistId: params.therapistId,
      channelName,
      status: 'pending',
      type: params.type || 'instant',
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    // Only add optional fields if they have values
    if (user.avatarUrl) {
      callData.callerAvatar = user.avatarUrl;
    }
    if (params.receiverAvatar) {
      callData.receiverAvatar = params.receiverAvatar;
    }
    if (params.appointmentId) {
      callData.appointmentId = params.appointmentId;
    }

    console.log('Creating call with data:', JSON.stringify(callData, null, 2));

    try {
      console.log('Attempting Firestore write to collection:', CALLS_COLLECTION, 'doc:', callId);

      // Direct write without timeout - to see actual error
      await firestore()
        .collection(CALLS_COLLECTION)
        .doc(callId)
        .set(callData);

      console.log('Call created successfully:', callId);
    } catch (firestoreError: any) {
      // Log full error details for debugging
      console.error('=== FIRESTORE ERROR DETAILS ===');
      console.error('Error code:', firestoreError?.code);
      console.error('Error message:', firestoreError?.message);
      console.error('Error name:', firestoreError?.name);
      console.error('Full error:', JSON.stringify(firestoreError, Object.getOwnPropertyNames(firestoreError), 2));
      console.error('===============================');
      throw firestoreError;
    }

    this.currentCallId = callId;
    return callId;
  }

  /**
   * Update call status to ringing (when call is being shown to receiver)
   */
  async updateCallRinging(callId: string): Promise<void> {
    await firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .update({
        status: 'ringing',
      });
  }

  /**
   * Accept a call
   */
  async acceptCall(callId: string): Promise<CallDocument> {
    const callRef = firestore().collection(CALLS_COLLECTION).doc(callId);

    await callRef.update({
      status: 'accepted',
      answeredAt: firestore.FieldValue.serverTimestamp(),
    });

    const callDoc = await callRef.get();
    return { id: callDoc.id, ...callDoc.data() } as CallDocument;
  }

  /**
   * Decline a call
   */
  async declineCall(callId: string): Promise<void> {
    await firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .update({
        status: 'declined',
        endedAt: firestore.FieldValue.serverTimestamp(),
      });
  }

  /**
   * Cancel an outgoing call
   */
  async cancelCall(callId: string): Promise<void> {
    await firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .update({
        status: 'cancelled',
        endedAt: firestore.FieldValue.serverTimestamp(),
      });
    this.currentCallId = null;
  }

  /**
   * End an ongoing call
   */
  async endCall(callId: string): Promise<void> {
    await firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .update({
        status: 'ended',
        endedAt: firestore.FieldValue.serverTimestamp(),
      });
    this.currentCallId = null;
  }

  /**
   * Update media state (camera/mic) for a participant
   */
  async updateMediaState(
    callId: string,
    mediaState: ParticipantMediaState
  ): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Get call to determine if user is caller or receiver
    const callDoc = await firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .get();

    if (!callDoc.exists) return;

    const call = callDoc.data();
    const isCaller = call?.callerId === user.id;

    await firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .update({
        [isCaller ? 'callerMedia' : 'receiverMedia']: mediaState,
      });
  }

  /**
   * Mark call as missed (no answer)
   */
  async markCallMissed(callId: string): Promise<void> {
    await firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .update({
        status: 'missed',
        endedAt: firestore.FieldValue.serverTimestamp(),
      });
    this.currentCallId = null;
  }

  /**
   * Get call by ID
   */
  async getCall(callId: string): Promise<CallDocument | null> {
    const callDoc = await firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .get();

    if (!callDoc.exists) {
      return null;
    }

    return { id: callDoc.id, ...callDoc.data() } as CallDocument;
  }

  /**
   * Listen for call status changes (for caller)
   */
  subscribeToCall(
    callId: string,
    onStatusChange: (call: CallDocument) => void
  ): () => void {
    const unsubscribe = firestore()
      .collection(CALLS_COLLECTION)
      .doc(callId)
      .onSnapshot((doc: FirebaseFirestoreTypes.DocumentSnapshot) => {
        if (doc.exists) {
          const call = { id: doc.id, ...doc.data() } as CallDocument;
          onStatusChange(call);
        }
      });

    return unsubscribe;
  }

  /**
   * Listen for incoming calls (for receiver/therapist)
   */
  subscribeToIncomingCalls(
    userId: string,
    onIncomingCall: (call: CallDocument) => void
  ): () => void {
    console.log('Setting up incoming calls listener for userId:', userId);

    // Test Firestore connection first
    firestore()
      .collection(CALLS_COLLECTION)
      .limit(1)
      .get()
      .then((snapshot) => {
        console.log('Firestore test query successful, docs:', snapshot.size);
      })
      .catch((error) => {
        console.error('Firestore test query failed:', error);
      });

    // Use simple query without compound index requirement
    // Filter status client-side to avoid needing composite index
    const unsubscribe = firestore()
      .collection(CALLS_COLLECTION)
      .where('receiverId', '==', userId)
      .onSnapshot(
        (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
          console.log('Incoming calls snapshot received, docs:', snapshot.docs.length);
          snapshot.docChanges().forEach((change: FirebaseFirestoreTypes.DocumentChange) => {
            console.log('Doc change:', change.type, change.doc.id);
            // Only handle 'added' — new calls arrive as pending.
            // 'modified' events (pending→ringing, ringing→accepted, etc.) are status
            // updates on existing calls and must not re-trigger navigation.
            if (change.type === 'added') {
              const call = { id: change.doc.id, ...change.doc.data() } as CallDocument;
              console.log('Incoming call:', call.id, 'status:', call.status);
              if (call.status === 'pending' || call.status === 'ringing') {
                onIncomingCall(call);
              }
            }
          });
        },
        (error) => {
          console.error('Firestore subscription error:', error);
        }
      );

    this.callListener = unsubscribe;
    return unsubscribe;
  }

  /**
   * Stop listening for incoming calls
   */
  unsubscribeFromIncomingCalls(): void {
    if (this.callListener) {
      this.callListener();
      this.callListener = null;
    }
  }

  /**
   * Get current call ID
   */
  getCurrentCallId(): string | null {
    return this.currentCallId;
  }

  /**
   * Set current call ID
   */
  setCurrentCallId(callId: string | null): void {
    this.currentCallId = callId;
  }
}

export const callSignalingService = new CallSignalingService();
