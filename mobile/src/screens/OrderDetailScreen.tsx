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
import { FontAwesome5 } from '@expo/vector-icons';
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
import { useTheme } from '../constants/theme';
import { formatPrice, formatPriceHK } from '../utils/formatPrice';
import AppHeader from '../components/AppHeader';
type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const t = useTheme();
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
      <View style={[styles.center, { backgroundColor: t.colors.bg }]}>
        <ActivityIndicator size="large" color={t.colors.accent} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.bg }]}>
        <Text style={{ color: t.colors.text }}>Order not found</Text>
      </View>
    );
  }

  const isOrderer = user?.id === order.orderer_id;
  const isDeliverer = user?.id === order.deliverer_id;

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return t.colors.statusPending;
      case 'accepted': return t.colors.statusAccepted;
      case 'picked_up': return t.colors.statusPickedUp;
      case 'delivered': return t.colors.statusDelivered;
      case 'cancelled': return t.colors.statusCancelled;
default: return t.colors.subtext;
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

  const renderProgressStepper = () => {
    if (order.status === 'cancelled') {
      return (
        <View style={styles.stepperCancelled}>
          <FontAwesome5 name="times-circle" solid size={20} color={t.colors.danger} />
          <Text style={[t.typography.subhead, { color: t.colors.danger, marginLeft: 8 }]}>
            Order Cancelled
          </Text>
          {order.cancelled_at && (
            <Text style={[t.typography.caption, { color: t.colors.subtext, marginLeft: 8 }]}>
              {formatDate(order.cancelled_at)}
            </Text>
          )}
        </View>
      );
    }

    const steps = [
      { label: 'Created', icon: 'plus-circle', date: order.created_at },
      { label: 'Accepted', icon: 'handshake', date: order.accepted_at },
      { label: 'Picked Up', icon: 'box', date: order.picked_up_at },
      { label: 'Delivered', icon: 'check-circle', date: order.delivered_at },
    ];

    const statusOrder: OrderStatus[] = ['pending', 'accepted', 'picked_up', 'delivered'];
    const currentIdx = statusOrder.indexOf(order.status);

    return (
      <View style={styles.stepperContainer}>
        {steps.map((step, index) => {
          const isCompleted = index < currentIdx + 1;
          const isActive = index === currentIdx;
          const isFuture = index > currentIdx;
          const dotColor = isCompleted ? t.colors.success : isFuture ? t.colors.muted : t.colors.success;

          return (
            <View key={step.label} style={styles.stepperStep}>
              <View style={styles.stepperDotRow}>
                {index > 0 && (
                  <View
                    style={[
                      styles.stepperLine,
                      { backgroundColor: isCompleted ? t.colors.success : t.colors.muted + '40' },
                    ]}
                  />
                )}
                <Animated.View
                  style={[
                    styles.stepperDot,
                    {
                      backgroundColor: isCompleted ? t.colors.success : 'transparent',
                      borderColor: dotColor,
                      borderWidth: 2,
                    },
                    isActive && {
                      transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1.15] }) }],
                    },
                  ]}
                >
                  {isCompleted && (
                    <FontAwesome5 name="check" solid size={10} color="#FFFFFF" />
                  )}
                </Animated.View>
                {index < steps.length - 1 && (
                  <View
                    style={[
                      styles.stepperLine,
                      { backgroundColor: index < currentIdx ? t.colors.success : t.colors.muted + '40' },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  t.typography.caption,
                  {
                    color: isCompleted || isActive ? t.colors.text : t.colors.subtext,
                    fontWeight: isActive ? '700' : '400',
                    marginTop: 6,
                    textAlign: 'center',
                  },
                ]}
              >
                {step.label}
              </Text>
              {step.date && (
                <Text style={[t.typography.caption2, { color: t.colors.subtext, marginTop: 2, textAlign: 'center' }]}>
                  {formatDate(step.date)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Order Details" onBack={navigation.goBack} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '18', borderRadius: t.radius.pill }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBannerText, { color: statusColor }]}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        {/* Main Info Card */}
        <View style={[styles.card, { 
          backgroundColor: t.colors.card, 
          borderRadius: t.radius.lg,
          ...t.shadow.card 
        }]}>
          <Text style={[styles.canteenTitle, { color: t.colors.text }]}>{order.canteen}</Text>
          <View style={[styles.divider, { backgroundColor: t.colors.bg }]} />
          
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemQty, { color: t.colors.accent }]}>{item.qty}x</Text>
                <Text style={[styles.itemName, { color: t.colors.text }]}>{item.name}</Text>
              </View>
              <Text style={[styles.itemPrice, { color: t.colors.text }]}>{formatPrice(item.price)}</Text>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: t.colors.bg, marginTop: 12 }]} />
          
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: t.colors.text }]}>Total</Text>
            <Text style={[styles.totalPrice, { color: t.colors.accent }]}>{formatPriceHK(order.total_price)}</Text>
          </View>
        </View>

        {/* Delivery Info */}
        {/* Delivery Info */}
        <View style={[styles.section, { 
          backgroundColor: t.colors.card, 
          borderRadius: t.radius.lg,
          ...t.shadow.card 
        }]}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="map-marker-alt" size={12} color={t.colors.subtext} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: t.colors.subtext, marginBottom: 0 }]}>DELIVERY DETAILS</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: t.colors.subtext }]}>Destination</Text>
            <Text style={[styles.detailValue, { color: t.colors.text }]}>{order.delivery_hall}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: t.colors.subtext }]}>Note</Text>
            <Text style={[styles.detailValue, { color: t.colors.text, fontStyle: order.note ? 'normal' : 'italic' }]}>
              {order.note || 'None'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: t.colors.subtext }]}>Orderer</Text>
            <Text style={[styles.detailValue, { color: t.colors.text }]}>
              {order.orderer_nickname} {isOrderer ? '(You)' : ''}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: t.colors.subtext }]}>Deliverer</Text>
            <Text style={[styles.detailValue, { color: t.colors.text }]}>
              {order.deliverer_nickname || 'Waiting for pickup...'} {isDeliverer ? '(You)' : ''}
            </Text>
          </View>
        </View>

        {/* QR Code Section - Show to orderer and deliverer */}
        {/* QR Code Section - Show to orderer and deliverer */}
        {order.qr_code_image && (isOrderer || isDeliverer) && (
          <View style={[styles.section, { 
            backgroundColor: t.colors.card, 
            borderRadius: t.radius.lg,
            ...t.shadow.card 
          }]}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="qrcode" size={12} color={t.colors.subtext} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: t.colors.subtext, marginBottom: 0 }]}>ORDER QR CODE</Text>
            </View>
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
        {/* Timeline */}
        <View style={[styles.section, { 
          backgroundColor: t.colors.card, 
          borderRadius: t.radius.lg,
          ...t.shadow.card 
        }]}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="clock" size={12} color={t.colors.subtext} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: t.colors.subtext, marginBottom: 0 }]}>PROGRESS</Text>
          </View>
          {renderProgressStepper()}
        </View>

        {/* Chat Button - Only for accepted/picked_up orders with deliverer */}
        {/* Chat Button - Only for accepted/picked_up orders with deliverer */}
        {(order.status === 'accepted' || order.status === 'picked_up') && order.deliverer_id && (
          <View style={[styles.section, { 
            backgroundColor: t.colors.card, 
            borderRadius: t.radius.lg,
            ...t.shadow.card 
          }]}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: t.colors.accent, borderRadius: t.radius.lg }]}
              onPress={() => navigation.navigate('ChatScreen', { orderId: order.id })}
            >
              <FontAwesome5 name="comments" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Open Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {isDeliverer && !order.group_order_id && order.is_group_open && order.status === 'accepted' && (
          <View style={[styles.section, { 
            backgroundColor: t.colors.card, 
            borderRadius: t.radius.lg,
            ...t.shadow.card 
          }]}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: t.colors.purple, borderRadius: t.radius.lg }]}
              onPress={() => navigation.navigate('GroupOrderDetail', { rootOrderId: order.id })}
            >
              <FontAwesome5 name="user-friends" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Group Requests</Text>
            </TouchableOpacity>
          </View>
        )}

        {isOrderer && (order.status === 'pending' || order.status === 'accepted' || order.status === 'picked_up') && (
          <View style={[styles.section, { 
            backgroundColor: t.colors.card, 
            borderRadius: t.radius.lg,
            ...t.shadow.card 
          }]}>
            <TouchableOpacity
              style={[styles.ustDashButton, { backgroundColor: t.colors.orange, borderRadius: t.radius.lg }]}
              onPress={() => navigation.navigate('USTDash', { orderId: order.id })}
            >
              <FontAwesome5 name="gamepad" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Play UST Dash</Text>
            </TouchableOpacity>
            <Text style={[styles.ustDashHint, { color: t.colors.subtext }]}>
              Kill time while waiting for your order!
            </Text>
          </View>
        )}

        {/* Rating Section - Only for delivered orders */}
        {/* Rating Section - Only for delivered orders */}
        {order.status === 'delivered' && (
          <View style={[styles.section, { 
            backgroundColor: t.colors.card, 
            borderRadius: t.radius.lg,
            ...t.shadow.card 
          }]}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="star" size={12} color={t.colors.subtext} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: t.colors.subtext, marginBottom: 0 }]}>RATING</Text>
            </View>
            
            {userRating ? (
              <View>
                <Text style={[styles.ratingLabel, { color: t.colors.text }]}>You rated this order:</Text>
                <View style={styles.ratingContainer}>
                  <StarRating rating={userRating.stars} disabled={true} size={32} />
                </View>
                {userRating.feedback && (
                  <View style={[styles.feedbackContainer, { backgroundColor: t.colors.bg }]}>
                    <Text style={[styles.feedbackText, { color: t.colors.text }]}>"{userRating.feedback}"</Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text style={[styles.ratingLabel, { color: t.colors.text }]}>Rate your experience:</Text>
                <View style={styles.ratingContainer}>
                  <StarRating 
                    rating={ratingStars} 
                    onRate={setRatingStars} 
                    size={40} 
                  />
                </View>
                
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: t.colors.bg, 
                    color: t.colors.text,
                    borderColor: t.colors.subtext + '40'
                  }]}
                  placeholder="Optional feedback..."
                  placeholderTextColor={t.colors.subtext}
                  value={ratingFeedback}
                  onChangeText={setRatingFeedback}
                  multiline
                  maxLength={200}
                />
                
<TouchableOpacity
style={[styles.submitButton, { backgroundColor: t.colors.accent }]}
onPress={handleSubmitRating}
disabled={submittingRating}
>
{submittingRating ? (
<ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <FontAwesome5 name="paper-plane" size={14} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Submit Rating</Text>
                    </View>
)}
</TouchableOpacity>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { backgroundColor: t.colors.card, borderTopColor: t.colors.bg }]}>
        {actionLoading ? (
          <ActivityIndicator color={t.colors.accent} />
        ) : (
          <>
            {!isOrderer && order.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: t.colors.accent, borderRadius: t.radius.lg }]}
                onPress={() => handleAction('accepted', acceptOrder)}
              >
                <FontAwesome5 name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Accept Order</Text>
              </TouchableOpacity>
            )}

            {isDeliverer && order.status === 'accepted' && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: t.colors.statusPickedUp, borderRadius: t.radius.lg }]}
                onPress={() => handleAction('picked up', pickupOrder)}
              >
                <FontAwesome5 name="box" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Mark as Picked Up</Text>
              </TouchableOpacity>
            )}

            {isDeliverer && order.status === 'picked_up' && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: t.colors.statusDelivered, borderRadius: t.radius.lg }]}
                onPress={() => handleAction('delivered', deliverOrder)}
              >
                <FontAwesome5 name="truck" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Mark as Delivered</Text>
              </TouchableOpacity>
            )}

            {isOrderer && (order.status === 'pending' || order.status === 'accepted') && (
              <TouchableOpacity 
                style={[styles.button, { 
                  backgroundColor: t.colors.bg, 
                  borderColor: t.colors.danger, 
                  borderWidth: 1,
                  borderRadius: t.radius.lg 
                }]}
                onPress={() => handleAction('cancelled', cancelOrder, 'Are you sure you want to cancel this order?')}
              >
                <FontAwesome5 name="times" size={16} color={t.colors.danger} style={{ marginRight: 8 }} />
                <Text style={[styles.buttonText, { color: t.colors.danger }]}>Cancel Order</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusBanner: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  card: {
    padding: 16,
    marginBottom: 16,
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
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
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
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  stepperStep: {
    flex: 1,
    alignItems: 'center',
  },
  stepperDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepperDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLine: {
    flex: 1,
    height: 2,
  },
  stepperCancelled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: 24, // extra padding for safe area
  },
  button: {
    paddingVertical: 14,
    flexDirection: 'row',
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
  },
  ustDashButton: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ustDashHint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
});
