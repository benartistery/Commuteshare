import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
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

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  quantity: number;
  views: number;
  is_available: boolean;
  created_at: string;
}

export default function MyListingsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      const response = await api.get('/my-products');
      setProducts(response.data);
    } catch (error) {
      console.log('Error loading products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const deleteProduct = async (productId: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/products/${productId}`);
              loadProducts();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <View style={styles.productRow}>
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.productPrice}>₦{item.price.toLocaleString()}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={12} color={COLORS.textMuted} />
              <Text style={styles.statText}>{item.views}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="layers" size={12} color={COLORS.textMuted} />
              <Text style={styles.statText}>{item.quantity} left</Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.is_available ? COLORS.success + '20' : COLORS.error + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.is_available ? COLORS.success : COLORS.error }
              ]}>
                {item.is_available ? 'Active' : 'Sold'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteProduct(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return <LoadingScreen message="Loading your listings..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity onPress={() => router.push('/create-listing')}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProducts();
            }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title="No Listings Yet"
            description="Start selling by creating your first listing"
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
  productCard: {
    marginBottom: SPACING.md,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginRight: SPACING.md,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
