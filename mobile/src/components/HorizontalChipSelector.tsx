import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';
import { hapticLight } from '../utils/haptics';

interface HorizontalChipSelectorProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

export default function HorizontalChipSelector({
  label,
  options,
  selected,
  onToggle,
}: HorizontalChipSelectorProps) {
  const t = useTheme();

  return (
    <View style={[styles.container, { marginBottom: t.spacing.lg }]}>
      <Text style={[t.typography.subhead, { color: t.colors.text, marginBottom: t.spacing.sm }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip,
                {
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.card,
                  borderRadius: t.radius.pill,
                },
                isSelected && {
                  backgroundColor: t.colors.accentLight,
                  borderColor: t.colors.accent,
                },
              ]}
              onPress={() => { hapticLight(); onToggle(opt); }}
              activeOpacity={0.7}
            >
              <View style={styles.chipContent}>
                {isSelected && (
                  <FontAwesome5
                    name="check"
                    size={10}
                    color={t.colors.accent}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    t.typography.footnote,
                    { color: t.colors.text },
                    isSelected && { color: t.colors.accent, fontWeight: '600' },
                  ]}
                >
                  {opt}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
