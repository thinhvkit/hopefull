import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', size = 'md', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], styles[`size_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: '#F3F4F6',
  },
  primary: {
    backgroundColor: '#EEF2FF',
  },
  success: {
    backgroundColor: '#DCFCE7',
  },
  warning: {
    backgroundColor: '#FEF3C7',
  },
  error: {
    backgroundColor: '#FEE2E2',
  },
  info: {
    backgroundColor: '#DBEAFE',
  },
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  size_md: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  text: {
    fontWeight: '500',
  },
  text_default: {
    color: '#6B7280',
  },
  text_primary: {
    color: '#4F46E5',
  },
  text_success: {
    color: '#16A34A',
  },
  text_warning: {
    color: '#D97706',
  },
  text_error: {
    color: '#DC2626',
  },
  text_info: {
    color: '#2563EB',
  },
  text_sm: {
    fontSize: 12,
  },
  text_md: {
    fontSize: 14,
  },
});
