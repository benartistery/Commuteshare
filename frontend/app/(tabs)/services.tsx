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

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  service_type: string;
  duration?: string;
  images: string[];
  provider_name: string;
  location?: string;
  rating: number;
  total_reviews: number;
  is_available: boolean;
}

interface ServiceType {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const serviceTypes: ServiceType[] = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'makeup', name: 'Makeup', icon: 'color-palette' },
  { id: 'photography', name: 'Photography', icon: 'camera' },
  { id: 'project_writing', name: 'Projects', icon: 'document-text' },
  { id: 'topic_verification', name: 'Topic Check', icon: 'checkmark-circle' },
  { id: 'tutoring', name: 'Tutoring', icon: 'school' },
  { id: 'other', name: 'Other', icon: 'construct' },
];

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadServices = async (serviceType?: string, search?: string) => {
    try {
      const params: any = {};
      if (serviceType && serviceType !== 'all') params.service_type = serviceType;
      if (search) params.search = search;
      
      const response = await api.get('/services', { params });
      setServices(response.data);
    } catch (error) {
      console.log('Error loading services:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadServices(selectedType, searchQuery);
  }, [selectedType, searchQuery]);

  useEffect(() => {
    loadServices(selectedType, searchQuery);
  }, [selectedType]);

  const handleSearch = () => {
    loadServices(selectedType, searchQuery);
  };

  const getServiceTypeLabel = (type: string) => {
    const found = serviceTypes.find(t => t.id === type);
    return found?.name || type;
  };

  const renderServiceCard = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => router.push(`/service/${item.id}`)}
    >
      <View style={styles.serviceImageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="construct" size={40} color={COLORS.textMuted} />
          </View>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{getServiceTypeLabel(item.service_type)}</Text>
        </View>
      </View>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.servicePrice}>₦{item.price.toLocaleString()}</Text>
        <Text style={styles.providerName}>{item.provider_name}</Text>
        <View style={styles.serviceMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={COLORS.accent} />
            <Text style={styles.ratingText}>
              {item.rating > 0 ? item.rating.toFixed(1) : 'New'}
            </Text>
          </View>
          {item.duration && (
            <View style={styles.durationContainer}>
              <Ionicons name="time" size={12} color={COLORS.textMuted} />
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen message="Loading services..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/my-bookings')}
          >
            <Ionicons name="calendar" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/offer-service')}
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
            placeholder="Search services..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              loadServices(selectedType);
            }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Service Types */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typesContainer}
        contentContainerStyle={styles.typesContent}
      >
        {serviceTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeChip,
              selectedType === type.id && styles.typeChipActive,
            ]}
            onPress={() => setSelectedType(type.id)}
          >
            <Ionicons
              name={type.icon}
              size={16}
              color={selectedType === type.id ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.typeChipText,
                selectedType === type.id && styles.typeChipTextActive,
              ]}
            >
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Services Grid */}
      <FlatList
        data={services}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.serviceRow}
        contentContainerStyle={styles.servicesContainer}
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
            icon="construct-outline"
            title="No Services Found"
            description="Offer your skills and start earning!"
            actionLabel="Offer a Service"
            onAction={() => router.push('/offer-service')}
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
    backgroundColor: COLORS.accent,
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
  typesContainer: {
    maxHeight: 50,
    marginBottom: SPACING.md,
  },
  typesContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
    marginRight: SPACING.sm,
  },
  typeChipActive: {
    backgroundColor: COLORS.accent,
  },
  typeChipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.white,
  },
  servicesContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  serviceRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  serviceImageContainer: {
    height: 120,
    backgroundColor: COLORS.surfaceLight,
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  typeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.white,
    fontWeight: '500',
  },
  serviceInfo: {
    padding: SPACING.sm,
  },
  serviceTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 4,
  },
  providerName: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: '500',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  durationText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
});
