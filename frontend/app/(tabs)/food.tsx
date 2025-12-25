import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants/theme';
import { Card } from '../../src/components/common/Card';
import { EmptyState } from '../../src/components/common/EmptyState';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import api from '../../src/api/client';

interface Restaurant {
  id: string;
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

interface CuisineType {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const cuisineTypes: CuisineType[] = [
  { id: 'all', name: 'All', icon: 'restaurant' },
  { id: 'nigerian', name: 'Nigerian', icon: 'restaurant' },
  { id: 'continental', name: 'Continental', icon: 'globe' },
  { id: 'chinese', name: 'Chinese', icon: 'restaurant' },
  { id: 'fast_food', name: 'Fast Food', icon: 'fast-food' },
  { id: 'drinks', name: 'Drinks', icon: 'cafe' },
  { id: 'snacks', name: 'Snacks', icon: 'pizza' },
];

export default function FoodScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadRestaurants = async (cuisine?: string, search?: string) => {
    try {
      const params: any = {};
      if (cuisine && cuisine !== 'all') params.cuisine = cuisine;
      if (search) params.search = search;
      
      const response = await api.get('/restaurants', { params });
      setRestaurants(response.data);
    } catch (error) {
      console.log('Error loading restaurants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRestaurants(selectedCuisine, searchQuery);
  }, [selectedCuisine, searchQuery]);

  useEffect(() => {
    loadRestaurants(selectedCuisine, searchQuery);
  }, [selectedCuisine]);

  const handleSearch = () => {
    loadRestaurants(selectedCuisine, searchQuery);
  };

  const renderRestaurantCard = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => router.push(`/restaurant/${item.id}`)}
    >
      <View style={styles.restaurantImageContainer}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.restaurantImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="restaurant" size={40} color={COLORS.textMuted} />
          </View>
        )}
        <View style={[styles.statusBadge, !item.is_open && styles.closedBadge]}>
          <Text style={styles.statusText}>{item.is_open ? 'Open' : 'Closed'}</Text>
        </View>
      </View>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cuisineType}>{item.cuisine_type}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color={COLORS.accent} />
          <Text style={styles.ratingText}>
            {item.rating > 0 ? item.rating.toFixed(1) : 'New'}
          </Text>
          <Text style={styles.reviewCount}>({item.total_reviews} reviews)</Text>
        </View>
        <View style={styles.addressContainer}>
          <Ionicons name="location" size={12} color={COLORS.textMuted} />
          <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen message="Loading restaurants..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food Delivery</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/food-orders')}
          >
            <Ionicons name="receipt" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-restaurant')}
          >
            <Ionicons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              loadRestaurants(selectedCuisine);
            }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cuisine Types */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.cuisineContainer}
        contentContainerStyle={styles.cuisineContent}
      >
        {cuisineTypes.map((cuisine) => (
          <TouchableOpacity
            key={cuisine.id}
            style={[
              styles.cuisineChip,
              selectedCuisine === cuisine.id && styles.cuisineChipActive,
            ]}
            onPress={() => setSelectedCuisine(cuisine.id)}
          >
            <Ionicons
              name={cuisine.icon}
              size={16}
              color={selectedCuisine === cuisine.id ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.cuisineText,
                selectedCuisine === cuisine.id && styles.cuisineTextActive,
              ]}
            >
              {cuisine.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Restaurants List */}
      <FlatList
        data={restaurants}
        renderItem={renderRestaurantCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.restaurantsContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title="No Restaurants Found"
            description="Register your restaurant to start serving!"
            actionLabel="Add Restaurant"
            onAction={() => router.push('/add-restaurant')}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.sm,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  cuisineContainer: {
    maxHeight: 50,
    marginBottom: SPACING.md,
  },
  cuisineContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
    marginRight: SPACING.sm,
  },
  cuisineChipActive: {
    backgroundColor: COLORS.secondary,
  },
  cuisineText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  cuisineTextActive: {
    color: COLORS.white,
  },
  restaurantsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  restaurantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  restaurantImageContainer: {
    height: 160,
    backgroundColor: COLORS.surfaceLight,
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  closedBadge: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  restaurantInfo: {
    padding: SPACING.md,
  },
  restaurantName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  cuisineType: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.secondary,
    textTransform: 'capitalize',
    marginBottom: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: 4,
  },
  ratingText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    flex: 1,
  },
});
