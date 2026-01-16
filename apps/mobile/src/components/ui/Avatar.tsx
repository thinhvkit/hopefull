import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export function Avatar({
  source,
  name,
  size = 'md',
  showOnlineStatus = false,
  isOnline = false,
  style,
}: AvatarProps) {
  const sizeValue = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  }[size];

  const fontSize = {
    xs: 10,
    sm: 12,
    md: 18,
    lg: 24,
    xl: 36,
  }[size];

  const statusSize = {
    xs: 8,
    sm: 10,
    md: 12,
    lg: 16,
    xl: 20,
  }[size];

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View
      style={[
        styles.container,
        { width: sizeValue, height: sizeValue, borderRadius: sizeValue / 2 },
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[
            styles.image,
            { width: sizeValue, height: sizeValue, borderRadius: sizeValue / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: sizeValue, height: sizeValue, borderRadius: sizeValue / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
      )}
      {showOnlineStatus && (
        <View
          style={[
            styles.status,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              backgroundColor: isOnline ? '#22C55E' : '#9CA3AF',
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#E5E7EB',
  },
  placeholder: {
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  status: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
