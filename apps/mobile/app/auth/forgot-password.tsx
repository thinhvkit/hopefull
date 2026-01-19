import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { forgotPassword, resetPassword } from '@/services/auth';

type Step = 'email' | 'otp' | 'password' | 'success';

const OTP_EXPIRY_SECONDS = 180; // 3 minutes

// Password policy requirements
const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', regex: /.{12,}/ },
  { label: 'One uppercase letter', regex: /[A-Z]/ },
  { label: 'One lowercase letter', regex: /[a-z]/ },
  { label: 'One number', regex: /[0-9]/ },
  { label: 'One special character (!@#$%^&*)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const otpInputs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await forgotPassword(email);
      setStep('otp');
      setCountdown(OTP_EXPIRY_SECONDS);
      setCanResend(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await forgotPassword(email);
      setOtp(['', '', '', '', '', '']);
      setCountdown(OTP_EXPIRY_SECONDS);
      setCanResend(false);
      Alert.alert('Success', 'A new OTP has been sent to your email');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);

      if (value && index < 5) {
        otpInputs.current[index + 1]?.focus();
      }
    }
    setError('');
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete OTP');
      return;
    }
    if (countdown === 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }
    setError('');
    setStep('password');
  };

  const validatePassword = (password: string) => {
    return PASSWORD_REQUIREMENTS.every((req) => req.regex.test(password));
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Password is required');
      return;
    }
    if (!validatePassword(newPassword)) {
      setError('Password does not meet requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(email, otp.join(''), newPassword);
      setStep('success');
    } catch (err: any) {
      if (err.message?.includes('OTP')) {
        setError(err.message);
        setStep('otp');
      } else {
        Alert.alert('Error', err.message || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-open-outline" size={48} color="#4F46E5" />
        </View>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a code to reset your password.
        </Text>
      </View>

      <Input
        label="Email Address"
        placeholder="Enter your email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setError('');
        }}
        error={error}
        leftIcon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button
        title="Send OTP"
        onPress={handleSendOtp}
        loading={loading}
        fullWidth
        style={styles.button}
      />
    </>
  );

  const renderOtpStep = () => (
    <>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="keypad-outline" size={48} color="#4F46E5" />
        </View>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to{'\n'}
          <Text style={styles.highlight}>{email}</Text>
        </Text>
      </View>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (otpInputs.current[index] = ref)}
            style={[
              styles.otpInput,
              digit && styles.otpInputFilled,
              error && styles.otpInputError,
            ]}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
          />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.timerContainer}>
        {countdown > 0 ? (
          <Text style={styles.timerText}>
            Code expires in <Text style={styles.timerHighlight}>{formatTime(countdown)}</Text>
          </Text>
        ) : (
          <Text style={styles.timerExpired}>Code has expired</Text>
        )}
      </View>

      <Button
        title="Verify OTP"
        onPress={handleVerifyOtp}
        loading={loading}
        fullWidth
        style={styles.button}
        disabled={countdown === 0}
      />

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResendOtp}
        disabled={!canResend || loading}
      >
        <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
          {canResend ? "Didn't receive it? Resend OTP" : 'Resend available when timer expires'}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={48} color="#4F46E5" />
        </View>
        <Text style={styles.title}>Create New Password</Text>
        <Text style={styles.subtitle}>
          Your new password must be different from previously used passwords.
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              setError('');
            }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.requirementsContainer}>
        {PASSWORD_REQUIREMENTS.map((req, index) => {
          const isMet = req.regex.test(newPassword);
          return (
            <View key={index} style={styles.requirementRow}>
              <Ionicons
                name={isMet ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={isMet ? '#22C55E' : '#9CA3AF'}
              />
              <Text style={[styles.requirementText, isMet && styles.requirementMet]}>
                {req.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={(v) => {
            setConfirmPassword(v);
            setError('');
          }}
          secureTextEntry={!showPassword}
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <Text style={styles.mismatchText}>Passwords do not match</Text>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        title="Reset Password"
        onPress={handleResetPassword}
        loading={loading}
        fullWidth
        style={styles.button}
        disabled={!validatePassword(newPassword) || newPassword !== confirmPassword}
      />
    </>
  );

  const renderSuccessStep = () => (
    <>
      <View style={styles.header}>
        <View style={[styles.iconContainer, styles.iconContainerSuccess]}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#22C55E" />
        </View>
        <Text style={styles.title}>Password Reset!</Text>
        <Text style={styles.subtitle}>
          Your password has been reset successfully. You can now sign in with your new password.
        </Text>
      </View>

      <Button
        title="Sign In"
        onPress={() => router.replace('/auth/login')}
        fullWidth
        style={styles.button}
      />
    </>
  );

  const renderStep = () => {
    switch (step) {
      case 'email':
        return renderEmailStep();
      case 'otp':
        return renderOtpStep();
      case 'password':
        return renderPasswordStep();
      case 'success':
        return renderSuccessStep();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'email' || step === 'success') {
              router.back();
            } else if (step === 'otp') {
              setStep('email');
            } else if (step === 'password') {
              setStep('otp');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        {/* Progress indicator */}
        {step !== 'success' && (
          <View style={styles.progressContainer}>
            {['email', 'otp', 'password'].map((s, index) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  (step === s || ['email', 'otp', 'password'].indexOf(step) > index) &&
                    styles.progressDotActive,
                ]}
              />
            ))}
          </View>
        )}

        {renderStep()}

        {step !== 'success' && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password?</Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#4F46E5',
    width: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  iconContainerSuccess: {
    backgroundColor: '#DCFCE7',
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
  button: {
    marginTop: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
  },
  otpInputFilled: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  otpInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  timerHighlight: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  timerExpired: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: '#9CA3AF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  requirementsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#6B7280',
  },
  requirementMet: {
    color: '#22C55E',
  },
  mismatchText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: 'auto',
    paddingBottom: 40,
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
