import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CanteenSelectScreen from '../screens/CanteenSelectScreen';
import CanteenWebViewScreen from '../screens/CanteenWebViewScreen';
import OrderConfirmScreen from '../screens/OrderConfirmScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import DelivererQueueScreen from '../screens/DelivererQueueScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import MyDeliveriesScreen from '../screens/MyDeliveriesScreen';

import ChatScreen from '../screens/ChatScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import LuckyDrawWheelScreen from '../screens/LuckyDrawWheelScreen';
import USTDashScreen from '../screens/USTDashScreen';
import GroupOrdersHallBoardScreen from '../screens/GroupOrdersHallBoardScreen';
import GroupOrderDetailScreen from '../screens/GroupOrderDetailScreen';
import GroupOrderJoinScreen from '../screens/GroupOrderJoinScreen';
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : !user?.profile_completed ? (
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      ) : (

        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CanteenSelect" component={CanteenSelectScreen} />
          <Stack.Screen name="CanteenWebView" component={CanteenWebViewScreen} />
          <Stack.Screen name="OrderConfirm" component={OrderConfirmScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="DelivererQueue" component={DelivererQueueScreen} />
          <Stack.Screen name="MyDeliveries" component={MyDeliveriesScreen} />
          <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
          <Stack.Screen name="ChatScreen" component={ChatScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="LuckyDrawWheel" component={LuckyDrawWheelScreen} />
          <Stack.Screen name="USTDash" component={USTDashScreen} />
          <Stack.Screen name="GroupOrdersHallBoard" component={GroupOrdersHallBoardScreen} />
          <Stack.Screen name="GroupOrderDetail" component={GroupOrderDetailScreen} />
          <Stack.Screen name="GroupOrderJoin" component={GroupOrderJoinScreen} />
        </>

      )}
    </Stack.Navigator>
  );
}
