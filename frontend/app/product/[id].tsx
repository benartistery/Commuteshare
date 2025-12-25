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
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';

interface Product {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  location?: string;
  quantity: number;
  views: number;
  created_at: string;
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load product');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!product) return;
    
    if (product.seller_id === user?.id) {
      Alert.alert('Error', "You can't buy your own product");
      return;
    }

    if ((user?.wallet_balance || 0) < product.price) {
      Alert.alert(
        'Insufficient Balance',
        'Please add funds to your wallet to complete this purchase.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Funds', onPress: () => router.push('/(tabs)/wallet') },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Are you sure you want to buy "${product.title}" for ₦${product.price.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy Now',
          onPress: async () => {
            setPurchasing(true);
            try {
              await api.post('/orders', {
                product_id: product.id,
                quantity: 1,
              });
              Alert.alert('Success', 'Order placed successfully!', [
                { text: 'OK', onPress: () => router.push('/orders') },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to place order');
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return <LoadingScreen message="Loading product..." />;
  }

  if (!product) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          {product.images && product.images.length > 0 ? (
            <>
              <Image
                source={{ uri: product.images[currentImageIndex] }}
                style={styles.mainImage}
                resizeMode="cover"
              />
              {product.images.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.thumbnailRow}
                >
                  {product.images.map((img, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setCurrentImageIndex(index)}
                      style={[
                        styles.thumbnail,
                        currentImageIndex === index && styles.thumbnailActive,
                      ]}
                    >
                      <Image source={{ uri: img }} style={styles.thumbnailImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={80} color={COLORS.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title & Price */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{product.title}</Text>
            <Text style={styles.price}>₦{product.price.toLocaleString()}</Text>
          </View>

          {/* Meta Info */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag" size={16} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{product.condition}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="layers" size={16} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{product.quantity} available</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye" size={16} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{product.views} views</Text>
            </View>
          </View>

          {/* Seller Card */}
          <Card style={styles.sellerCard}>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerAvatar}>
                <Ionicons name="person" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{product.seller_name}</Text>
                <Text style={styles.sellerMeta}>Listed on {formatDate(product.created_at)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.messageButton}>
              <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </Card>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {product.description || 'No description provided.'}
            </Text>
          </View>

          {/* Location */}
          {product.location && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={18} color={COLORS.textSecondary} />
                <Text style={styles.locationText}>{product.location}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      {product.seller_id !== user?.id && (
        <View style={styles.bottomBar}>
          <View style={styles.priceContainer}>
            <Text style={styles.bottomPrice}>₦{product.price.toLocaleString()}</Text>
            <Text style={styles.bottomLabel}>Price</Text>
          </View>
          <Button
            title="Buy Now"
            onPress={handlePurchase}
            loading={purchasing}
            size="large"
            style={styles.buyButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surface + 'E0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surface + 'E0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGallery: {
    backgroundColor: COLORS.surfaceLight,
  },
  mainImage: {
    width: '100%',
    height: 300,
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  thumbnailActive: {
    borderColor: COLORS.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: SPACING.lg,
  },
  titleSection: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  price: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sellerDetails: {},
  sellerName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  sellerMeta: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  messageButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceContainer: {
    flex: 1,
  },
  bottomPrice: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bottomLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  buyButton: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});
