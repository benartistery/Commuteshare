import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/theme';
import { Card } from '../src/components/common/Card';
import { EmptyState } from '../src/components/common/EmptyState';
import { LoadingScreen } from '../src/components/common/LoadingScreen';
import api from '../src/api/client';

interface Order {
  id: string;
  product_id: string;
  product_title: string;
  product_image?: string;
  seller_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.log('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'confirmed': return COLORS.primary;
      case 'in_transit': return COLORS.accent;
      case 'delivered': return COLORS.success;
      case 'cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time';
      case 'confirmed': return 'checkmark-circle';
      case 'in_transit': return 'bicycle';
      case 'delivered': return 'checkmark-done';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const confirmDelivery = async (orderId: string) => {
    Alert.alert(
      'Confirm Delivery',
      'Have you received this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: async () => {
            try {
              await api.put(`/orders/${orderId}/status?status=delivered`);
              loadOrders();
              Alert.alert('Success', 'Order confirmed as delivered');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to update');
            }
          },
        },
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={14} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.orderContent}>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.product_title}</Text>
          <Text style={styles.sellerName}>Seller: {item.seller_name}</Text>
          <Text style={styles.quantity}>Qty: {item.quantity} x ₦{item.unit_price.toLocaleString()}</Text>
        </View>
        <View style={styles.priceInfo}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>₦{item.total_amount.toLocaleString()}</Text>
        </View>
      </View>

      {item.status === 'in_transit' && (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => confirmDelivery(item.id)}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.white} />
          <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  if (loading) {
    return <LoadingScreen message="Loading orders..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOrders();
            }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bag-outline"
            title="No Orders Yet"
            description="Start shopping to see your orders here"
            actionLabel="Browse Marketplace"
            onAction={() => router.push('/(tabs)/marketplace')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  orderCard: {
    marginBottom: SPACING.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  orderId: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  orderDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  quantity: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  totalAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZE.md,
  },
});
