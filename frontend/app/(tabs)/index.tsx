import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/common/Card';
import { COLORS, SPACING, FONT_SIZE } from '../../src/constants/theme';
import api from '../../src/api/client';

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'marketplace',
    title: 'Marketplace',
    subtitle: 'Buy & Sell',
    icon: 'cart',
    color: COLORS.primary,
    route: '/(tabs)/marketplace',
  },
  {
    id: 'food',
    title: 'Food',
    subtitle: 'Order Now',
    icon: 'restaurant',
    color: COLORS.secondary,
    route: '/(tabs)/food',
  },
  {
    id: 'services',
    title: 'Services',
    subtitle: 'Book Services',
    icon: 'construct',
    color: COLORS.accent,
    route: '/(tabs)/services',
  },
  {
    id: 'wallet',
    title: 'Wallet',
    subtitle: 'Manage Funds',
    icon: 'wallet',
    color: '#EC4899',
    route: '/(tabs)/wallet',
  },
];

interface ComingSoonItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  phase: string;
}

const comingSoon: ComingSoonItem[] = [
  {
    id: 'transport',
    title: 'Ride Sharing',
    description: 'Book rides around campus',
    icon: 'car',
    phase: 'Phase 2',
  },
  {
    id: 'housing',
    title: 'Housing',
    description: 'Find accommodations',
    icon: 'home',
    phase: 'Phase 3',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    services: 0,
  });

  const loadStats = async () => {
    try {
      const [products, orders, services] = await Promise.all([
        api.get('/products?limit=1'),
        api.get('/orders'),
        api.get('/services?limit=1'),
      ]);
      setStats({
        products: products.data.length || 0,
        orders: orders.data.length || 0,
        services: services.data.length || 0,
      });
    } catch (error) {
      console.log('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadStats()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name?.split(' ')[0] || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-circle" size={40} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Wallet Card */}
        <Card style={styles.walletCard} onPress={() => router.push('/(tabs)/wallet')}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.walletBalance}>
            ₦{(user?.wallet_balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.walletFooter}>
            <View style={styles.loyaltyBadge}>
              <Ionicons name="star" size={14} color={COLORS.accent} />
              <Text style={styles.loyaltyText}>{user?.loyalty_points || 0} points</Text>
            </View>
            {!user?.is_verified && (
              <View style={styles.verifyBadge}>
                <Ionicons name="alert-circle" size={14} color={COLORS.warning} />
                <Text style={styles.verifyText}>Verify Account</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Coming Soon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          {comingSoon.map((item) => (
            <Card key={item.id} style={styles.comingSoonCard}>
              <View style={styles.comingSoonContent}>
                <View style={styles.comingSoonIcon}>
                  <Ionicons name={item.icon} size={24} color={COLORS.textMuted} />
                </View>
                <View style={styles.comingSoonInfo}>
                  <Text style={styles.comingSoonTitle}>{item.title}</Text>
                  <Text style={styles.comingSoonDesc}>{item.description}</Text>
                </View>
                <View style={styles.phaseBadge}>
                  <Text style={styles.phaseText}>{item.phase}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  greeting: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profileButton: {
    padding: SPACING.xs,
  },
  walletCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  walletLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.white + 'CC',
  },
  walletBalance: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  walletFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  loyaltyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  verifyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  actionCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  comingSoonCard: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface + '80',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  comingSoonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  comingSoonInfo: {
    flex: 1,
  },
  comingSoonTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  comingSoonDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  phaseBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  phaseText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
