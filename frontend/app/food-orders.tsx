import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/theme';
import { Card } from '../src/components/common/Card';
import { EmptyState } from '../src/components/common/EmptyState';
import { LoadingScreen } from '../src/components/common/LoadingScreen';
import api from '../src/api/client';

interface FoodOrder {
  id: string;
  restaurant_name: string;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  delivery_address: string;
  status: string;
  created_at: string;
}

export default function FoodOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const response = await api.get('/food-orders');
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
      case 'preparing': return COLORS.accent;
      case 'ready': return COLORS.secondary;
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
      case 'preparing': return 'restaurant';
      case 'ready': return 'checkmark-done';
      case 'in_transit': return 'bicycle';
      case 'delivered': return 'checkmark-done-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderCard = ({ item }: { item: FoodOrder }) => (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={14} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.itemsContainer}>
        {item.items.map((orderItem, index) => (
          <Text key={index} style={styles.itemText}>
            {orderItem.quantity}x {orderItem.name}
          </Text>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={14} color={COLORS.textMuted} />
          <Text style={styles.addressText} numberOfLines={1}>{item.delivery_address}</Text>
        </View>
        <Text style={styles.totalAmount}>₦{item.total_amount.toLocaleString()}</Text>
      </View>
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
        <Text style={styles.headerTitle}>Food Orders</Text>
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
            icon="fast-food-outline"
            title="No Orders Yet"
            description="Order delicious food from nearby restaurants"
            actionLabel="Browse Restaurants"
            onAction={() => router.push('/(tabs)/food')}
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
    marginBottom: SPACING.sm,
  },
  restaurantName: {
    fontSize: FONT_SIZE.lg,
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
  itemsContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  itemText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  addressText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    flex: 1,
  },
  totalAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
});
