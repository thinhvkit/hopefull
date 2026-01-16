import firebase from '@react-native-firebase/app';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Check if Firebase is properly initialized
export const isFirebaseConfigured = firebase.apps.length > 0;

// Export Firebase Auth instance
export const firebaseAuth = auth();

// Get Firebase Auth module (for OTP screen)
export function getFirebaseAuth() {
  return auth;
}

// Export types for convenience
export type FirebaseAuth = typeof auth;
export type AuthConfirmationResult = FirebaseAuthTypes.ConfirmationResult;
export type PhoneAuthProvider = typeof FirebaseAuthTypes.PhoneAuthProvider;

// Helper to sign in with phone number
export async function signInWithPhoneNumber(
  phoneNumber: string
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  return auth().signInWithPhoneNumber(phoneNumber);
}

// Helper to verify phone with credential
export async function verifyPhoneCredential(
  verificationId: string,
  code: string
): Promise<FirebaseAuthTypes.UserCredential> {
  const credential = auth.PhoneAuthProvider.credential(verificationId, code);
  return auth().signInWithCredential(credential);
}

// Get current user's ID token for backend verification
export async function getIdToken(): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// Sign out from Firebase
export async function signOutFirebase(): Promise<void> {
  return auth().signOut();
}
