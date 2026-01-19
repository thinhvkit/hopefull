import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { register } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
} from '@/services/social-auth';

type VerificationMethod = 'email' | 'phone';

interface FormData {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  verificationMethod: VerificationMethod;
}

interface FormErrors {
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  acceptTerms?: string;
}

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', test: (p: string) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function RegisterScreen() {
  const { role = 'USER' } = useLocalSearchParams<{ role?: string }>();
  const { setUser, setTokens } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    acceptTerms: false,
    verificationMethod: 'email',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    checkAppleAvailability();
  }, []);

  const checkAppleAvailability = async () => {
    const available = await isAppleSignInAvailable();
    setAppleAvailable(available);
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
        Alert.alert('Error', result.error || 'Google Sign-In failed');
        setGoogleLoading(false);
        return;
      }

      await setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google Sign-In failed');
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
        Alert.alert('Error', result.error || 'Apple Sign-In failed');
        setAppleLoading(false);
        return;
      }

      await setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Apple Sign-In failed');
    } finally {
      setAppleLoading(false);
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    const allPasswordRequirementsMet = PASSWORD_REQUIREMENTS.every((req) =>
      req.test(formData.password)
    );
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!allPasswordRequirementsMet) {
      newErrors.password = 'Password does not meet all requirements';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the Terms & Conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const formatPhoneE164 = (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      // Assume US if no country code
      cleaned = '+1' + cleaned;
    }
    return cleaned;
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    const formattedPhone = formatPhoneE164(formData.phone);

    setLoading(true);
    try {
      const response = await register({
        email: formData.email,
        phone: formattedPhone,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: role as 'USER' | 'THERAPIST',
      });

      // Navigate to appropriate verification screen based on user choice
      if (formData.verificationMethod === 'phone') {
        router.push({
          pathname: '/auth/phone-verify',
          params: { phone: formattedPhone, userId: response.user.id },
        });
      } else {
        router.push({
          pathname: '/auth/otp',
          params: { email: formData.email, userId: response.user.id },
        });
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const renderStep1 = () => (
    <>
      {/* Social Sign Up Buttons */}
      <View style={styles.socialButtons}>
        <TouchableOpacity
          style={[styles.socialButton, googleLoading && styles.socialButtonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color="#111827" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#111827" />
              <Text style={styles.socialButtonText}>Google</Text>
            </>
          )}
        </TouchableOpacity>

        {appleAvailable && (
          <TouchableOpacity
            style={[styles.socialButton, appleLoading && styles.socialButtonDisabled]}
            onPress={handleAppleSignIn}
            disabled={appleLoading || loading}
          >
            {appleLoading ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#111827" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or register with email</Text>
        <View style={styles.dividerLine} />
      </View>

      <Input
        label="First Name"
        placeholder="Enter your first name"
        value={formData.firstName}
        onChangeText={(v) => updateField('firstName', v)}
        error={errors.firstName}
        leftIcon="person-outline"
        autoCapitalize="words"
      />
      <Input
        label="Last Name"
        placeholder="Enter your last name"
        value={formData.lastName}
        onChangeText={(v) => updateField('lastName', v)}
        error={errors.lastName}
        leftIcon="person-outline"
        autoCapitalize="words"
      />
      <Input
        label="Email"
        placeholder="Enter your email"
        value={formData.email}
        onChangeText={(v) => updateField('email', v)}
        error={errors.email}
        leftIcon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label="Phone Number"
        placeholder="+1 (555) 000-0000"
        value={formData.phone}
        onChangeText={(v) => updateField('phone', v)}
        error={errors.phone}
        leftIcon="call-outline"
        keyboardType="phone-pad"
      />
      <Button title="Continue" onPress={handleNext} fullWidth style={styles.button} />
    </>
  );

  const renderStep2 = () => (
    <>
      <TouchableOpacity style={styles.stepBackButton} onPress={() => setStep(1)}>
        <Ionicons name="arrow-back" size={18} color="#4F46E5" />
        <Text style={styles.stepBackText}>Back to Personal Info</Text>
      </TouchableOpacity>

      <View style={styles.verificationSection}>
        <Text style={styles.verificationLabel}>Verify account via:</Text>
        <View style={styles.verificationOptions}>
          <TouchableOpacity
            style={[
              styles.verificationOption,
              formData.verificationMethod === 'email' && styles.verificationOptionActive,
            ]}
            onPress={() => updateField('verificationMethod', 'email')}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={formData.verificationMethod === 'email' ? '#4F46E5' : '#6B7280'}
            />
            <Text
              style={[
                styles.verificationOptionText,
                formData.verificationMethod === 'email' && styles.verificationOptionTextActive,
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.verificationOption,
              formData.verificationMethod === 'phone' && styles.verificationOptionActive,
            ]}
            onPress={() => updateField('verificationMethod', 'phone')}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={formData.verificationMethod === 'phone' ? '#4F46E5' : '#6B7280'}
            />
            <Text
              style={[
                styles.verificationOptionText,
                formData.verificationMethod === 'phone' && styles.verificationOptionTextActive,
              ]}
            >
              Phone
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Input
        label="Password"
        placeholder="Create a password"
        value={formData.password}
        onChangeText={(v) => updateField('password', v)}
        error={errors.password}
        leftIcon="lock-closed-outline"
        isPassword
      />

      <View style={styles.requirements}>
        {PASSWORD_REQUIREMENTS.map((req, index) => {
          const met = req.test(formData.password);
          return (
            <View key={index} style={styles.requirement}>
              <Ionicons
                name={met ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={met ? '#22C55E' : '#9CA3AF'}
              />
              <Text style={[styles.requirementText, met && styles.requirementMet]}>
                {req.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Input
        label="Confirm Password"
        placeholder="Confirm your password"
        value={formData.confirmPassword}
        onChangeText={(v) => updateField('confirmPassword', v)}
        error={errors.confirmPassword}
        leftIcon="lock-closed-outline"
        isPassword
      />

      <TouchableOpacity
        style={styles.termsContainer}
        onPress={() => updateField('acceptTerms', !formData.acceptTerms)}
      >
        <View style={[styles.checkbox, formData.acceptTerms && styles.checkboxChecked]}>
          {formData.acceptTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>
      {errors.acceptTerms && <Text style={styles.errorText}>{errors.acceptTerms}</Text>}

      <Button
        title="Create Account"
        onPress={handleRegister}
        loading={loading}
        fullWidth
        style={styles.button}
      />
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            {role === 'THERAPIST'
              ? 'Join as a therapist and help others'
              : 'Start your wellness journey today'}
          </Text>
        </View>

        <View style={styles.stepIndicator}>
          <TouchableOpacity onPress={() => setStep(1)}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          </TouchableOpacity>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <TouchableOpacity onPress={() => step === 2 && setStep(2)}>
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {step === 1 ? renderStep1() : renderStep2()}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  stepDotActive: {
    backgroundColor: '#4F46E5',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#4F46E5',
  },
  form: {
    flex: 1,
  },
  button: {
    marginTop: 16,
  },
  requirements: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 13,
    color: '#6B7280',
  },
  requirementMet: {
    color: '#22C55E',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  termsLink: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: 24,
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
  stepBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  stepBackText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  verificationSection: {
    marginBottom: 20,
  },
  verificationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 10,
  },
  verificationOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  verificationOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  verificationOptionActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  verificationOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  verificationOptionTextActive: {
    color: '#4F46E5',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
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
  socialButtonDisabled: {
    opacity: 0.7,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
});
