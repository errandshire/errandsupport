import { databases, COLLECTIONS, DATABASE_ID, Query } from './api';

export interface FinancialAnalytics {
  summary: {
    totalRevenue: number;
    totalCommission: number;
    totalMoneyIn: number;
    totalMoneyOut: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
    escrowBalance: number;
    netProfit: number;
    totalCompletedJobs: number;
    averageCommissionPerJob: number;
  };
  monthlyRevenue: MonthlyRevenueItem[];
  transactionsByType: TransactionTypeStat[];
  recentTransactions: WalletTransaction[];
  withdrawalsByStatus: WithdrawalStatusStat[];
  periodComparison: PeriodComparison;
}

export interface MonthlyRevenueItem {
  month: string;
  year: number;
  monthNumber: number;
  revenue: number;
  moneyIn: number;
  moneyOut: number;
  withdrawals: number;
  completedJobs: number;
}

export interface TransactionTypeStat {
  type: string;
  count: number;
  amount: number;
  label: string;
}

export interface WalletTransaction {
  $id: string;
  userId: string;
  type: string;
  amount: number;
  description?: string;
  reference?: string;
  status: string;
  createdAt: string;
  bookingId?: string;
}

export interface WithdrawalStatusStat {
  status: string;
  count: number;
  amount: number;
}

export interface PeriodComparison {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueChange: number;
  thisMonthWithdrawals: number;
  lastMonthWithdrawals: number;
  withdrawalsChange: number;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  topup: 'Wallet Top-ups',
  withdraw: 'Withdrawals',
  booking_hold: 'Booking Holds',
  booking_release: 'Worker Payments',
  booking_refund: 'Refunds',
  commission: 'Platform Commission',
  rollback: 'Payment Rollbacks',
  rollback_hold: 'Escrow Rollbacks'
};

const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed'
};

class FinancialAnalyticsService {
  private readonly MAX_TRANSACTIONS = 10000;

  /**
   * Fetch all wallet transactions for analytics
   */
  private async fetchTransactions(): Promise<WalletTransaction[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        [
          Query.orderDesc('createdAt'),
          Query.limit(this.MAX_TRANSACTIONS)
        ]
      );

      return (response.documents || []).map((tx: any) => ({
        $id: tx.$id || tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0,
        description: tx.description,
        reference: tx.reference,
        status: tx.status || 'completed',
        createdAt: tx.createdAt || tx.$createdAt,
        bookingId: tx.bookingId
      }));
    } catch (error) {
      console.error('Error fetching wallet transactions for analytics:', error);
      return [];
    }
  }

  /**
   * Fetch all withdrawals for analytics
   */
  private async fetchWithdrawals(): Promise<any[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS,
        [Query.limit(this.MAX_TRANSACTIONS)]
      );
      return response.documents || [];
    } catch (error) {
      console.error('Error fetching withdrawals for analytics:', error);
      return [];
    }
  }

  /**
   * Get date key for grouping (YYYY-MM)
   */
  private getMonthKey(dateString: string): { year: number; month: number; key: string; label: string } {
    const date = dateString ? new Date(dateString) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const label = date.toLocaleString('en-NG', { month: 'short', year: 'numeric' });
    return { year, month, key, label };
  }

  /**
   * Calculate financial analytics
   */
  async getAnalytics(): Promise<FinancialAnalytics> {
    const transactions = await this.fetchTransactions();
    const withdrawals = await this.fetchWithdrawals();

    const now = new Date();
    const currentMonthKey = this.getMonthKey(now.toISOString()).key;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = this.getMonthKey(lastMonth.toISOString()).key;

    // Group transactions by month
    const monthlyData = new Map<string, MonthlyRevenueItem>();

    // Summary calculations
    let totalRevenue = 0;
    let totalMoneyIn = 0;
    let totalMoneyOut = 0;
    let totalWithdrawals = 0;
    let pendingWithdrawals = 0;
    let escrowBalance = 0;
    let completedJobsCount = 0;

    // Type aggregations
    const typeStats = new Map<string, TransactionTypeStat>();

    // Process wallet transactions
    transactions.forEach(tx => {
      const amount = Math.abs(tx.amount) || 0;
      const { key, year, month, label } = this.getMonthKey(tx.createdAt);

      // Initialize month if needed
      if (!monthlyData.has(key)) {
        monthlyData.set(key, {
          month: label,
          year,
          monthNumber: month,
          revenue: 0,
          moneyIn: 0,
          moneyOut: 0,
          withdrawals: 0,
          completedJobs: 0
        });
      }
      const monthData = monthlyData.get(key)!;

      // Initialize type stat
      if (!typeStats.has(tx.type)) {
        typeStats.set(tx.type, {
          type: tx.type,
          count: 0,
          amount: 0,
          label: TRANSACTION_TYPE_LABELS[tx.type] || tx.type
        });
      }
      const typeStat = typeStats.get(tx.type)!;
      typeStat.count += 1;

      switch (tx.type) {
        case 'commission':
          totalRevenue += amount;
          monthData.revenue += amount;
          typeStat.amount += amount;
          completedJobsCount += 1;
          monthData.completedJobs += 1;
          break;

        case 'topup':
        case 'booking_hold':
          totalMoneyIn += amount;
          monthData.moneyIn += amount;
          typeStat.amount += amount;
          break;

        case 'withdraw':
          totalWithdrawals += amount;
          totalMoneyOut += amount;
          monthData.moneyOut += amount;
          monthData.withdrawals += amount;
          typeStat.amount += amount;
          break;

        case 'booking_release':
          totalMoneyOut += amount;
          monthData.moneyOut += amount;
          typeStat.amount += amount;
          break;

        case 'booking_refund':
          // Refunds reduce money in
          totalMoneyIn -= amount;
          monthData.moneyIn -= amount;
          typeStat.amount += amount;
          break;

        case 'rollback':
        case 'rollback_hold':
          typeStat.amount += amount;
          break;

        default:
          typeStat.amount += amount;
      }
    });

    // Process withdrawals table (more accurate for pending/withdrawn status)
    withdrawals.forEach(w => {
      const amount = typeof w.amount === 'number' ? w.amount : parseFloat(w.amount) || 0;
      if (w.status === 'pending') {
        pendingWithdrawals += amount;
      }
    });

    // Calculate escrow balance: holds - releases - refunds
    const totalHolds = this.sumByType(transactions, 'booking_hold');
    const totalReleases = this.sumByType(transactions, 'booking_release');
    const totalRefunds = this.sumByType(transactions, 'booking_refund');
    const totalRollbackHolds = this.sumByType(transactions, 'rollback_hold');
    escrowBalance = totalHolds - totalReleases - totalRefunds - totalRollbackHolds;

    // Net profit = commission revenue (platform keeps the fee)
    const netProfit = totalRevenue;

    const averageCommissionPerJob = completedJobsCount > 0 ? totalRevenue / completedJobsCount : 0;

    // Monthly data sorted chronologically
    const monthlyRevenue = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);

    // Withdrawal status stats
    const withdrawalStatusStats = new Map<string, WithdrawalStatusStat>();
    withdrawals.forEach(w => {
      const status = w.status || 'pending';
      const amount = typeof w.amount === 'number' ? w.amount : parseFloat(w.amount) || 0;
      if (!withdrawalStatusStats.has(status)) {
        withdrawalStatusStats.set(status, {
          status,
          count: 0,
          amount: 0
        });
      }
      const stat = withdrawalStatusStats.get(status)!;
      stat.count += 1;
      stat.amount += amount;
    });

    // Period comparison
    const currentMonthData = monthlyData.get(currentMonthKey) || {
      revenue: 0,
      withdrawals: 0
    };
    const lastMonthData = monthlyData.get(lastMonthKey) || {
      revenue: 0,
      withdrawals: 0
    };

    const thisMonthRevenue = currentMonthData.revenue;
    const lastMonthRevenue = lastMonthData.revenue;
    const thisMonthWithdrawals = currentMonthData.withdrawals;
    const lastMonthWithdrawals = lastMonthData.withdrawals;

    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;
    const withdrawalsChange = lastMonthWithdrawals > 0
      ? ((thisMonthWithdrawals - lastMonthWithdrawals) / lastMonthWithdrawals) * 100
      : 0;

    return {
      summary: {
        totalRevenue,
        totalCommission: totalRevenue,
        totalMoneyIn,
        totalMoneyOut,
        totalWithdrawals,
        pendingWithdrawals,
        escrowBalance,
        netProfit,
        totalCompletedJobs: completedJobsCount,
        averageCommissionPerJob
      },
      monthlyRevenue,
      transactionsByType: Array.from(typeStats.values()).sort((a, b) => b.amount - a.amount),
      recentTransactions: transactions.slice(0, 15),
      withdrawalsByStatus: Array.from(withdrawalStatusStats.values()),
      periodComparison: {
        thisMonthRevenue,
        lastMonthRevenue,
        revenueChange,
        thisMonthWithdrawals,
        lastMonthWithdrawals,
        withdrawalsChange
      }
    };
  }

  private sumByType(transactions: WalletTransaction[], type: string): number {
    return transactions
      .filter(tx => tx.type === type)
      .reduce((sum, tx) => sum + (Math.abs(tx.amount) || 0), 0);
  }
}

export const financialAnalyticsService = new FinancialAnalyticsService();
