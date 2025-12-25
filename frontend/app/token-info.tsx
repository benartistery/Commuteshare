import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/theme';
import { Card } from '../src/components/common/Card';
import { Button } from '../src/components/common/Button';
import api from '../src/api/client';

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  network: string;
  mint_address: string;
  price_usd: number;
  benefits: string[];
  total_supply: string;
  circulating_supply: string;
}

export default function TokenInfoScreen() {
  const router = useRouter();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokenInfo();
  }, []);

  const loadTokenInfo = async () => {
    try {
      const response = await api.get('/token/info');
      setTokenInfo(response.data);
    } catch (error) {
      console.log('Error loading token info:', error);
    } finally {
      setLoading(false);
    }
  };

  const openSolscan = () => {
    if (tokenInfo?.mint_address && tokenInfo.mint_address !== 'Not deployed yet') {
      Linking.openURL(`https://solscan.io/token/${tokenInfo.mint_address}?cluster=devnet`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>COST Token</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Token Hero */}
        <View style={styles.heroSection}>
          <View style={styles.tokenIcon}>
            <Ionicons name="diamond" size={48} color={COLORS.accent} />
          </View>
          <Text style={styles.tokenName}>{tokenInfo?.name || 'CommuteShare Token'}</Text>
          <Text style={styles.tokenSymbol}>{tokenInfo?.symbol || 'COST'}</Text>
          <View style={styles.priceTag}>
            <Text style={styles.priceLabel}>Current Price</Text>
            <Text style={styles.priceValue}>${tokenInfo?.price_usd || '0.05'}</Text>
          </View>
        </View>

        {/* Benefits Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Token Benefits</Text>
          {(tokenInfo?.benefits || [
            '15-50% discount on all transactions (first year)',
            '15% discount after first year',
            'Loyalty rewards',
            'Governance voting (coming soon)',
            'Staking rewards (coming soon)',
          ]).map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </Card>

        {/* Token Stats */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Token Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Supply</Text>
              <Text style={styles.statValue}>{tokenInfo?.total_supply || '1B COST'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Circulating</Text>
              <Text style={styles.statValue}>{tokenInfo?.circulating_supply || '100M'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Network</Text>
              <Text style={styles.statValue}>{tokenInfo?.network || 'Solana'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Decimals</Text>
              <Text style={styles.statValue}>{tokenInfo?.decimals || 9}</Text>
            </View>
          </View>
        </Card>

        {/* Contract Address */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contract Address</Text>
          <TouchableOpacity style={styles.addressContainer} onPress={openSolscan}>
            <Text style={styles.addressText} numberOfLines={1}>
              {tokenInfo?.mint_address || 'Not deployed yet'}
            </Text>
            <Ionicons name="open-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.networkNote}>
            Network: {tokenInfo?.network || 'Devnet'} (Testnet)
          </Text>
        </Card>

        {/* Discount Tiers */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Discount Structure</Text>
          <View style={styles.discountTable}>
            <View style={styles.discountHeader}>
              <Text style={styles.discountHeaderText}>Payment Method</Text>
              <Text style={styles.discountHeaderText}>Discount</Text>
            </View>
            <View style={styles.discountRow}>
              <Text style={styles.discountMethod}>Fiat Currency</Text>
              <Text style={styles.discountValue}>5%</Text>
            </View>
            <View style={styles.discountRow}>
              <Text style={styles.discountMethod}>SOL</Text>
              <Text style={styles.discountValue}>5%</Text>
            </View>
            <View style={styles.discountRow}>
              <Text style={styles.discountMethod}>USDT</Text>
              <Text style={styles.discountValue}>5%</Text>
            </View>
            <View style={[styles.discountRow, styles.highlightRow]}>
              <Text style={[styles.discountMethod, { color: COLORS.accent }]}>COST (First Year)</Text>
              <Text style={[styles.discountValue, { color: COLORS.accent }]}>15-50%</Text>
            </View>
            <View style={styles.discountRow}>
              <Text style={styles.discountMethod}>COST (After 1 Year)</Text>
              <Text style={styles.discountValue}>15%</Text>
            </View>
          </View>
          <Text style={styles.discountNote}>
            * COST discount starts at 50% and gradually decreases to 15% over your first year
          </Text>
        </Card>

        {/* How to Get COST */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>How to Get COST</Text>
          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Create Solana Wallet</Text>
                <Text style={styles.stepDesc}>Go to Wallet tab and create a Solana wallet</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Add SOL or USDT</Text>
                <Text style={styles.stepDesc}>Deposit SOL or USDT to your wallet</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Swap to COST</Text>
                <Text style={styles.stepDesc}>Use the swap feature to convert to COST tokens</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Enjoy Discounts!</Text>
                <Text style={styles.stepDesc}>Pay with COST and save up to 50%</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Swap to COST"
            onPress={() => router.push('/(tabs)/wallet')}
            size="large"
            style={{ backgroundColor: COLORS.accent }}
          />
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
  content: {
    paddingHorizontal: SPACING.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  tokenIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tokenName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tokenSymbol: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.accent,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  priceTag: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  priceValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  section: {
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  benefitText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statItem: {
    width: '47%',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  addressText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  networkNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  discountTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  discountHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
  },
  discountHeaderText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  discountRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  highlightRow: {
    backgroundColor: COLORS.accent + '10',
  },
  discountMethod: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  discountValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  discountNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  stepsList: {
    gap: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  actionButtons: {
    marginTop: SPACING.md,
  },
});
