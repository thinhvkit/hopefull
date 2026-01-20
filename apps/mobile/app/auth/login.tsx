import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth';
import { authService } from '../../src/services/auth';
import {
  getBiometricStatus,
  getCredentialsWithBiometric,
  isBiometricAvailable,
  BiometricStatus,
  debugBiometricStorage,
} from '../../src/services/biometric';
import {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
} from '../../src/services/social-auth';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setUser, setTokens, biometricEnabled, hasOfferedBiometric, setHasOfferedBiometric } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    checkBiometricStatus();
    checkAppleAvailability();
  }, []);

  const checkBiometricStatus = async () => {
    await debugBiometricStorage(); // Debug: check storage state
    const status = await getBiometricStatus();
    setBiometricStatus(status);
  };

  const checkAppleAvailability = async () => {
    const available = await isAppleSignInAvailable();
    setAppleAvailable(available);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.register.errors.fillAllFields'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login(email, password);

      // Check if phone verification is required
      if (response.requiresVerification && response.user?.phone) {
        router.push({
          pathname: '/auth/phone-verify',
          params: { phone: response.user.phone, userId: response.user.id },
        });
        return;
      }

      await setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);

      // Check if we should offer biometric setup
      const biometricAvailable = await isBiometricAvailable();
      if (biometricAvailable && !hasOfferedBiometric && !biometricEnabled) {
        await setHasOfferedBiometric(true);
        // Store credentials temporarily for biometric setup (route params can lose special chars)
        await SecureStore.setItemAsync('temp_biometric_setup', JSON.stringify({ email, password }));
        router.push('/auth/biometric-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricStatus?.isEnabled) return;

    setBiometricLoading(true);
    try {
      const credentials = await getCredentialsWithBiometric();

      console.log('Retrieved credentials via biometric:', credentials);
      if (!credentials) {
        // User cancelled or biometric failed
        setBiometricLoading(false);
        return;
      }


      // Login with stored credentials
      const response = await authService.login(credentials.email, credentials.password);

      if (response.requiresVerification) {
        Alert.alert(t('auth.login.verificationRequired'), t('auth.login.pleaseLoginWithPassword'));
        setBiometricLoading(false);
        return;
      }

      if (!response.accessToken || !response.refreshToken) {
        Alert.alert(t('auth.login.loginFailed'), t('auth.login.pleaseLoginWithPassword'));
        setBiometricLoading(false);
        return;
      }

      await setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t('auth.login.loginFailed'), t('auth.login.pleaseLoginWithPassword'));
    } finally {
      setBiometricLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (!biometricStatus) return 'finger-print';
    if (Platform.OS === 'ios') {
      return biometricStatus.biometricType === 'facial' ? 'scan' : 'finger-print';
    }
    return biometricStatus.biometricType === 'facial' ? 'happy-outline' : 'finger-print';
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.cancelled) {
        setGoogleLoading(false);
        return;
      }

      if (!result.success) {
        Alert.alert(t('common.error'), result.error || t('auth.login.loginFailed'));
        setGoogleLoading(false);
        return;
      }

      await setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.login.loginFailed'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const result = await signInWithApple();

      if (result.cancelled) {
        setAppleLoading(false);
        return;
      }

      if (!result.success) {
        Alert.alert(t('common.error'), result.error || t('auth.login.loginFailed'));
        setAppleLoading(false);
        return;
      }

      await setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.login.loginFailed'));
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('auth.login.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('auth.login.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.login.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('auth.login.password')}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        <Link href="/auth/forgot-password" asChild>
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>{t('auth.login.forgotPassword')}</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.login.signIn')}</Text>
          )}
        </TouchableOpacity>

        {/* Biometric Login Button */}
        {biometricStatus?.isEnabled && biometricEnabled && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.biometricButton, biometricLoading && styles.buttonDisabled]}
              onPress={handleBiometricLogin}
              disabled={biometricLoading}
            >
              {biometricLoading ? (
                <ActivityIndicator color="#4F46E5" />
              ) : (
                <>
                  <Ionicons name={getBiometricIcon()} size={24} color="#4F46E5" />
                  <Text style={styles.biometricButtonText}>
                    {t('auth.login.loginWith', { method: biometricStatus.biometricName })}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Social Login Buttons */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('common.continueWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || isLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#111827" />
                <Text style={styles.socialButtonText}>{t('auth.login.google')}</Text>
              </>
            )}
          </TouchableOpacity>

          {appleAvailable && (
            <TouchableOpacity
              style={[styles.socialButton, appleLoading && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
              disabled={appleLoading || isLoading}
            >
              {appleLoading ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#111827" />
                  <Text style={styles.socialButtonText}>{t('auth.login.apple')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.login.noAccount')} </Text>
        <Link href="/auth/register" asChild>
          <TouchableOpacity>
            <Text style={styles.footerLink}>{t('auth.login.signUp')}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 60,
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
    gap: 12,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
});
