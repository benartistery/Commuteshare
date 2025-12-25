import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants/theme';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';

interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  cuisine_type: string;
  address: string;
  phone: string;
  opening_hours?: string;
  image?: string;
  rating: number;
  total_reviews: number;
  is_open: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  is_available: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    loadRestaurant();
  }, [id]);

  const loadRestaurant = async () => {
    try {
      const [restaurantRes, menuRes] = await Promise.all([
        api.get(`/restaurants/${id}`),
        api.get(`/restaurants/${id}/menu`),
      ]);
      setRestaurant(restaurantRes.data);
      setMenuItems(menuRes.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load restaurant');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const getCartTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 200;
    return { subtotal, deliveryFee, total: subtotal + deliveryFee };
  };

  const placeOrder = async () => {
    if (!restaurant || cart.length === 0) return;

    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
      return;
    }

    const { total } = getCartTotal();
    if ((user?.wallet_balance || 0) < total) {
      Alert.alert(
        'Insufficient Balance',
        'Please add funds to your wallet.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Funds', onPress: () => router.push('/(tabs)/wallet') },
        ]
      );
      return;
    }

    setOrdering(true);
    try {
      await api.post('/food-orders', {
        restaurant_id: restaurant.id,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
        })),
        delivery_address: deliveryAddress,
      });
      setCart([]);
      Alert.alert('Success', 'Order placed successfully!', [
        { text: 'OK', onPress: () => router.push('/food-orders') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to place order');
    } finally {
      setOrdering(false);
    }
  };

  const getItemQuantity = (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    return item?.quantity || 0;
  };

  if (loading) {
    return <LoadingScreen message="Loading restaurant..." />;
  }

  if (!restaurant) {
    return null;
  }

  const { subtotal, deliveryFee, total } = getCartTotal();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Image */}
        {restaurant.image ? (
          <Image source={{ uri: restaurant.image }} style={styles.restaurantImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="restaurant" size={60} color={COLORS.textMuted} />
          </View>
        )}

        {/* Restaurant Info */}
        <View style={styles.infoSection}>
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color={COLORS.accent} />
              <Text style={styles.ratingText}>
                {restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'New'}
              </Text>
            </View>
            <Text style={styles.cuisineType}>{restaurant.cuisine_type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: restaurant.is_open ? COLORS.success : COLORS.error }]}>
              <Text style={styles.statusText}>{restaurant.is_open ? 'Open' : 'Closed'}</Text>
            </View>
          </View>

          <Text style={styles.description}>{restaurant.description}</Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location" size={16} color={COLORS.textMuted} />
              <Text style={styles.detailText}>{restaurant.address}</Text>
            </View>
            {restaurant.opening_hours && (
              <View style={styles.detailItem}>
                <Ionicons name="time" size={16} color={COLORS.textMuted} />
                <Text style={styles.detailText}>{restaurant.opening_hours}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menu</Text>
          {menuItems.length === 0 ? (
            <Card style={styles.emptyMenu}>
              <Ionicons name="restaurant-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No menu items yet</Text>
            </Card>
          ) : (
            menuItems.map((item) => (
              <Card key={item.id} style={styles.menuCard}>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                  <Text style={styles.menuItemPrice}>₦{item.price.toLocaleString()}</Text>
                </View>
                <View style={styles.quantityControls}>
                  {getItemQuantity(item.id) > 0 ? (
                    <>
                      <TouchableOpacity
                        style={styles.quantityBtn}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <Ionicons name="remove" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{getItemQuantity(item.id)}</Text>
                      <TouchableOpacity
                        style={styles.quantityBtn}
                        onPress={() => addToCart(item)}
                      >
                        <Ionicons name="add" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => addToCart(item)}
                    >
                      <Ionicons name="add" size={20} color={COLORS.white} />
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <View style={styles.cartSection}>
            <Text style={styles.sectionTitle}>Your Order</Text>
            <Card style={styles.cartCard}>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <Text style={styles.cartItemName}>{item.quantity}x {item.name}</Text>
                  <Text style={styles.cartItemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
                </View>
              ))}
              <View style={styles.cartDivider} />
              <View style={styles.cartRow}>
                <Text style={styles.cartLabel}>Subtotal</Text>
                <Text style={styles.cartValue}>₦{subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.cartRow}>
                <Text style={styles.cartLabel}>Delivery Fee</Text>
                <Text style={styles.cartValue}>₦{deliveryFee.toLocaleString()}</Text>
              </View>
              <View style={styles.cartDivider} />
              <View style={styles.cartRow}>
                <Text style={styles.cartTotal}>Total</Text>
                <Text style={styles.cartTotalValue}>₦{total.toLocaleString()}</Text>
              </View>

              <Input
                label="Delivery Address"
                placeholder="Enter your delivery address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                icon="location"
                containerStyle={{ marginTop: SPACING.md }}
              />

              <Button
                title={`Place Order - ₦${total.toLocaleString()}`}
                onPress={placeOrder}
                loading={ordering}
                size="large"
                variant="secondary"
                style={{ marginTop: SPACING.md }}
              />
            </Card>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  restaurantImage: {
    width: '100%',
    height: 200,
  },
  placeholderImage: {
    height: 200,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: SPACING.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  cuisineType: {
    fontSize: FONT_SIZE.md,
    color: COLORS.secondary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  description: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  detailsRow: {
    gap: SPACING.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  menuSection: {
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emptyMenu: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  menuItemDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  menuItemPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 24,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZE.sm,
  },
  cartSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  cartCard: {
    padding: SPACING.lg,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  cartItemName: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  cartItemPrice: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  cartDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  cartLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  cartValue: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  cartTotal: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  cartTotalValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
});
