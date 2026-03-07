import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  rating: number;
  onRate?: (rating: number) => void;
  disabled?: boolean;
  size?: number;
  maxStars?: number;
  filledColor?: string;
  emptyColor?: string;
}

export default function StarRating({
  rating,
  onRate,
  disabled = false,
  size = 24,
  maxStars = 5,
  filledColor = '#FFD700',
  emptyColor = '#CCCCCC',
}: Props) {
  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    const filled = i <= rating;
    stars.push(
      <TouchableOpacity
        key={i}
        onPress={() => !disabled && onRate && onRate(i)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={size}
          color={filled ? filledColor : emptyColor}
          style={{ marginHorizontal: 2 }}
        />
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{stars}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
