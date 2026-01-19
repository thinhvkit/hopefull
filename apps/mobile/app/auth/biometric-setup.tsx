import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Button } from '@/components/ui';
import {
  getBiometricStatus,
  enableBiometric,
  BiometricStatus,
} from '@/services/biometric';
import { useAuthStore } from '@/store/auth';

export default function BiometricSetupScreen() {
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const { setBiometricEnabled } = useAuthStore();

  useEffect(() => {
    loadCredentials();
    checkBiometricStatus();
  }, []);

  const loadCredentials = async () => {
    try {
      const stored = await SecureStore.getItemAsync('temp_biometric_setup');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (__DEV__) {
          console.log('BiometricSetup credentials loaded:', {
            email: parsed.email,
            passwordLength: parsed.password?.length ?? 0,
          });
        }
        setCredentials(parsed);
        // Clean up temp storage
        await SecureStore.deleteItemAsync('temp_biometric_setup');
      } else {
        if (__DEV__) {
          console.log('BiometricSetup: No temp credentials found');
        }
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error loading biometric setup credentials:', error);
      router.replace('/(tabs)');
    }
  };

  const checkBiometricStatus = async () => {
    const status = await getBiometricStatus();
    setBiometricStatus(status);
  };

  const handleEnableBiometric = async () => {
    if (!credentials?.email || !credentials?.password) {
      Alert.alert('Error', 'Credentials not available');
      router.replace('/(tabs)');
      return;
    }

    setLoading(true);
    try {
      const success = await enableBiometric(credentials);

      if (success) {
        setBiometricEnabled(true);
        Alert.alert(
          'Success',
          `${biometricStatus?.biometricName} login enabled!`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        Alert.alert('Cancelled', 'Biometric setup was cancelled');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to enable biometric login');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const getBiometricIcon = () => {
    if (!biometricStatus) return 'finger-print';

    if (Platform.OS === 'ios') {
      return biometricStatus.biometricType === 'facial' ? 'scan' : 'finger-print';
    }
    return biometricStatus.biometricType === 'facial' ? 'happy-outline' : 'finger-print';
  };

  if (!biometricStatus || !credentials) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Checking biometric availability...</Text>
        </View>
      </View>
    );
  }

  if (!biometricStatus.isAvailable) {
    // Skip this screen if biometric not available
    router.replace('/(tabs)');
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={getBiometricIcon()} size={64} color="#4F46E5" />
          </View>
          <Text style={styles.title}>Quick Login</Text>
          <Text style={styles.subtitle}>
            Enable {biometricStatus.biometricName} to login quickly and securely without entering your password.
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="flash-outline" size={24} color="#4F46E5" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Instant Access</Text>
              <Text style={styles.featureDescription}>
                Login in seconds with just your {biometricStatus.biometricType === 'facial' ? 'face' : 'fingerprint'}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4F46E5" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Secure</Text>
              <Text style={styles.featureDescription}>
                Your biometric data never leaves your device
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="key-outline" size={24} color="#4F46E5" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Password Backup</Text>
              <Text style={styles.featureDescription}>
                You can always use your password as a fallback
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={`Enable ${biometricStatus.biometricName}`}
            onPress={handleEnableBiometric}
            loading={loading}
            fullWidth
          />

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            You can enable this later in Settings
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  features: {
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    alignItems: 'center',
  },
  skipButton: {
    marginTop: 16,
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    color: '#9CA3AF',
  },
});
