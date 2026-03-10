import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  label: string;
  options: RadioOption[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function RadioGroup({ label, options, selected, onSelect }: RadioGroupProps) {
  const t = useTheme();
  return (
    <View style={[styles.container, { marginBottom: t.spacing.lg }]}>
      <Text style={[styles.label, { color: t.colors.text, marginBottom: t.spacing.sm }]}>{label}</Text>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.row, { paddingVertical: t.spacing.sm }]}
            onPress={() => onSelect(opt.value)}
          >
            <View style={[styles.radio, { borderColor: t.colors.border }, isSelected && { borderColor: t.colors.accent }]}>
              {isSelected && <View style={[styles.radioInner, { backgroundColor: t.colors.accent }]} />}
            </View>
            <Text style={[styles.optionText, { color: t.colors.text }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 15,
  },
});
