import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5 } from '@expo/vector-icons';

import { useTheme } from '../constants/theme';
import { TabParamList } from '../types';
import { hapticLight } from '../utils/haptics';
import HomeScreen from '../screens/HomeScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import DelivererQueueScreen from '../screens/DelivererQueueScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const t = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.colors.tabBar,
          borderTopColor: t.colors.divider,
        },
        tabBarActiveTintColor: t.colors.tabBarActive,
        tabBarInactiveTintColor: t.colors.tabBarInactive,
      }}
      screenListeners={{
        tabPress: () => hapticLight(),
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="list-alt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DeliverTab"
        component={DelivererQueueScreen}
        options={{
          tabBarLabel: 'Deliver',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="shipping-fast" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
