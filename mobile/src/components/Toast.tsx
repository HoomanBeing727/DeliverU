import React, { useEffect, useRef } from 'react';
import { 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Platform, 
  View
} from 'react-native';
import { useTheme } from '../constants/theme';

export type ToastType = 'success' | 'info' | 'warning';

interface Props {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
}

const COLORS = {
  success: '#4caf50', // Green
  info: '#2196f3',    // Blue
  warning: '#ff9800', // Orange
};

const { width } = Dimensions.get('window');

export default function Toast({ message, type, visible, onHide }: Props) {
  const t = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (visible) {
      // Slide down
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 3 seconds
      timer = setTimeout(() => {
        onHide();
      }, 3000);
    } else {
      // Slide up
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, onHide, translateY]);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: COLORS[type],
          paddingBottom: t.spacing.md,
          paddingHorizontal: t.spacing.lg,
          ...t.shadow.floating,
          transform: [{ translateY }]
        }
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Status bar padding
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
