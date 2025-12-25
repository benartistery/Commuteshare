import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  Platform,
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

interface Service {
  id: string;
  provider_id: string;
  provider_name: string;
  title: string;
  description: string;
  price: number;
  service_type: string;
  duration?: string;
  images: string[];
  location?: string;
  availability?: string;
  rating: number;
  total_reviews: number;
  is_available: boolean;
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(false);
  const [booking, setBooking] = useState({
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadService();
  }, [id]);

  const loadService = async () => {
    try {
      const response = await api.get(`/services/${id}`);
      setService(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load service');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!service) return;
    
    if (!booking.scheduled_date) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if ((user?.wallet_balance || 0) < service.price) {
      Alert.alert(
        'Insufficient Balance',
        'Please add funds to your wallet to book this service.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Funds', onPress: () => router.push('/(tabs)/wallet') },
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/services/book', {
        service_id: service.id,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time || null,
        notes: booking.notes || null,
        location: booking.location || null,
      });
      setBookingModal(false);
      Alert.alert('Success', 'Service booked successfully!', [
        { text: 'OK', onPress: () => router.push('/my-bookings') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to book service');
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      makeup: 'Makeup & Beauty',
      photography: 'Photography',
      project_writing: 'Project Writing',
      topic_verification: 'Topic Verification',
      tutoring: 'Tutoring',
      other: 'Other Services',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <LoadingScreen message="Loading service..." />;
  }

  if (!service) {
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
        {service.images && service.images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {service.images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={styles.serviceImage} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="construct" size={80} color={COLORS.textMuted} />
          </View>
        )}

        <View style={styles.content}>
          {/* Type Badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{getServiceTypeLabel(service.service_type)}</Text>
          </View>

          {/* Title & Price */}
          <Text style={styles.title}>{service.title}</Text>
          <Text style={styles.price}>₦{service.price.toLocaleString()}</Text>

          {/* Rating & Duration */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={16} color={COLORS.accent} />
              <Text style={styles.metaText}>
                {service.rating > 0 ? service.rating.toFixed(1) : 'New'}
              </Text>
              <Text style={styles.reviewCount}>({service.total_reviews})</Text>
            </View>
            {service.duration && (
              <View style={styles.metaItem}>
                <Ionicons name="time" size={16} color={COLORS.textMuted} />
                <Text style={styles.metaText}>{service.duration}</Text>
              </View>
            )}
          </View>

          {/* Provider Card */}
          <Card style={styles.providerCard}>
            <View style={styles.providerInfo}>
              <View style={styles.providerAvatar}>
                <Ionicons name="person" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.providerDetails}>
                <Text style={styles.providerName}>{service.provider_name}</Text>
                <Text style={styles.providerLabel}>Service Provider</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.messageButton}>
              <Ionicons name="chatbubble" size={20} color={COLORS.accent} />
            </TouchableOpacity>
          </Card>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Service</Text>
            <Text style={styles.description}>
              {service.description || 'No description provided.'}
            </Text>
          </View>

          {/* Location & Availability */}
          {(service.location || service.availability) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              {service.location && (
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{service.location}</Text>
                </View>
              )}
              {service.availability && (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{service.availability}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      {service.provider_id !== user?.id && (
        <View style={styles.bottomBar}>
          <View style={styles.priceContainer}>
            <Text style={styles.bottomPrice}>₦{service.price.toLocaleString()}</Text>
            <Text style={styles.bottomLabel}>per session</Text>
          </View>
          <Button
            title="Book Now"
            onPress={() => setBookingModal(true)}
            size="large"
            variant="secondary"
            style={styles.bookButton}
          />
        </View>
      )}

      {/* Booking Modal */}
      <Modal
        visible={bookingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Service</Text>
              <TouchableOpacity onPress={() => setBookingModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalServiceTitle}>{service.title}</Text>
            <Text style={styles.modalPrice}>₦{service.price.toLocaleString()}</Text>

            <Input
              label="Date *"
              placeholder="YYYY-MM-DD"
              value={booking.scheduled_date}
              onChangeText={(v) => setBooking(prev => ({ ...prev, scheduled_date: v }))}
              icon="calendar"
            />

            <Input
              label="Preferred Time"
              placeholder="e.g., 2:00 PM"
              value={booking.scheduled_time}
              onChangeText={(v) => setBooking(prev => ({ ...prev, scheduled_time: v }))}
              icon="time"
            />

            <Input
              label="Location"
              placeholder="Where should the service be delivered?"
              value={booking.location}
              onChangeText={(v) => setBooking(prev => ({ ...prev, location: v }))}
              icon="location"
            />

            <Input
              label="Notes"
              placeholder="Any special requirements?"
              value={booking.notes}
              onChangeText={(v) => setBooking(prev => ({ ...prev, notes: v }))}
              multiline
              numberOfLines={3}
            />

            <Button
              title="Confirm Booking"
              onPress={handleBooking}
              loading={submitting}
              size="large"
              variant="secondary"
            />
          </View>
        </View>
      </Modal>
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
  serviceImage: {
    width: 400,
    height: 250,
  },
  placeholderImage: {
    height: 250,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.lg,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  typeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent,
    fontWeight: '500',
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
    color: COLORS.accent,
    marginBottom: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  reviewCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.accent + '20',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  providerDetails: {},
  providerName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  providerLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  messageButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.accent + '20',
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailText: {
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
    color: COLORS.accent,
  },
  bottomLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  bookButton: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalServiceTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalPrice: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: SPACING.lg,
  },
});
