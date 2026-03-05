export interface UserProfile {
  id: string;
  email: string;
  nickname: string | null;
  dorm_hall: string | null;
  order_times: string[] | null;
  pref_take_order_location: string | null;
  pref_delivery_habit: string | null;
  is_deliverer: boolean;
  available_return_times: string[] | null;
  preferred_delivery_halls: string[] | null;
  dark_mode: boolean;
  profile_completed: boolean;
}

export interface ProfileSetupPayload {
  nickname: string;
  dorm_hall: string;
  order_times: string[];
  pref_take_order_location: string;
  pref_delivery_habit: string;
  is_deliverer: boolean;
  available_return_times?: string[];
  preferred_delivery_halls?: string[];
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSetup: undefined;
  Dashboard: undefined;
};
