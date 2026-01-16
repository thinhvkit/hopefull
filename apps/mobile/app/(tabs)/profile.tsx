import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { Avatar, Card, Button } from '@/components/ui';

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
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.canGoBack() ? router.back() : router.replace('/');
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
        <Text style={styles.title}>Profile</Text>
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
          title="Edit Profile"
          onPress={handleEditProfile}
          variant="outline"
          size="sm"
          style={styles.editButton}
        />
      </View>

      <Card style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem
          icon="person-outline"
          label="Personal Information"
          onPress={() => router.push('/profile/personal-info')}
        />
        <MenuItem
          icon="call-outline"
          label="Phone Number"
          onPress={() => router.push('/profile/phone')}
        />
        <MenuItem
          icon="lock-closed-outline"
          label="Password & Security"
          onPress={() => router.push('/profile/security')}
        />
      </Card>

      <Card style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <MenuItem
          icon="language-outline"
          label="Language"
          onPress={() => router.push('/profile/language')}
          badge="English"
        />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
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
        <Text style={styles.sectionTitle}>Support</Text>
        <MenuItem
          icon="help-circle-outline"
          label="Help Center"
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
          label="Sign Out"
          onPress={handleLogout}
          showChevron={false}
          danger
        />
      </Card>

      <Text style={styles.versionText}>Version 1.0.0</Text>
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
});
