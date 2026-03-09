import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
  Image
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RootStackParamList, Order, OrderStatus, Rating } from '../types';
import { submitRating, getOrderRatings } from '../api/ratings';
import StarRating from '../components/StarRating';
import { 
  getOrderDetail, 
  acceptOrder, 
  pickupOrder, 
  deliverOrder, 
  cancelOrder 
} from '../api/orders';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const COLORS_LIGHT = { 
  bg: '#f5f5f5', 
  card: '#fff', 
  text: '#333', 
  sub: '#666', 
  accent: '#003366',
  error: '#f44336',
  success: '#4caf50'
};

const COLORS_DARK = { 
  bg: '#1a1a2e', 
  card: '#16213e', 
  text: '#eee', 
  sub: '#aaa', 
  accent: '#0f3460',
  error: '#ff6b6b',
  success: '#66bb6a'
};

export default function OrderDetailScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const { showToast } = useToast();
  const [prevStatus, setPrevStatus] = useState<OrderStatus | null>(null);

  const isDark = user?.dark_mode ?? false;
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);
  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrderDetail(orderId);
      setOrder(data);
      setPrevStatus(data.status);
      
      if (data.status === 'delivered' && user) {
        try {
          const ratings = await getOrderRatings(orderId);
          const myRating = ratings.find(r => r.rater_id === user.id);
          if (myRating) {
            setUserRating(myRating);
            setRatingStars(myRating.stars);
          }
        } catch (e) {
          console.log('Failed to fetch ratings', e);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load order details');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, navigation]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);
  // Polling for status updates
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (order && order.status !== 'delivered' && order.status !== 'cancelled') {
      interval = setInterval(async () => {
        try {
          const updated = await getOrderDetail(orderId);
          
          if (updated.status !== order.status) {
            const statusText = updated.status.replace('_', ' ').toUpperCase();
            let type: 'info' | 'success' | 'warning' = 'info';
            
            if (updated.status === 'delivered') type = 'success';
            else if (updated.status === 'cancelled') type = 'warning';
            
            showToast(`Order status updated: ${statusText}`, type);
          }
          setOrder(updated);
          setPrevStatus(updated.status);
        } catch (e) {
          console.log('Polling error', e);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [order?.status, orderId, showToast]);


  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const handleAction = async (
    actionName: string, 
    apiCall: (id: string) => Promise<Order>,
    confirmMessage?: string
  ) => {
    if (confirmMessage) {
      Alert.alert(
        'Confirm Action',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            style: 'destructive', 
            onPress: () => executeAction(actionName, apiCall) 
          }
        ]
      );
    } else {
      executeAction(actionName, apiCall);
    }
  };

  const executeAction = async (actionName: string, apiCall: (id: string) => Promise<Order>) => {
    try {
      setActionLoading(true);
      const updatedOrder = await apiCall(orderId);
      setOrder(updatedOrder);
      Alert.alert('Success', `Order ${actionName} successfully`);
    } catch (error) {
      Alert.alert('Error', `Failed to ${actionName} order`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (ratingStars === 0) {
      Alert.alert('Error', 'Please select a star rating');
      return;
    }
    
    try {
      setSubmittingRating(true);
      const newRating = await submitRating(orderId, {
        stars: ratingStars,
        feedback: ratingFeedback.trim() || null
      });
      setUserRating(newRating);
      Alert.alert('Success', 'Rating submitted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>Order not found</Text>
      </View>
    );
  }

  const isOrderer = user?.id === order.orderer_id;
  const isDeliverer = user?.id === order.deliverer_id;

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'accepted': return '#2196f3';
      case 'picked_up': return '#9c27b0';
      case 'delivered': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return colors.sub;
    }
  };

  const statusColor = getStatusColor(order.status);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderTimelineItem = (label: string, date: string | null, index: number, total: number, state: 'completed' | 'active' | 'future' | 'cancelled') => {
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const isActive = state === 'active';
    const isCompleted = state === 'completed';
    const isCancelled = state === 'cancelled';
    const isFuture = state === 'future';

    let dotColor = colors.sub;
    if (isCompleted || isActive) dotColor = colors.success;
    if (isCancelled) dotColor = colors.error;
    if (isFuture) dotColor = colors.sub;

    const lineColor = isCompleted ? colors.success : colors.sub;

    return (
      <View key={label} style={styles.timelineItem}>
        <View style={{ alignItems: 'center', marginRight: 12 }}>
          {/* Dot */}
          <Animated.View style={[
            styles.timelineDot, 
            { backgroundColor: dotColor, marginRight: 0 },
            isActive && { 
              opacity: pulseAnim,
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1.2] }) }]
            }
          ]} />
          
          {/* Connecting Line (Going Down) */}
          {!isLast && (
            <View style={{
              position: 'absolute',
              top: 16, // marginTop(6) + height(10)
              bottom: -22, // Extend through marginBottom(16) + next marginTop(6)
              width: 2,
              backgroundColor: lineColor,
              zIndex: -1
            }} />
          )}
        </View>

        <View style={styles.timelineContent}>
          <Text style={[
            styles.timelineLabel, 
            { color: (isActive || isCompleted) ? colors.text : colors.sub },
            isActive && { fontWeight: 'bold' }
          ]}>
            {label}
          </Text>
          {date && <Text style={[styles.timelineDate, { color: colors.sub }]}>{formatDate(date)}</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusBannerText, { color: statusColor }]}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        {/* Main Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.canteenTitle, { color: colors.text }]}>{order.canteen}</Text>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemQty, { color: colors.accent }]}>{item.qty}x</Text>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.text }]}>${item.price}</Text>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.bg, marginTop: 12 }]} />
          
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalPrice, { color: colors.accent }]}>HK${order.total_price.toFixed(1)}</Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.sub }]}>DELIVERY DETAILS</Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.sub }]}>Destination</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{order.delivery_hall}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.sub }]}>Note</Text>
            <Text style={[styles.detailValue, { color: colors.text, fontStyle: order.note ? 'normal' : 'italic' }]}>
              {order.note || 'None'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.sub }]}>Orderer</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {order.orderer_nickname} {isOrderer ? '(You)' : ''}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.sub }]}>Deliverer</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {order.deliverer_nickname || 'Waiting for pickup...'} {isDeliverer ? '(You)' : ''}
            </Text>
          </View>
        </View>

        {/* QR Code Section - Show to orderer and deliverer */}
        {order.qr_code_image && (isOrderer || isDeliverer) && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.sub }]}>ORDER QR CODE</Text>
            <View style={styles.qrContainer}>
              <Image
                source={{ uri: order.qr_code_image }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.sub }]}>TIMELINE</Text>
          <View style={styles.timeline}>
            {(() => {
              if (order.status === 'cancelled') {
                return [
                  renderTimelineItem('Created', order.created_at, 0, 2, 'completed'),
                  renderTimelineItem('Cancelled', order.cancelled_at, 1, 2, 'cancelled')
                ];
              }

              const steps = [
                { label: 'Created', date: order.created_at },
                { label: 'Accepted', date: order.accepted_at },
                { label: 'Picked Up', date: order.picked_up_at },
                { label: 'Delivered', date: order.delivered_at },
              ];

              const statusOrder = ['pending', 'accepted', 'picked_up', 'delivered'];
              const currentStatusIndex = statusOrder.indexOf(order.status);

              return steps.map((step, index) => {
                let state: 'completed' | 'active' | 'future' = 'future';
                if (index < currentStatusIndex) state = 'completed';
                else if (index === currentStatusIndex) state = 'active';
                
                return renderTimelineItem(step.label, step.date, index, steps.length, state);
              });
            })()}
          </View>
        </View>

        {/* Chat Button - Only for accepted/picked_up orders with deliverer */}
        {(order.status === 'accepted' || order.status === 'picked_up') && order.deliverer_id && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('ChatScreen', { orderId: order.id })}
            >
              <Text style={styles.buttonText}>Open Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rating Section - Only for delivered orders */}
        {order.status === 'delivered' && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.sub }]}>RATING</Text>
            
            {userRating ? (
              <View>
                <Text style={[styles.ratingLabel, { color: colors.text }]}>You rated this order:</Text>
                <View style={styles.ratingContainer}>
                  <StarRating rating={userRating.stars} disabled={true} size={32} />
                </View>
                {userRating.feedback && (
                  <View style={[styles.feedbackContainer, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.feedbackText, { color: colors.text }]}>"{userRating.feedback}"</Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text style={[styles.ratingLabel, { color: colors.text }]}>Rate your experience:</Text>
                <View style={styles.ratingContainer}>
                  <StarRating 
                    rating={ratingStars} 
                    onRate={setRatingStars} 
                    size={40} 
                  />
                </View>
                
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.bg, 
                    color: colors.text,
                    borderColor: colors.sub + '40'
                  }]}
                  placeholder="Optional feedback..."
                  placeholderTextColor={colors.sub}
                  value={ratingFeedback}
                  onChangeText={setRatingFeedback}
                  multiline
                  maxLength={200}
                />
                
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.accent }]}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Submit Rating</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.bg }]}>
        {actionLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            {!isOrderer && order.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: colors.accent }]}
                onPress={() => handleAction('accepted', acceptOrder)}
              >
                <Text style={styles.buttonText}>Accept Order</Text>
              </TouchableOpacity>
            )}

            {isDeliverer && order.status === 'accepted' && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: '#9c27b0' }]}
                onPress={() => handleAction('picked up', pickupOrder)}
              >
                <Text style={styles.buttonText}>Mark as Picked Up</Text>
              </TouchableOpacity>
            )}

            {isDeliverer && order.status === 'picked_up' && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: '#4caf50' }]}
                onPress={() => handleAction('delivered', deliverOrder)}
              >
                <Text style={styles.buttonText}>Mark as Delivered</Text>
              </TouchableOpacity>
            )}

            {isOrderer && (order.status === 'pending' || order.status === 'accepted') && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: colors.bg, borderColor: colors.error, borderWidth: 1 }]}
                onPress={() => handleAction('cancelled', cancelOrder, 'Are you sure you want to cancel this order?')}
              >
                <Text style={[styles.buttonText, { color: colors.error }]}>Cancel Order</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusBanner: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  canteenTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  itemQty: {
    fontWeight: 'bold',
    marginRight: 8,
    width: 30,
  },
  itemName: {
    flex: 1,
  },
  itemPrice: {
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    opacity: 0.7,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineDate: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: 24, // extra padding for safe area
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    fontSize: 14,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  feedbackText: {
    fontStyle: 'italic',
    fontSize: 14,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 8,
  },
  qrImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
  }
});
