import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
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
  transaction_type: string;
  description: string;
  status: string;
  reference?: string;
  created_at: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });
  const [processing, setProcessing] = useState(false);

  const loadTransactions = async () => {
    try {
      const response = await api.get('/wallet/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.log('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadTransactions()]);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/wallet/deposit', { amount });
      await refreshUser();
      await loadTransactions();
      setDepositModalVisible(false);
      setDepositAmount('');
      Alert.alert('Success', `₦${amount.toLocaleString()} deposited successfully (Mock)`);
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
    if (!withdrawData.bank_name || !withdrawData.account_number || !withdrawData.account_name) {
      Alert.alert('Error', 'Please fill all bank details');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/wallet/withdraw', {
        amount,
        bank_name: withdrawData.bank_name,
        account_number: withdrawData.account_number,
        account_name: withdrawData.account_name,
      });
      await refreshUser();
      await loadTransactions();
      setWithdrawModalVisible(false);
      setWithdrawData({ amount: '', bank_name: '', account_number: '', account_name: '' });
      Alert.alert('Success', 'Withdrawal request submitted (Mock)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setProcessing(false);
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
      default: 
        return COLORS.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            ₦{(user?.wallet_balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.pointsRow}>
            <Ionicons name="star" size={16} color={COLORS.accent} />
            <Text style={styles.pointsText}>{user?.loyalty_points || 0} Loyalty Points</Text>
          </View>
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.depositButton]}
              onPress={() => setDepositModalVisible(true)}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={() => setWithdrawModalVisible(true)}
            >
              <Ionicons name="arrow-up" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/orders')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="bag-handle" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText}>My Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/my-sales')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Ionicons name="trending-up" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.quickActionText}>My Sales</Text>
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
                  <Text
                    style={[
                      styles.amountText,
                      { color: getTransactionColor(transaction.transaction_type) },
                    ]}
                  >
                    {transaction.transaction_type === 'deposit' ||
                    transaction.transaction_type === 'sale' ||
                    transaction.transaction_type === 'refund'
                      ? '+'
                      : '-'}
                    ₦{transaction.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.statusText}>{transaction.status}</Text>
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
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalNote}>
              This is a mock deposit. In production, you'll be redirected to Paystack.
            </Text>
            <Input
              label="Amount (₦)"
              placeholder="Enter amount"
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
              icon="cash"
            />
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
              <Text style={styles.modalNote}>
                Account name must match your registered name for security.
              </Text>
              <Input
                label="Amount (₦)"
                placeholder="Enter amount"
                value={withdrawData.amount}
                onChangeText={(v) => setWithdrawData(prev => ({ ...prev, amount: v }))}
                keyboardType="numeric"
                icon="cash"
              />
              <Input
                label="Bank Name"
                placeholder="e.g., GTBank"
                value={withdrawData.bank_name}
                onChangeText={(v) => setWithdrawData(prev => ({ ...prev, bank_name: v }))}
                icon="business"
              />
              <Input
                label="Account Number"
                placeholder="10 digit account number"
                value={withdrawData.account_number}
                onChangeText={(v) => setWithdrawData(prev => ({ ...prev, account_number: v }))}
                keyboardType="numeric"
                icon="card"
              />
              <Input
                label="Account Name"
                placeholder="Name on bank account"
                value={withdrawData.account_name}
                onChangeText={(v) => setWithdrawData(prev => ({ ...prev, account_name: v }))}
                icon="person"
              />
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
  balanceCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  balanceLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.white + 'CC',
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  pointsText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
  },
  depositButton: {
    backgroundColor: COLORS.secondary,
  },
  withdrawButton: {
    backgroundColor: COLORS.surfaceLight,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZE.md,
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
  section: {
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
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
  statusText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    maxHeight: '80%',
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
  modalNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
});
