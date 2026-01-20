import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth';
import { useLocaleStore } from '@/store/locale';
import { Avatar, Card, Button } from '@/components/ui';
import {
  getBiometricStatus,
  enableBiometric,
  disableBiometric,
  BiometricStatus,
} from '@/services/biometric';
import { authService } from '@/services/auth';
import { LANGUAGES } from '@/i18n';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
  badge?: string;
}

function MenuItem({
  icon,
  label,
  onPress,
  showChevron = true,
  danger = false,
  badge,
}: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? '#EF4444' : '#4F46E5'} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout, biometricEnabled, setBiometricEnabled } = useAuthStore();
  const { language } = useLocaleStore();
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');

  const currentLanguageName = LANGUAGES[language]?.name || 'English';

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const status = await getBiometricStatus();
    setBiometricStatus(status);
  };

  const handleEnableBiometric = async () => {
    if (!password.trim()) {
      Alert.alert(t('common.error'), t('auth.register.errors.fillAllFields'));
      return;
    }

    if (!user?.email) {
      Alert.alert(t('common.error'), t('errors.general'));
      setShowPasswordModal(false);
      setPassword('');
      return;
    }

    setBiometricLoading(true);

    try {
      // Validate password by attempting login
      await authService.login(user.email, password);

      // Password is correct, now enable biometric
      setShowPasswordModal(false);
      const success = await enableBiometric({ email: user.email, password });

      if (success) {
        setBiometricEnabled(true);
        await checkBiometricStatus();
        Alert.alert(t('common.success'), t('auth.biometric.success'));
      } else {
        Alert.alert(t('common.error'), t('auth.biometric.error'));
      }
    } catch (error: any) {
      // Password validation failed
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('profile.security.errors.incorrectPassword')
      );
    } finally {
      setBiometricLoading(false);
      setPassword('');
    }
  };

  const handleBiometricToggle = (value: boolean) => {
    if (biometricLoading) return;

    if (value) {
      // Enable biometric - show password modal
      setPassword('');
      setShowPasswordModal(true);
    } else {
      // Disable biometric
      Alert.alert(
        t('profile.security.biometricLogin'),
        t('profile.logout.message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              setBiometricLoading(true);
              try {
                await disableBiometric();
                setBiometricEnabled(false);
                await checkBiometricStatus();
              } finally {
                setBiometricLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout.title'),
      t('profile.logout.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout.confirm'),
          style: 'destructive',
          onPress: async () => {
            console.log('Logout: starting');
            await logout();
            console.log('Logout: complete - RootLayout will redirect');
            // RootLayout handles redirect via <Redirect> component
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleEditProfile}>
          <Avatar
            source={user?.avatarUrl}
            name={`${user?.firstName} ${user?.lastName}`}
            size="xl"
          />
          <View style={styles.editAvatarBadge}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={styles.userName}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Button
          title={t('profile.editProfile')}
          onPress={handleEditProfile}
          variant="outline"
          size="sm"
          style={styles.editButton}
        />
      </View>

      <Card style={styles.menuSection}>
        <Text style={styles.sectionTitle}>{t('profile.menu.personalInfo')}</Text>
        <MenuItem
          icon="person-outline"
          label={t('profile.menu.personalInfo')}
          onPress={() => router.push('/profile/personal-info')}
        />
        <MenuItem
          icon="call-outline"
          label={t('auth.register.phone')}
          onPress={() => router.push('/profile/phone')}
        />
        <MenuItem
          icon="lock-closed-outline"
          label={t('profile.menu.security')}
          onPress={() => router.push('/profile/security')}
        />
      </Card>

      {/* Biometric Section */}
      {biometricStatus?.isAvailable && (
        <Card style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{t('profile.security.title')}</Text>
          <View style={styles.biometricItem}>
            <View style={styles.menuIcon}>
              <Ionicons
                name={Platform.OS === 'ios' && biometricStatus.biometricType === 'facial' ? 'scan' : 'finger-print'}
                size={20}
                color="#4F46E5"
              />
            </View>
            <View style={styles.biometricTextContainer}>
              <Text style={styles.menuLabel}>{t('profile.security.biometricLogin')}</Text>
              <Text style={styles.biometricDescription}>
                {t('profile.security.biometricDescription', { method: biometricStatus.biometricName })}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={biometricLoading}
              trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
              thumbColor={biometricEnabled ? '#4F46E5' : '#9CA3AF'}
            />
          </View>
        </Card>
      )}

      <Card style={styles.menuSection}>
        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
        <MenuItem
          icon="language-outline"
          label={t('profile.menu.language')}
          onPress={() => router.push('/profile/language')}
          badge={currentLanguageName}
        />
        <MenuItem
          icon="notifications-outline"
          label={t('profile.menu.notifications')}
          onPress={() => router.push('/profile/notifications')}
        />
        <MenuItem
          icon="moon-outline"
          label="Appearance"
          onPress={() => router.push('/profile/appearance')}
        />
      </Card>

      <Card style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <MenuItem
          icon="card-outline"
          label="Payment Methods"
          onPress={() => router.push('/profile/payment-methods')}
        />
        <MenuItem
          icon="receipt-outline"
          label="Payment History"
          onPress={() => router.push('/profile/payment-history')}
        />
      </Card>

      <Card style={styles.menuSection}>
        <Text style={styles.sectionTitle}>{t('profile.menu.help')}</Text>
        <MenuItem
          icon="help-circle-outline"
          label={t('profile.menu.help')}
          onPress={() => router.push('/profile/help')}
        />
        <MenuItem
          icon="chatbubble-outline"
          label="Contact Support"
          onPress={() => router.push('/profile/contact')}
        />
        <MenuItem
          icon="star-outline"
          label="Rate the App"
          onPress={() => Alert.alert('Rate App', 'This would open the app store')}
        />
      </Card>

      <Card style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <MenuItem
          icon="document-text-outline"
          label="Privacy Policy"
          onPress={() => router.push('/profile/privacy')}
        />
        <MenuItem
          icon="shield-checkmark-outline"
          label="Terms & Conditions"
          onPress={() => router.push('/profile/terms')}
        />
      </Card>

      <Card style={[styles.menuSection, styles.lastSection]}>
        <MenuItem
          icon="log-out-outline"
          label={t('profile.menu.logout')}
          onPress={handleLogout}
          showChevron={false}
          danger
        />
      </Card>

      <Text style={styles.versionText}>Version 1.0.0</Text>

      {/* Password Modal for Biometric Setup */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('auth.biometric.enable', { method: biometricStatus?.biometricName })}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('profile.security.currentPasswordPlaceholder')}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('profile.security.currentPasswordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
                disabled={biometricLoading}
              >
                <Text style={styles.modalButtonCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonEnable, biometricLoading && styles.modalButtonDisabled]}
                onPress={handleEnableBiometric}
                disabled={biometricLoading}
              >
                {biometricLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonEnableText}>{t('common.confirm')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  editButton: {
    minWidth: 120,
  },
  menuSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 0,
    overflow: 'hidden',
  },
  lastSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  menuLabelDanger: {
    color: '#EF4444',
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    paddingVertical: 24,
  },
  biometricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  biometricTextContainer: {
    flex: 1,
  },
  biometricDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalButtonEnable: {
    backgroundColor: '#4F46E5',
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonEnableText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
