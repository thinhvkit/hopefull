import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Avatar } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { usersService } from '@/services/users';
import {
  pickImage,
  pickImageFromCamera,
  pickImageFromGallery,
  ImagePickerResult,
  formatFileSize,
} from '@/services/image-picker';

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || '');

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Photo preview state
  const [previewImage, setPreviewImage] = useState<ImagePickerResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const handlePickPhoto = async (source: 'camera' | 'gallery') => {
    setShowPhotoOptions(false);

    const result = source === 'camera'
      ? await pickImageFromCamera({ aspect: [1, 1], maxWidth: 600, maxHeight: 600 })
      : await pickImageFromGallery({ aspect: [1, 1], maxWidth: 600, maxHeight: 600 });

    if (result) {
      setPreviewImage(result);
      setShowPreview(true);
    }
  };

  const handleConfirmPhoto = async () => {
    if (!previewImage?.base64) return;

    setShowPreview(false);
    setUploadingPhoto(true);

    try {
      const { avatarUrl } = await usersService.uploadAvatar({
        base64: previewImage.base64,
        mimeType: previewImage.mimeType,
      });

      // Update local user state
      if (user) {
        setUser({ ...user, avatarUrl });
      }

      Alert.alert('Success', 'Profile photo updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      setPreviewImage(null);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingPhoto(true);
            try {
              await usersService.removeAvatar();
              if (user) {
                setUser({ ...user, avatarUrl: undefined });
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove photo');
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setSaving(true);

    try {
      const updatedUser = await usersService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim() || undefined,
      });

      if (user) {
        setUser({ ...user, ...updatedUser });
      }

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    firstName !== (user?.firstName || '') ||
    lastName !== (user?.lastName || '') ||
    bio !== (user?.bio || '');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.avatarContainer}>
            {uploadingPhoto ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#4F46E5" />
              </View>
            ) : (
              <Avatar
                source={user?.avatarUrl}
                name={`${firstName} ${lastName}`}
                size="xl"
              />
            )}
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => setShowPhotoOptions(true)}
              disabled={uploadingPhoto}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={() => setShowPhotoOptions(true)}
            disabled={uploadingPhoto}
          >
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>

          {user?.avatarUrl && (
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={handleRemovePhoto}
              disabled={uploadingPhoto}
            >
              <Text style={styles.removePhotoText}>Remove Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Fields */}
        <View style={styles.formSection}>
          <Input
            label="First Name"
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
            leftIcon="person-outline"
            autoCapitalize="words"
          />

          <Input
            label="Last Name"
            placeholder="Enter your last name"
            value={lastName}
            onChangeText={setLastName}
            leftIcon="person-outline"
            autoCapitalize="words"
          />

          <Input
            label="Bio"
            placeholder="Tell us about yourself (optional)"
            value={bio}
            onChangeText={setBio}
            leftIcon="information-circle-outline"
            multiline
            numberOfLines={3}
            style={styles.bioInput}
          />

          <View style={styles.readOnlySection}>
            <Text style={styles.readOnlyLabel}>Email</Text>
            <View style={styles.readOnlyField}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <Text style={styles.readOnlyValue}>{user?.email}</Text>
              {user?.emailVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              )}
            </View>
          </View>

          {user?.phone && (
            <View style={styles.readOnlySection}>
              <Text style={styles.readOnlyLabel}>Phone</Text>
              <View style={styles.readOnlyField}>
                <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                <Text style={styles.readOnlyValue}>{user.phone}</Text>
                {user?.phoneVerified && (
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                )}
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!hasChanges || saving}
          fullWidth
          style={styles.saveButton}
        />
      </ScrollView>

      {/* Photo Options Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View style={styles.photoOptionsSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change Profile Photo</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handlePickPhoto('camera')}
            >
              <Ionicons name="camera-outline" size={24} color="#4F46E5" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handlePickPhoto('gallery')}
            >
              <Ionicons name="images-outline" size={24} color="#4F46E5" />
              <Text style={styles.optionText}>Choose from Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.cancelButton]}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal
        visible={showPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview</Text>

            {previewImage && (
              <>
                <Image
                  source={{ uri: previewImage.uri }}
                  style={styles.previewImage}
                />
                <Text style={styles.previewInfo}>
                  {previewImage.width} x {previewImage.height}
                  {previewImage.fileSize && ` • ${formatFileSize(previewImage.fileSize)}`}
                </Text>
              </>
            )}

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.previewButton, styles.previewCancelButton]}
                onPress={() => {
                  setShowPreview(false);
                  setPreviewImage(null);
                }}
              >
                <Text style={styles.previewCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.previewButton, styles.previewConfirmButton]}
                onPress={handleConfirmPhoto}
              >
                <Text style={styles.previewConfirmText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  uploadingOverlay: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  changePhotoButton: {
    paddingVertical: 8,
  },
  changePhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  removePhotoButton: {
    paddingVertical: 4,
  },
  removePhotoText: {
    fontSize: 14,
    color: '#EF4444',
  },
  formSection: {
    gap: 4,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readOnlySection: {
    marginBottom: 16,
  },
  readOnlyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readOnlyValue: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    marginVertical: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  photoOptionsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  cancelButton: {
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
  },
  previewInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  previewButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  previewCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  previewConfirmButton: {
    backgroundColor: '#4F46E5',
  },
  previewConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
