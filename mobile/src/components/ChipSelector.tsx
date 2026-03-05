import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
  function handlePress(value: string) {
    if (multiple) {
      onToggle(value);
    } else {
      onToggle(value);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handlePress(opt)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
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
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#003366',
    borderColor: '#003366',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
});
