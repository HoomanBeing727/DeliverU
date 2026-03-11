import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
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
      <Text style={[styles.label, t.typography.subhead, { color: t.colors.text, marginBottom: t.spacing.sm }]}>
        {label}
      </Text>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.row, 
              { 
                paddingVertical: t.spacing.sm,
                paddingHorizontal: t.spacing.sm,
                borderRadius: t.radius.md
              },
              isSelected && { backgroundColor: t.colors.accentLight }
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <View 
              style={[
                styles.radio, 
                { 
                  borderColor: isSelected ? t.colors.accent : t.colors.separator,
                  marginRight: t.spacing.sm 
                }
              ]}
            >
              {isSelected && (
                <View 
                  style={[
                    styles.radioInner, 
                    { backgroundColor: t.colors.accent }
                  ]} 
                />
              )}
            </View>
            <Text style={[styles.optionText, t.typography.callout, { color: t.colors.text }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    // handled by theme
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
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  optionText: {
    // handled by theme
  },
});
