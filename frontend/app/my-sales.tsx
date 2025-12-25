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

interface Sale {
  id: string;
  buyer_name: string;
  product_title: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function MySalesScreen() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSales = async () => {
    try {
      const response = await api.get('/orders/sales');
      setSales(response.data);
    } catch (error) {
      console.log('Error loading sales:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSales();
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

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status?status=${status}`);
      loadSales();
      Alert.alert('Success', `Order ${status}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderSaleCard = ({ item }: { item: Sale }) => (
    <Card style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <View>
          <Text style={styles.productTitle} numberOfLines={1}>{item.product_title}</Text>
          <Text style={styles.buyerName}>Buyer: {item.buyer_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.saleDetails}>
        <Text style={styles.quantity}>Qty: {item.quantity}</Text>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        <Text style={styles.amount}>₦{item.total_amount.toLocaleString()}</Text>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.confirmBtn]}
            onPress={() => updateStatus(item.id, 'confirmed')}
          >
            <Text style={styles.actionBtnText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.transitBtn]}
            onPress={() => updateStatus(item.id, 'in_transit')}
          >
            <Text style={styles.actionBtnText}>Ship</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'confirmed' && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.transitBtn, { flex: 1 }]}
          onPress={() => updateStatus(item.id, 'in_transit')}
        >
          <Text style={styles.actionBtnText}>Mark as Shipped</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  if (loading) {
    return <LoadingScreen message="Loading sales..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Sales</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={sales}
        renderItem={renderSaleCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSales();
            }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="trending-up-outline"
            title="No Sales Yet"
            description="List products to start selling"
            actionLabel="Create Listing"
            onAction={() => router.push('/create-listing')}
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
  saleCard: {
    marginBottom: SPACING.md,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  productTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  buyerName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  quantity: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  date: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  amount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
  },
  transitBtn: {
    backgroundColor: COLORS.accent,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});
