export type OrderStatus = 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  orderer_id: string;
  deliverer_id: string | null;
  status: OrderStatus;
  canteen: string;
  items: OrderItem[];
  total_price: number;
  delivery_hall: string;
  delivery_preference: string;
  qr_code_image: string | null;
  qr_code_data: string | null;
  note: string | null;
  orderer_nickname: string;
  deliverer_nickname: string | null;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  order_id: string | null;
  created_at: string;
}

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
  credits: number;
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
export interface Rating {
  id: string;
  order_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  feedback: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_nickname: string;
  content: string;
  message_type: 'text' | 'system';
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  nickname: string;
  value: number;
  total_orders?: number;
  total_ratings?: number;
}

export interface LeaderboardResponse {
  top_orderers: LeaderboardEntry[];
  top_deliverers: LeaderboardEntry[];
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSetup: undefined;
  EditProfile: undefined;
  Dashboard: undefined;
  CanteenSelect: undefined;
  CanteenWebView: { canteen: string; url: string };
  OrderConfirm: {
    items: OrderItem[];
    totalPrice: number;
    canteen: string;
    qrCodeImage: string | null;
    qrCodeData: string | null;
  };
  OrderDetail: { orderId: string };
  DelivererQueue: undefined;
  ChatScreen: { orderId: string };
  MyOrders: undefined;
  MyDeliveries: undefined;
  Leaderboard: { initialTab?: 'orderers' | 'deliverers' } | undefined;
};
