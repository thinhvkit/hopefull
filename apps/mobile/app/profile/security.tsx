import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { changePassword } from '@/services/auth';
import { useAuthStore } from '@/store/auth';

// Password policy requirements
const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', regex: /.{12,}/ },
  { label: 'One uppercase letter', regex: /[A-Z]/ },
  { label: 'One lowercase letter', regex: /[a-z]/ },
  { label: 'One number', regex: /[0-9]/ },
  { label: 'One special character (!@#$%^&*)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

export default function SecurityScreen() {
  const { logout } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (password: string) => {
    return PASSWORD_REQUIREMENTS.every((req) => req.regex.test(password));
  };

  const handleChangePassword = async () => {
    setError('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (!validatePassword(newPassword)) {
      setError('New password does not meet requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert(
        'Password Changed',
        'Your password has been changed successfully. Please log in again with your new password.',
        [{
          text: 'OK',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        }]
      );
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to change password');
      setLoading(false);
    }
  };

  const isFormValid =
    currentPassword &&
    validatePassword(newPassword) &&
    newPassword === confirmPassword &&
    currentPassword !== newPassword;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password & Security</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#4F46E5" />
          <Text style={styles.infoText}>
            Keep your account secure by using a strong password that you don't use elsewhere.
          </Text>
        </View>

        {/* Current Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter current password"
              placeholderTextColor="#9CA3AF"
              value={currentPassword}
              onChangeText={(v) => {
                setCurrentPassword(v);
                setError('');
              }}
              secureTextEntry={!showCurrentPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <Ionicons
                name={showCurrentPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={(v) => {
                setNewPassword(v);
                setError('');
              }}
              secureTextEntry={!showNewPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Ionicons
                name={showNewPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements</Text>
          {PASSWORD_REQUIREMENTS.map((req, index) => {
            const isMet = req.regex.test(newPassword);
            return (
              <View key={index} style={styles.requirementRow}>
                <Ionicons
                  name={isMet ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={isMet ? '#22C55E' : '#9CA3AF'}
                />
                <Text style={[styles.requirementText, isMet && styles.requirementMet]}>
                  {req.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Confirm new password"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setError('');
            }}
            secureTextEntry={!showNewPassword}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <Text style={styles.mismatchText}>Passwords do not match</Text>
          )}
          {confirmPassword && newPassword === confirmPassword && newPassword && (
            <View style={styles.matchContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.matchText}>Passwords match</Text>
            </View>
          )}
        </View>

        {/* Error Message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Submit Button */}
        <Button
          title="Change Password"
          onPress={handleChangePassword}
          loading={loading}
          disabled={!isFormValid}
          fullWidth
          style={styles.submitButton}
        />

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => router.push('/auth/forgot-password')}
        >
          <Text style={styles.forgotText}>Forgot your current password?</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4F46E5',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
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
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#6B7280',
  },
  requirementMet: {
    color: '#22C55E',
  },
  mismatchText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  matchText: {
    color: '#22C55E',
    fontSize: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  forgotText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
});
