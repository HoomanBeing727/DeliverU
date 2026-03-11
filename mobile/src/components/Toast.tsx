import React, { useEffect, useRef } from 'react';
import { 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Platform, 
  View
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';

export type ToastType = 'success' | 'info' | 'warning';

interface Props {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
}

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

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return t.colors.success;
      case 'info': return t.colors.info;
      case 'warning': return t.colors.warning;
      default: return t.colors.info;
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'info': return 'info-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'info-circle';
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: getBackgroundColor(),
          marginHorizontal: t.spacing.lg,
          marginTop: Platform.OS === 'ios' ? 50 : 20,
          borderRadius: t.radius.lg,
          paddingVertical: t.spacing.md,
          paddingHorizontal: t.spacing.lg,
          ...t.shadow.floating,
          transform: [{ translateY }]
        }
      ]}
    >
      <View style={styles.content}>
        <FontAwesome5 
          name={getIconName()} 
          size={18} 
          color="#fff" 
          style={{ marginRight: t.spacing.sm }}
        />
        <Text style={[styles.text, t.typography.subhead]}>{message}</Text>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    textAlign: 'left',
    flexShrink: 1,
  },
});
