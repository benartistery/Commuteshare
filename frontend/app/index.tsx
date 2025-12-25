import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/store/authStore';
import { Button } from '../src/components/common/Button';
import { COLORS, SPACING, FONT_SIZE } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  return (
    <LinearGradient
      colors={[COLORS.background, '#1a1f3c', COLORS.primaryDark]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="swap-horizontal" size={48} color={COLORS.white} />
          </View>
          <Text style={styles.logoText}>CommuteShare</Text>
          <Text style={styles.tagline}>Your Campus Marketplace</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={styles.feature}>
              <Ionicons name="cart" size={28} color={COLORS.primary} />
              <Text style={styles.featureText}>Marketplace</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="restaurant" size={28} color={COLORS.secondary} />
              <Text style={styles.featureText}>Food</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.feature}>
              <Ionicons name="construct" size={28} color={COLORS.accent} />
              <Text style={styles.featureText}>Services</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="wallet" size={28} color={COLORS.primaryLight} />
              <Text style={styles.featureText}>Wallet</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={() => router.push('/(auth)/register')}
            variant="primary"
            size="large"
            style={styles.button}
          />
          <Button
            title="I already have an account"
            onPress={() => router.push('/(auth)/login')}
            variant="ghost"
            size="medium"
          />
        </View>

        <Text style={styles.footer}>
          For verified university students only
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl * 2,
    paddingBottom: SPACING.xl,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoText: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  featuresContainer: {
    marginVertical: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.lg,
  },
  feature: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: 16,
    width: 140,
  },
  featureText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: SPACING.md,
  },
  button: {
    width: '100%',
  },
  footer: {
    textAlign: 'center',
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
});
