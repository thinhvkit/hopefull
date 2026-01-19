import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform, Alert } from 'react-native';

export interface ImagePickerResult {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  fileSize?: number;
  mimeType: string;
}

export interface ImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxFileSizeMB?: number;
}

const DEFAULT_OPTIONS: ImagePickerOptions = {
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
  maxWidth: 400,
  maxHeight: 400,
  maxFileSizeMB: 0.5, // 500KB limit for Firestore storage
};

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera permission is required to take photos. Please enable it in your device settings.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Photo library permission is required to select photos. Please enable it in your device settings.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
}

/**
 * Process and resize image
 */
async function processImage(
  uri: string,
  options: ImagePickerOptions
): Promise<ImagePickerResult> {
  const { maxWidth = 800, maxHeight = 800, quality = 0.8 } = options;

  // Resize and compress the image
  const manipulatedImage = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: maxWidth,
          height: maxHeight,
        },
      },
    ],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  // Get file info
  const response = await fetch(manipulatedImage.uri);
  const blob = await response.blob();
  const fileSize = blob.size;

  return {
    uri: manipulatedImage.uri,
    base64: manipulatedImage.base64,
    width: manipulatedImage.width,
    height: manipulatedImage.height,
    fileSize,
    mimeType: 'image/jpeg',
  };
}

/**
 * Validate file size
 */
function validateFileSize(fileSize: number, maxFileSizeMB: number): boolean {
  const maxBytes = maxFileSizeMB * 1024 * 1024;
  return fileSize <= maxBytes;
}

/**
 * Pick image from camera
 */
export async function pickImageFromCamera(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult | null> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: mergedOptions.allowsEditing,
    aspect: mergedOptions.aspect,
    quality: 1, // We'll compress later
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const processedImage = await processImage(asset.uri, mergedOptions);

  // Validate file size
  if (processedImage.fileSize && !validateFileSize(processedImage.fileSize, mergedOptions.maxFileSizeMB!)) {
    Alert.alert(
      'File Too Large',
      `The image exceeds the maximum file size of ${mergedOptions.maxFileSizeMB}MB. Please choose a smaller image.`
    );
    return null;
  }

  return processedImage;
}

/**
 * Pick image from gallery
 */
export async function pickImageFromGallery(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult | null> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: mergedOptions.allowsEditing,
    aspect: mergedOptions.aspect,
    quality: 1, // We'll compress later
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const processedImage = await processImage(asset.uri, mergedOptions);

  // Validate file size
  if (processedImage.fileSize && !validateFileSize(processedImage.fileSize, mergedOptions.maxFileSizeMB!)) {
    Alert.alert(
      'File Too Large',
      `The image exceeds the maximum file size of ${mergedOptions.maxFileSizeMB}MB. Please choose a smaller image.`
    );
    return null;
  }

  return processedImage;
}

/**
 * Show action sheet to pick image source
 */
export async function pickImage(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Select Photo',
      'Choose a photo source',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const result = await pickImageFromCamera(options);
            resolve(result);
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            const result = await pickImageFromGallery(options);
            resolve(result);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const imagePickerService = {
  pickImage,
  pickImageFromCamera,
  pickImageFromGallery,
  requestCameraPermission,
  requestMediaLibraryPermission,
  formatFileSize,
};
