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
import { useAuthStore } from '../src/store/authStore';
import api from '../src/api/client';

interface Booking {
  id: string;
  service_id: string;
  service_title: string;
  client_id: string;
  client_name: string;
  provider_id: string;
  provider_name: string;
  scheduled_date: string;
  scheduled_time?: string;
  notes?: string;
  location?: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function MyBookingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async () => {
    try {
      const response = await api.get('/bookings');
      setBookings(response.data);
    } catch (error) {
      console.log('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'confirmed': return COLORS.primary;
      case 'in_progress': return COLORS.accent;
      case 'completed': return COLORS.success;
      case 'cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const updateStatus = async (bookingId: string, status: string) => {
    try {
      await api.put(`/bookings/${bookingId}/status?status=${status}`);
      loadBookings();
      Alert.alert('Success', `Booking ${status}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update');
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const isProvider = item.provider_id === user?.id;
    const isClient = item.client_id === user?.id;

    return (
      <Card style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.serviceTitle}>{item.service_title}</Text>
            <Text style={styles.roleName}>
              {isProvider ? `Client: ${item.client_name}` : `Provider: ${item.provider_name}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={COLORS.textMuted} />
            <Text style={styles.detailText}>{item.scheduled_date}</Text>
          </View>
          {item.scheduled_time && (
            <View style={styles.detailRow}>
              <Ionicons name="time" size={16} color={COLORS.textMuted} />
              <Text style={styles.detailText}>{item.scheduled_time}</Text>
            </View>
          )}
          {item.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={COLORS.textMuted} />
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.bookingFooter}>
          <Text style={styles.amount}>₦{item.amount.toLocaleString()}</Text>
          
          {isProvider && item.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => updateStatus(item.id, 'confirmed')}
              >
                <Text style={styles.actionBtnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => updateStatus(item.id, 'cancelled')}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {isProvider && item.status === 'confirmed' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => updateStatus(item.id, 'completed')}
            >
              <Text style={styles.actionBtnText}>Mark Complete</Text>
            </TouchableOpacity>
          )}

          {isClient && item.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => updateStatus(item.id, 'completed')}
            >
              <Text style={styles.actionBtnText}>Confirm Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading bookings..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={bookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadBookings();
            }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No Bookings Yet"
            description="Book a service or offer your services"
            actionLabel="Browse Services"
            onAction={() => router.push('/(tabs)/services')}
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
  bookingCard: {
    marginBottom: SPACING.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  serviceTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  roleName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookingDetails: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  confirmBtn: {
    backgroundColor: COLORS.success,
  },
  cancelBtn: {
    backgroundColor: COLORS.error + '20',
  },
  completeBtn: {
    backgroundColor: COLORS.primary,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
});
