import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';

interface ChipSelectorProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  multiple?: boolean;
}

export default function ChipSelector({
  label,
  options,
  selected,
  onToggle,
  multiple = true,
}: ChipSelectorProps) {
  const t = useTheme();
  function handlePress(value: string) {
    if (multiple) {
      onToggle(value);
    } else {
      onToggle(value);
    }
  }

  return (
    <View style={[styles.container, { marginBottom: t.spacing.lg }]}>
      <Text style={[styles.label, { color: t.colors.text, marginBottom: t.spacing.sm }]}>{label}</Text>
      <View style={[styles.chipRow, { gap: t.spacing.sm }]}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, { borderColor: t.colors.border, backgroundColor: t.colors.card }, isSelected && { backgroundColor: t.colors.accent, borderColor: t.colors.accent }]}
              onPress={() => handlePress(opt)}
            >
              <Text style={[styles.chipText, { color: t.colors.text }, isSelected && { color: '#fff' }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
});
