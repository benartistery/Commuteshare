import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  description: string;
  status: string;
  reference?: string;
  discount_applied?: number;
  created_at: string;
}

interface WalletBalance {
  fiat_balance: number;
  sol_balance: number;
  usdt_balance: number;
  cost_balance: number;
  total_in_fiat: number;
  loyalty_points: number;
  currency: { code: string; symbol: string; name: string };
  solana_wallet?: string;
  exchange_rates: Record<string, number>;
  membership: MembershipTier;
}

interface MembershipTier {
  tier: string;
  tier_name: string;
  discount: number;
  color: string;
  icon: string;
  min_balance: number;
  cost_balance: number;
  next_tier?: {
    tier: string;
    tier_name: string;
    discount: number;
    color: string;
    min_balance: number;
    tokens_needed: number;
  };
}

interface DiscountInfo {
  membership: MembershipTier;
  discounts: {
    fiat: number;
    sol: number;
    usdt: number;
    cost: number;
  };
  message: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuthStore();
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('FIAT');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    solana_address: '',
  });
  const [swapData, setSwapData] = useState({
    from_currency: 'FIAT',
    to_currency: 'COST',
    amount: '',
  });
  const [processing, setProcessing] = useState(false);

  const loadWalletData = async () => {
    try {
      const [balanceRes, discountRes, transactionsRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/discount-info'),
        api.get('/wallet/transactions'),
      ]);
      setWalletData(balanceRes.data);
      setDiscountInfo(discountRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.log('Error loading wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadWalletData()]);
  }, []);

  useEffect(() => {
    loadWalletData();
  }, []);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/wallet/deposit', { amount, currency: selectedCurrency });
      await refreshUser();
      await loadWalletData();
      setDepositModalVisible(false);
      setDepositAmount('');
      Alert.alert('Success', `Deposited successfully (Mock)`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Deposit failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/wallet/withdraw', {
        amount,
        currency: selectedCurrency,
        bank_name: withdrawData.bank_name,
        account_number: withdrawData.account_number,
        account_name: withdrawData.account_name,
        solana_address: withdrawData.solana_address,
      });
      await refreshUser();
      await loadWalletData();
      setWithdrawModalVisible(false);
      setWithdrawData({ amount: '', bank_name: '', account_number: '', account_name: '', solana_address: '' });
      Alert.alert('Success', 'Withdrawal request submitted (Mock)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleSwap = async () => {
    const amount = parseFloat(swapData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const result = await api.post('/wallet/swap', swapData);
      await refreshUser();
      await loadWalletData();
      setSwapModalVisible(false);
      setSwapData({ from_currency: 'FIAT', to_currency: 'COST', amount: '' });
      Alert.alert('Success', `Swapped ${result.data.amount_sent} ${result.data.from_currency} to ${result.data.amount_received.toFixed(4)} ${result.data.to_currency}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Swap failed');
    } finally {
      setProcessing(false);
    }
  };

  const createSolanaWallet = async () => {
    try {
      const result = await api.post('/wallet/solana/create');
      await loadWalletData();
      Alert.alert('Success', `Solana wallet created!\n${result.data.wallet_address}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create wallet');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return 'arrow-down-circle';
      case 'withdrawal': return 'arrow-up-circle';
      case 'purchase': return 'cart';
      case 'sale': return 'cash';
      case 'refund': return 'refresh-circle';
      case 'swap': return 'swap-horizontal';
      default: return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'sale':
      case 'refund':
        return COLORS.success;
      case 'withdrawal':
      case 'purchase':
        return COLORS.error;
      case 'swap':
        return COLORS.accent;
      default:
        return COLORS.textSecondary;
    }
  };

  const getTierIcon = (tier: string): any => {
    switch (tier) {
      case 'platinum': return 'trophy';
      case 'gold': return 'medal';
      case 'silver': return 'ribbon';
      case 'bronze': return 'star';
      default: return 'person';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currencyOptions = [
    { id: 'FIAT', label: walletData?.currency?.code || 'NGN', icon: 'cash' },
    { id: 'SOL', label: 'SOL', icon: 'logo-bitcoin' },
    { id: 'USDT', label: 'USDT', icon: 'logo-usd' },
    { id: 'COST', label: 'COST', icon: 'diamond' },
  ];

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
          <Text style={styles.headerTitle}>Wallet</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* Discount Banner */}
        {discountInfo && (
          <View style={styles.discountBanner}>
            <Ionicons name="pricetag" size={18} color={COLORS.accent} />
            <Text style={styles.discountText}>{discountInfo.message}</Text>
          </View>
        )}

        {/* Membership Tier Card */}
        {walletData?.membership && (
          <Card style={[styles.membershipCard, { borderColor: walletData.membership.color }]}>
            <View style={styles.membershipHeader}>
              <View style={[styles.tierBadge, { backgroundColor: walletData.membership.color }]}>
                <Ionicons 
                  name={getTierIcon(walletData.membership.tier)} 
                  size={24} 
                  color={walletData.membership.tier === 'basic' ? COLORS.white : '#333'} 
                />
              </View>
              <View style={styles.membershipInfo}>
                <Text style={styles.tierName}>{walletData.membership.tier_name} Member</Text>
                <Text style={styles.tierDiscount}>{walletData.membership.discount}% discount with COST</Text>
              </View>
            </View>
            {walletData.membership.next_tier && (
              <View style={styles.nextTierProgress}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min(100, (walletData.membership.cost_balance / walletData.membership.next_tier.min_balance) * 100)}%`,
                        backgroundColor: walletData.membership.next_tier.color 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.nextTierText}>
                  {walletData.membership.next_tier.tokens_needed.toLocaleString()} COST to {walletData.membership.next_tier.tier_name}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Total Balance Card */}
        <Card style={styles.totalBalanceCard}>
          <Text style={styles.totalBalanceLabel}>Total Balance</Text>
          <Text style={styles.totalBalanceAmount}>
            {walletData?.currency?.symbol || '₦'}
            {(walletData?.total_in_fiat || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.loyaltyRow}>
            <Ionicons name="star" size={16} color={COLORS.accent} />
            <Text style={styles.loyaltyText}>{walletData?.loyalty_points || 0} Loyalty Points</Text>
          </View>
        </Card>

        {/* Currency Balances */}
        <View style={styles.balancesGrid}>
          <Card style={styles.balanceCard}>
            <View style={[styles.balanceIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="cash" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.balanceCurrency}>{walletData?.currency?.code || 'NGN'}</Text>
            <Text style={styles.balanceAmount}>
              {walletData?.currency?.symbol}{(walletData?.fiat_balance || 0).toLocaleString()}
            </Text>
          </Card>

          <Card style={styles.balanceCard}>
            <View style={[styles.balanceIcon, { backgroundColor: '#9945FF20' }]}>
              <Ionicons name="logo-bitcoin" size={20} color="#9945FF" />
            </View>
            <Text style={styles.balanceCurrency}>SOL</Text>
            <Text style={styles.balanceAmount}>
              {(walletData?.sol_balance || 0).toFixed(4)}
            </Text>
          </Card>

          <Card style={styles.balanceCard}>
            <View style={[styles.balanceIcon, { backgroundColor: '#26A17B20' }]}>
              <Ionicons name="logo-usd" size={20} color="#26A17B" />
            </View>
            <Text style={styles.balanceCurrency}>USDT</Text>
            <Text style={styles.balanceAmount}>
              {(walletData?.usdt_balance || 0).toFixed(2)}
            </Text>
          </Card>

          <Card style={[styles.balanceCard, styles.costCard]}>
            <View style={[styles.balanceIcon, { backgroundColor: COLORS.accent + '20' }]}>
              <Ionicons name="diamond" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.balanceCurrency}>COST</Text>
            <Text style={[styles.balanceAmount, { color: COLORS.accent }]}>
              {(walletData?.cost_balance || 0).toFixed(2)}
            </Text>
            {discountInfo && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{discountInfo.discounts.cost}% off</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
            onPress={() => setDepositModalVisible(true)}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => setWithdrawModalVisible(true)}
          >
            <Ionicons name="arrow-up" size={20} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.accent }]}
            onPress={() => setSwapModalVisible(true)}
          >
            <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Swap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#9945FF' }]}
            onPress={() => router.push('/token-info')}
          >
            <Ionicons name="diamond" size={20} color={COLORS.white} />
            <Text style={styles.actionBtnText}>COST</Text>
          </TouchableOpacity>
        </View>

        {/* Solana Wallet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solana Wallet</Text>
          {walletData?.solana_wallet ? (
            <Card style={styles.solanaCard}>
              <View style={styles.solanaHeader}>
                <Ionicons name="wallet" size={24} color="#9945FF" />
                <Text style={styles.solanaLabel}>Connected</Text>
              </View>
              <Text style={styles.solanaAddress} numberOfLines={1}>
                {walletData.solana_wallet}
              </Text>
              <Text style={styles.networkBadge}>Network: Devnet</Text>
            </Card>
          ) : (
            <Card style={styles.solanaCard}>
              <Text style={styles.noWalletText}>No Solana wallet connected</Text>
              <Button
                title="Create Wallet"
                onPress={createSolanaWallet}
                variant="outline"
                size="small"
                style={{ marginTop: SPACING.sm }}
              />
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/orders')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="bag-handle" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/my-sales')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Ionicons name="trending-up" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.quickActionText}>Sales</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/profile')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent + '20' }]}>
              <Ionicons name="person" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.quickActionText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </Card>
          ) : (
            transactions.slice(0, 10).map((transaction) => (
              <Card key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  <Ionicons
                    name={getTransactionIcon(transaction.transaction_type) as any}
                    size={24}
                    color={getTransactionColor(transaction.transaction_type)}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc} numberOfLines={1}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[styles.amountText, { color: getTransactionColor(transaction.transaction_type) }]}>
                    {transaction.transaction_type === 'deposit' ||
                    transaction.transaction_type === 'sale' ||
                    transaction.transaction_type === 'refund'
                      ? '+'
                      : '-'}
                    {transaction.amount.toLocaleString()} {transaction.currency}
                  </Text>
                  {transaction.discount_applied > 0 && (
                    <Text style={styles.discountApplied}>-{transaction.discount_applied.toFixed(2)} saved</Text>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Deposit Modal */}
      <Modal
        visible={depositModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Funds</Text>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select Currency</Text>
            <View style={styles.currencySelector}>
              {currencyOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.currencyOption,
                    selectedCurrency === opt.id && styles.currencyOptionActive,
                  ]}
                  onPress={() => setSelectedCurrency(opt.id)}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={selectedCurrency === opt.id ? COLORS.white : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.currencyOptionText,
                      selectedCurrency === opt.id && styles.currencyOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Amount"
              placeholder="Enter amount"
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
              icon="cash"
            />

            <Text style={styles.mockNote}>
              This is a mock deposit. In production, you'll be redirected to payment gateway.
            </Text>

            <Button
              title="Deposit"
              onPress={handleDeposit}
              loading={processing}
              size="large"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        visible={withdrawModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView style={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Withdraw</Text>
                <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>Select Currency</Text>
              <View style={styles.currencySelector}>
                {currencyOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.currencyOption,
                      selectedCurrency === opt.id && styles.currencyOptionActive,
                    ]}
                    onPress={() => setSelectedCurrency(opt.id)}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={selectedCurrency === opt.id ? COLORS.white : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.currencyOptionText,
                        selectedCurrency === opt.id && styles.currencyOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Amount"
                placeholder="Enter amount"
                value={withdrawData.amount}
                onChangeText={(v) => setWithdrawData((prev) => ({ ...prev, amount: v }))}
                keyboardType="numeric"
                icon="cash"
              />

              {selectedCurrency === 'FIAT' ? (
                <>
                  <Input
                    label="Bank Name"
                    placeholder="e.g., GTBank"
                    value={withdrawData.bank_name}
                    onChangeText={(v) => setWithdrawData((prev) => ({ ...prev, bank_name: v }))}
                    icon="business"
                  />
                  <Input
                    label="Account Number"
                    placeholder="10 digit account number"
                    value={withdrawData.account_number}
                    onChangeText={(v) => setWithdrawData((prev) => ({ ...prev, account_number: v }))}
                    keyboardType="numeric"
                    icon="card"
                  />
                  <Input
                    label="Account Name"
                    placeholder="Name on bank account"
                    value={withdrawData.account_name}
                    onChangeText={(v) => setWithdrawData((prev) => ({ ...prev, account_name: v }))}
                    icon="person"
                  />
                </>
              ) : (
                <Input
                  label="Solana Wallet Address"
                  placeholder="Enter Solana address"
                  value={withdrawData.solana_address}
                  onChangeText={(v) => setWithdrawData((prev) => ({ ...prev, solana_address: v }))}
                  icon="wallet"
                />
              )}

              <Button
                title="Withdraw"
                onPress={handleWithdraw}
                loading={processing}
                size="large"
                variant="secondary"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Swap Modal */}
      <Modal
        visible={swapModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSwapModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Swap Currency</Text>
              <TouchableOpacity onPress={() => setSwapModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>From</Text>
            <View style={styles.currencySelector}>
              {currencyOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.currencyOption,
                    swapData.from_currency === opt.id && styles.currencyOptionActive,
                  ]}
                  onPress={() => setSwapData((prev) => ({ ...prev, from_currency: opt.id }))}
                >
                  <Text
                    style={[
                      styles.currencyOptionText,
                      swapData.from_currency === opt.id && styles.currencyOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.swapArrow}>
              <Ionicons name="arrow-down" size={24} color={COLORS.accent} />
            </View>

            <Text style={styles.modalSubtitle}>To</Text>
            <View style={styles.currencySelector}>
              {currencyOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.currencyOption,
                    swapData.to_currency === opt.id && styles.currencyOptionActive,
                  ]}
                  onPress={() => setSwapData((prev) => ({ ...prev, to_currency: opt.id }))}
                >
                  <Text
                    style={[
                      styles.currencyOptionText,
                      swapData.to_currency === opt.id && styles.currencyOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Amount"
              placeholder="Enter amount to swap"
              value={swapData.amount}
              onChangeText={(v) => setSwapData((prev) => ({ ...prev, amount: v }))}
              keyboardType="numeric"
              icon="swap-horizontal"
            />

            <Text style={styles.feeNote}>1% swap fee applies</Text>

            <Button
              title="Swap"
              onPress={handleSwap}
              loading={processing}
              size="large"
              style={{ backgroundColor: COLORS.accent }}
            />
          </View>
        </KeyboardAvoidingView>
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
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '20',
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  discountText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent,
    fontWeight: '500',
    flex: 1,
  },
  totalBalanceCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  totalBalanceLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.white + 'CC',
    marginBottom: SPACING.xs,
  },
  totalBalanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  loyaltyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  loyaltyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
  },
  balancesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  balanceCard: {
    width: '48%',
    padding: SPACING.md,
    alignItems: 'center',
  },
  costCard: {
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  balanceCurrency: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  discountBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  discountBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
  },
  actionBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZE.sm,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  solanaCard: {
    padding: SPACING.md,
  },
  solanaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  solanaLabel: {
    fontSize: FONT_SIZE.md,
    color: '#9945FF',
    fontWeight: '600',
  },
  solanaAddress: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  networkBadge: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  noWalletText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  discountApplied: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
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
  modalSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  currencySelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  currencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  currencyOptionActive: {
    backgroundColor: COLORS.primary,
  },
  currencyOptionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  currencyOptionTextActive: {
    color: COLORS.white,
  },
  mockNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  swapArrow: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  feeNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
});
