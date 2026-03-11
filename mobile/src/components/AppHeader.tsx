import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
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
          paddingBottom: t.spacing.md,
          backgroundColor: t.colors.card,
        },
        t.shadow.subtle
      ]}
    >
      <View style={styles.content}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={[styles.backButton, { marginRight: t.spacing.md }]}>
            <FontAwesome5 name="arrow-left" size={18} color={t.colors.accent} />
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
        {right && <View style={[styles.rightContainer, { marginLeft: t.spacing.md }]}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // shadow handled by theme
    zIndex: 1, // Ensure shadow is visible
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    // margin handled inline
  },
  title: {
    flex: 1,
  },
  rightContainer: {
    // margin handled inline
  },
});
