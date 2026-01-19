import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { verifyPhone } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import { getFirebaseAuth } from '@/config/firebase';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 180;
const RESEND_COOLDOWN_SECONDS = 60;

export default function PhoneVerifyScreen() {
  const { phone, userId } = useLocalSearchParams<{
    phone: string;
    userId?: string;
  }>();
  const [confirmation, setConfirmation] = useState<any>(null);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [expiryTime, setExpiryTime] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attempts, setAttempts] = useState(3);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { setUser, setTokens } = useAuthStore();

  // Send OTP on mount
  useEffect(() => {
    if (phone) {
      sendFirebaseOtp();
    }
  }, [phone]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiryTime((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Firebase OTP sending
  const sendFirebaseOtp = async () => {
    if (!phone) return;

    setSendingOtp(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error('Firebase Auth not available. Please use a development build.');
      }
      const confirm = await auth().signInWithPhoneNumber(phone);
      setConfirmation(confirm);
      setExpiryTime(OTP_EXPIRY_SECONDS);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const pastedCode = value.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      pastedCode.forEach((char, i) => {
        if (i < OTP_LENGTH) newOtp[i] = char;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(pastedCode.length, OTP_LENGTH - 1)]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      Alert.alert('Invalid OTP', 'Please enter the complete verification code');
      return;
    }

    if (!confirmation) {
      Alert.alert('Error', 'Verification session expired. Please request a new code.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await confirmation.confirm(otpCode);
      if (!userCredential) {
        throw new Error('Failed to verify code');
      }
      const idToken = await userCredential.user.getIdToken();

      const response = await verifyPhone(idToken, userId);

      if (response.accessToken && response.refreshToken) {
        await setTokens(response.accessToken, response.refreshToken);
        setUser(response.user);
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Verification error:', error);
      setAttempts((prev) => prev - 1);

      let message = 'Invalid verification code';
      if (error.code === 'auth/invalid-verification-code') {
        message = 'The verification code is incorrect';
      } else if (error.code === 'auth/code-expired') {
        message = 'The verification code has expired';
      }

      Alert.alert('Verification Failed', `${message}. ${attempts - 1} attempts remaining.`);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setOtp(Array(OTP_LENGTH).fill(''));
    setAttempts(3);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    await sendFirebaseOtp();
  };

  const isOtpComplete = otp.every((digit) => digit !== '');
  const isVerifyDisabled = !isOtpComplete || !confirmation;

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
            <Ionicons name="phone-portrait-outline" size={48} color="#4F46E5" />
          </View>
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            We've sent a {OTP_LENGTH}-digit code to{'\n'}
            <Text style={styles.highlight}>{phone}</Text>
          </Text>
          {__DEV__ && (
            <Text style={styles.devNote}>
              Firebase Phone Auth Mode
            </Text>
          )}
        </View>

        {sendingOtp ? (
          <View style={styles.sendingContainer}>
            <Text style={styles.sendingText}>Sending verification code...</Text>
          </View>
        ) : (
          <>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    expiryTime === 0 && styles.otpInputExpired,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <View style={styles.timerContainer}>
              {expiryTime > 0 ? (
                <Text style={styles.timerText}>
                  Code expires in{' '}
                  <Text style={styles.timerValue}>{formatTime(expiryTime)}</Text>
                </Text>
              ) : (
                <Text style={styles.expiredText}>Code has expired</Text>
              )}
            </View>

            <View style={styles.attemptsContainer}>
              <Text style={styles.attemptsText}>
                {attempts} {attempts === 1 ? 'attempt' : 'attempts'} remaining
              </Text>
            </View>

            <Button
              title="Verify"
              onPress={handleVerify}
              loading={loading}
              disabled={isVerifyDisabled}
              fullWidth
              style={styles.verifyButton}
            />

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
                <Text
                  style={[
                    styles.resendLink,
                    resendCooldown > 0 && styles.resendLinkDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend in ${formatTime(resendCooldown)}`
                    : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
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
  devNote: {
    marginTop: 12,
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
  sendingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  sendingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
  },
  otpInputFilled: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  otpInputExpired: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  timerValue: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  expiredText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  attemptsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  attemptsText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  verifyButton: {
    marginBottom: 24,
  },
  resendContainer: {
    alignItems: 'center',
    gap: 8,
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
});
