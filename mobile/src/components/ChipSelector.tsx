import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
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
      <Text style={[styles.label, t.typography.subhead, { color: t.colors.text, marginBottom: t.spacing.sm }]}>
        {label}
      </Text>
      <View style={[styles.chipRow, { gap: t.spacing.sm }]}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip,
                t.shadow.subtle,
                { 
                  borderColor: t.colors.border, 
                  backgroundColor: t.colors.card,
                  borderRadius: t.radius.pill,
                },
                isSelected && { 
                  backgroundColor: t.colors.accentLight, 
                  borderColor: t.colors.accent 
                }
              ]}
              onPress={() => handlePress(opt)}
            >
              <View style={styles.chipContent}>
                {isSelected && (
                  <FontAwesome5 
                    name="check" 
                    size={10} 
                    color={t.colors.accent} 
                    style={{ marginRight: t.spacing.xs }}
                  />
                )}
                <Text 
                  style={[
                    styles.chipText, 
                    t.typography.footnote,
                    { color: t.colors.text }, 
                    isSelected && { color: t.colors.accent, fontWeight: '600' }
                  ]}
                >
                  {opt}
                </Text>
              </View>
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
    // handled by theme typography
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    // handled by theme typography
  },
});
