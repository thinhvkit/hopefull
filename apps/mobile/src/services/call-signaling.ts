import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { useAuthStore } from '@/store/auth';

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
      console.log('Attempting Firestore write...');

      // Add timeout wrapper
      const writePromise = firestore()
        .collection(CALLS_COLLECTION)
        .doc(callId)
        .set(callData);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore write timed out after 10s')), 10000);
      });

      await Promise.race([writePromise, timeoutPromise]);

      console.log('Call created successfully:', callId);
    } catch (firestoreError: any) {
      console.error('Firestore write error:', firestoreError?.message || firestoreError);
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
            if (change.type === 'added' || change.type === 'modified') {
              const call = { id: change.doc.id, ...change.doc.data() } as CallDocument;
              console.log('Incoming call:', call.id, 'status:', call.status);
              // Filter status client-side
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
