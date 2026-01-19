import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { api } from './api';
import { LoginResponse } from './auth';

// Configure Google Sign-In (call this in app initialization)
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  });
}

export interface SocialAuthResult {
  success: boolean;
  user?: LoginResponse['user'];
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  cancelled?: boolean;
}

/**
 * Sign in with Google
 * Uses Google Sign-In SDK + Firebase Auth
 */
export async function signInWithGoogle(): Promise<SocialAuthResult> {
  try {
    // Check if Google Play Services are available (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in with Google
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult.data?.idToken;

    if (!idToken) {
      return { success: false, error: 'No ID token received from Google' };
    }

    // Create Firebase credential
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase
    const userCredential = await auth().signInWithCredential(googleCredential);

    // Get Firebase ID token
    const firebaseIdToken = await userCredential.user.getIdToken();

    // Send to backend for verification and account creation/linking
    const response = await verifySocialAuth('google', firebaseIdToken);

    return {
      success: true,
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
  } catch (error: any) {
    console.error('Google Sign-In error:', error);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, cancelled: true };
    }

    if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign-in already in progress' };
    }

    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Google Play Services not available' };
    }

    return {
      success: false,
      error: error.message || 'Google Sign-In failed',
    };
  }
}

/**
 * Sign in with Apple
 * Uses Expo Apple Authentication + Firebase Auth
 */
export async function signInWithApple(): Promise<SocialAuthResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: 'Apple Sign-In is only available on iOS' };
  }

  try {
    // Check if Apple Sign-In is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Apple Sign-In is not available on this device' };
    }

    // Generate nonce for security
    const nonce = Math.random().toString(36).substring(2, 10);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce
    );

    // Request Apple Sign-In
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const { identityToken, authorizationCode } = appleCredential;

    if (!identityToken) {
      return { success: false, error: 'No identity token received from Apple' };
    }

    // Create Firebase credential with the raw nonce
    const appleAuthCredential = auth.AppleAuthProvider.credential(
      identityToken,
      nonce
    );

    // Sign in to Firebase
    const userCredential = await auth().signInWithCredential(appleAuthCredential);

    // Get Firebase ID token
    const firebaseIdToken = await userCredential.user.getIdToken();

    // Extract name from Apple credential (only provided on first sign-in)
    const fullName = appleCredential.fullName;
    const firstName = fullName?.givenName || undefined;
    const lastName = fullName?.familyName || undefined;

    // Send to backend for verification and account creation/linking
    const response = await verifySocialAuth('apple', firebaseIdToken, {
      firstName,
      lastName,
    });

    return {
      success: true,
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
  } catch (error: any) {
    console.error('Apple Sign-In error:', error);

    if (error.code === 'ERR_REQUEST_CANCELED') {
      return { success: false, cancelled: true };
    }

    return {
      success: false,
      error: error.message || 'Apple Sign-In failed',
    };
  }
}

/**
 * Verify social auth with backend
 * Backend will create account if new or link if email matches
 */
async function verifySocialAuth(
  provider: 'google' | 'apple',
  idToken: string,
  additionalData?: { firstName?: string; lastName?: string }
): Promise<LoginResponse> {
  const response = await api.post('/auth/social', {
    provider,
    idToken,
    ...additionalData,
  });
  return response.data;
}

/**
 * Sign out from social providers
 */
export async function signOutSocial(): Promise<void> {
  try {
    // Sign out from Firebase
    await auth().signOut();

    // Sign out from Google if signed in
    const isGoogleSignedIn = await GoogleSignin.isSignedIn();
    if (isGoogleSignedIn) {
      await GoogleSignin.signOut();
    }
  } catch (error) {
    console.error('Social sign-out error:', error);
  }
}

/**
 * Check if Apple Sign-In is available
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export const socialAuthService = {
  configureGoogleSignIn,
  signInWithGoogle,
  signInWithApple,
  signOutSocial,
  isAppleSignInAvailable,
};
