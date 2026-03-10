import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';

interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function AppHeader({ title, onBack, right }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const t = useTheme();

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: insets.top + t.spacing.md,
          paddingHorizontal: t.spacing.lg,
          backgroundColor: t.colors.card,
          borderBottomColor: t.colors.border
        }
      ]}
    >
      <View style={styles.content}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backText, { color: t.colors.accent }]}>←</Text>
          </TouchableOpacity>
        )}
        <Text 
          style={[
            styles.title, 
            t.typography.title2,
            { color: t.colors.text }
          ]}
        >
          {title}
        </Text>
        {right && <View style={styles.rightContainer}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 24,
    fontWeight: '600',
  },
  title: {
    flex: 1,
  },
  rightContainer: {
    marginLeft: 12,
  },
});
