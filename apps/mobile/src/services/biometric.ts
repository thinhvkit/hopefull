import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Check if running on emulator (Android)
const isEmulator = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  // Emulators typically don't support face recognition properly
  return true; // Assume emulator for safety, fingerprint works on emulators
};

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricCredentials {
  email: string;
  password: string;
}

export interface BiometricStatus {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: BiometricType;
  biometricName: string;
}

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return false;

  // Check if any supported authentication type is available
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return types.length > 0;
}

/**
 * Get the type of biometric authentication available
 */
export async function getBiometricType(): Promise<BiometricType> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return 'none';

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return 'none';

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  // On Android emulator, face recognition might be reported but not actually work
  // Prioritize fingerprint as it's more commonly supported
  if (Platform.OS === 'android') {
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
  } else {
    // On iOS, Face ID takes priority
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
  }

  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }

  return 'none';
}

/**
 * Get human-readable name for biometric type
 */
export function getBiometricName(type: BiometricType): string {
  if (Platform.OS === 'ios') {
    switch (type) {
      case 'facial':
        return 'Face ID';
      case 'fingerprint':
        return 'Touch ID';
      default:
        return 'Biometric';
    }
  } else {
    switch (type) {
      case 'facial':
        return 'Face Unlock';
      case 'fingerprint':
        return 'Fingerprint';
      case 'iris':
        return 'Iris Scanner';
      default:
        return 'Biometric';
    }
  }
}

/**
 * Get detailed biometric hardware info
 */
export async function getBiometricHardwareInfo(): Promise<{
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  return {
    hasHardware,
    isEnrolled,
    supportedTypes,
  };
}

/**
 * Get complete biometric status
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  const hardwareInfo = await getBiometricHardwareInfo();
  const isEnabled = await isBiometricEnabled();
  const biometricType = await getBiometricType();
  const biometricName = getBiometricName(biometricType);

  // Only available if hardware exists, biometric is enrolled, and type is detected
  const isAvailable = hardwareInfo.hasHardware &&
                      hardwareInfo.isEnrolled &&
                      biometricType !== 'none';

  if (__DEV__) {
    console.log('Biometric Status:', {
      hasHardware: hardwareInfo.hasHardware,
      isEnrolled: hardwareInfo.isEnrolled,
      supportedTypes: hardwareInfo.supportedTypes,
      biometricType,
      biometricName,
      isAvailable,
      isEnabled,
    });
  }

  return {
    isAvailable,
    isEnabled,
    biometricType,
    biometricName,
  };
}

/**
 * Check if biometric login is enabled for this device
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable biometric authentication and store credentials
 */
export async function enableBiometric(credentials: BiometricCredentials): Promise<boolean> {
  try {
    if (__DEV__) {
      console.log('enableBiometric called with:', {
        email: credentials.email,
        passwordLength: credentials.password?.length ?? 0,
      });
    }

    // Verify biometric first
    const result = await authenticate('Enable biometric login');
    if (!result.success) {
      if (__DEV__) {
        console.log('Biometric verification failed during enable');
      }
      return false;
    }

    // Store credentials securely
    await SecureStore.setItemAsync(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify(credentials),
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );

    if (__DEV__) {
      // Verify storage worked
      const stored = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      console.log('Credentials stored successfully:', stored ? 'yes' : 'no');
    }

    // Mark biometric as enabled
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

    return true;
  } catch (error) {
    console.error('Error enabling biometric:', error);
    return false;
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometric(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
  } catch (error) {
    console.error('Error disabling biometric:', error);
  }
}

/**
 * Authenticate using biometric
 */
export async function authenticate(
  promptMessage?: string
): Promise<LocalAuthentication.LocalAuthenticationResult> {
  const biometricType = await getBiometricType();
  const biometricName = getBiometricName(biometricType);

  return LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage || `Login with ${biometricName}`,
    cancelLabel: 'Use Password',
    disableDeviceFallback: false, // Allow PIN/Pattern fallback
    fallbackLabel: 'Use Password',
  });
}

/**
 * Get stored credentials after biometric authentication
 */
export async function getCredentialsWithBiometric(): Promise<BiometricCredentials | null> {
  try {
    // Authenticate first
    const result = await authenticate();
    if (__DEV__) {
      console.log('Biometric auth result:', result);
    }
    if (!result.success) {
      if (__DEV__) {
        console.log('Biometric auth failed or cancelled');
      }
      return null;
    }

    // Get stored credentials
    const credentialsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    if (__DEV__) {
      console.log('Stored credentials found:', credentialsJson ? 'yes' : 'no');
    }
    if (!credentialsJson) {
      if (__DEV__) {
        console.log('No credentials stored in SecureStore');
      }
      return null;
    }

    return JSON.parse(credentialsJson) as BiometricCredentials;
  } catch (error) {
    console.error('Error getting credentials with biometric:', error);
    return null;
  }
}

/**
 * Update stored credentials (e.g., after password change)
 */
export async function updateBiometricCredentials(
  credentials: BiometricCredentials
): Promise<boolean> {
  try {
    const isEnabled = await isBiometricEnabled();
    if (!isEnabled) {
      return false;
    }

    await SecureStore.setItemAsync(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify(credentials),
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );

    return true;
  } catch (error) {
    console.error('Error updating biometric credentials:', error);
    return false;
  }
}

/**
 * Clear all biometric data (for logout)
 */
export async function clearBiometricData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    // Note: We keep BIOMETRIC_ENABLED_KEY so user preference is remembered
  } catch (error) {
    console.error('Error clearing biometric data:', error);
  }
}

/**
 * Debug function to check biometric storage state
 */
export async function debugBiometricStorage(): Promise<void> {
  if (!__DEV__) return;

  const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  const hasCredentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);

  console.log('=== Biometric Storage Debug ===');
  console.log('BIOMETRIC_ENABLED_KEY:', enabled);
  console.log('BIOMETRIC_CREDENTIALS_KEY exists:', hasCredentials ? 'YES' : 'NO');
  console.log('===============================');
}

export const biometricService = {
  isBiometricAvailable,
  getBiometricType,
  getBiometricName,
  getBiometricStatus,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  authenticate,
  getCredentialsWithBiometric,
  updateBiometricCredentials,
  clearBiometricData,
  debugBiometricStorage,
};
