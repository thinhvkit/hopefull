import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { verifyEmail } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import {
  getFirebaseAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMAIL_STORAGE_KEY = 'emailForSignIn';
const RESEND_COOLDOWN_SECONDS = 60;

export default function EmailVerifyScreen() {
  const { email, userId } = useLocalSearchParams<{
    email: string;
    userId?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { setUser, setTokens } = useAuthStore();

  // Send email link on mount
  useEffect(() => {
    if (email) {
      sendEmailLink();
    }
  }, [email]);

  // Countdown timer for resend
  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Listen for deep links
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      await handleEmailLink(event.url);
    };

    // Check if app was opened with a link
    Linking.getInitialURL().then((url) => {
      if (url) handleEmailLink(url);
    });

    // Listen for new links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [email]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendEmailLink = async () => {
    if (!email) return;

    setSendingEmail(true);
    try {
      await sendSignInLinkToEmail(email);
      // Store email for later verification
      await AsyncStorage.setItem(EMAIL_STORAGE_KEY, email);
      setEmailSent(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error: any) {
      console.error('Error sending email link:', error);
      Alert.alert('Error', error.message || 'Failed to send verification email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEmailLink = async (url: string) => {
    if (!isSignInWithEmailLink(url)) return;

    setLoading(true);
    try {
      // Get stored email
      const storedEmail = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);
      const emailToUse = storedEmail || email;

      if (!emailToUse) {
        Alert.alert('Error', 'Email not found. Please try again.');
        return;
      }

      // Sign in with email link
      const userCredential = await signInWithEmailLink(emailToUse, url);
      const idToken = await userCredential.user.getIdToken();

      // Clear stored email
      await AsyncStorage.removeItem(EMAIL_STORAGE_KEY);

      // Verify with backend
      const response = await verifyEmail(idToken, userId);

      if (response.accessToken && response.refreshToken) {
        await setTokens(response.accessToken, response.refreshToken);
        setUser(response.user);
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Email verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await sendEmailLink();
  };

  const handleOpenEmail = () => {
    // Try to open email app
    Linking.openURL('mailto:');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={48} color="#4F46E5" />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            {emailSent
              ? `We've sent a verification link to\n`
              : `We'll send a verification link to\n`}
            <Text style={styles.highlight}>{email}</Text>
          </Text>
        </View>

        {sendingEmail ? (
          <View style={styles.sendingContainer}>
            <Text style={styles.sendingText}>Sending verification email...</Text>
          </View>
        ) : emailSent ? (
          <>
            <View style={styles.instructionsContainer}>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>1</Text>
                </View>
                <Text style={styles.instructionText}>Check your email inbox</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>2</Text>
                </View>
                <Text style={styles.instructionText}>Click the verification link</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>3</Text>
                </View>
                <Text style={styles.instructionText}>You'll be automatically signed in</Text>
              </View>
            </View>

            <Button
              title="Open Email App"
              onPress={handleOpenEmail}
              fullWidth
              style={styles.openEmailButton}
              variant="outline"
            />

            {loading && (
              <View style={styles.verifyingContainer}>
                <Text style={styles.verifyingText}>Verifying...</Text>
              </View>
            )}

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the email?</Text>
              <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
                <Text
                  style={[
                    styles.resendLink,
                    resendCooldown > 0 && styles.resendLinkDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend in ${formatTime(resendCooldown)}`
                    : 'Resend Email'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.spamNote}>
              <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
              <Text style={styles.spamNoteText}>
                Check your spam folder if you don't see the email
              </Text>
            </View>
          </>
        ) : (
          <Button
            title="Send Verification Email"
            onPress={sendEmailLink}
            fullWidth
            loading={sendingEmail}
          />
        )}
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  highlight: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  sendingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  sendingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  instructionsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  openEmailButton: {
    marginBottom: 24,
  },
  verifyingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyingText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  resendContainer: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#9CA3AF',
  },
  spamNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  spamNoteText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
