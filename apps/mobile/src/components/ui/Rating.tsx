import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingProps {
  value: number;
  maxValue?: number;
  size?: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  showLabel?: boolean;
  style?: ViewStyle;
}

export function Rating({
  value,
  maxValue = 5,
  size = 20,
  editable = false,
  onChange,
  showLabel = false,
  style,
}: RatingProps) {
  const stars = Array.from({ length: maxValue }, (_, index) => {
    const starValue = index + 1;
    const filled = value >= starValue;
    const halfFilled = value >= starValue - 0.5 && value < starValue;

    return (
      <TouchableOpacity
        key={index}
        onPress={() => editable && onChange?.(starValue)}
        disabled={!editable}
        activeOpacity={editable ? 0.7 : 1}
      >
        <Ionicons
          name={filled ? 'star' : halfFilled ? 'star-half' : 'star-outline'}
          size={size}
          color="#FBBF24"
        />
      </TouchableOpacity>
    );
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.stars}>{stars}</View>
      {showLabel && (
        <Text style={styles.label}>
          {value.toFixed(1)} / {maxValue}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
