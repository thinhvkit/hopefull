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

// Email link authentication settings
const actionCodeSettings: FirebaseAuthTypes.ActionCodeSettings = {
  url: 'https://hopefull.page.link/verify', // Dynamic link domain
  handleCodeInApp: true,
  iOS: {
    bundleId: 'com.hopefull.app',
  },
  android: {
    packageName: 'com.hopefull.app',
    installApp: true,
    minimumVersion: '21',
  },
};

// Send email sign-in link
export async function sendSignInLinkToEmail(email: string): Promise<void> {
  return auth().sendSignInLinkToEmail(email, actionCodeSettings);
}

// Check if link is a sign-in link
export function isSignInWithEmailLink(link: string): boolean {
  return auth().isSignInWithEmailLink(link);
}

// Complete sign-in with email link
export async function signInWithEmailLink(
  email: string,
  link: string
): Promise<FirebaseAuthTypes.UserCredential> {
  return auth().signInWithEmailLink(email, link);
}

// Send email verification to current user
export async function sendEmailVerification(): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('No user signed in');
  return user.sendEmailVerification();
}

// Check if email is verified
export function isEmailVerified(): boolean {
  const user = auth().currentUser;
  return user?.emailVerified ?? false;
}

// Reload user to get updated verification status
export async function reloadUser(): Promise<void> {
  const user = auth().currentUser;
  if (user) {
    await user.reload();
  }
}
