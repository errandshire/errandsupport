import { databases, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';
import { EscrowService } from './escrow-service';
import type { EscrowTransaction } from './types';

export interface AnalyticsMetric {
  label: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
}

export interface AnalyticsPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface AnalyticsData {
  metrics: AnalyticsMetric[];
  earnings: {
    total: number;
    data: { date: string; amount: number }[];
  };
  bookings: {
    total: number;
    data: { date: string; count: number }[];
  };
  ratings: {
    average: number;
    total: number;
    distribution: { [key: number]: number };
  };
  performance: {
    responseRate: number;
    completionRate: number;
    onTimeRate: number;
    satisfactionRate: number;
  };
}

class WorkerAnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private getPeriodDates(period: string): AnalyticsPeriod {
    const now = new Date();
    const startDate = new Date();
    let label = '';

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        label = 'Today';
        break;
      case 'yesterday':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        now.setDate(now.getDate() - 1);
        now.setHours(23, 59, 59, 999);
        label = 'Yesterday';
        break;
      case 'last-7-days':
        startDate.setDate(now.getDate() - 7);
        label = 'Last 7 Days';
        break;
      case 'last-30-days':
        startDate.setDate(now.getDate() - 30);
        label = 'Last 30 Days';
        break;
      case 'this-month':
        startDate.setDate(1);
        label = 'This Month';
        break;
      case 'last-month':
        startDate.setMonth(now.getMonth() - 1, 1);
        now.setDate(0); // Last day of previous month
        label = 'Last Month';
        break;
      default:
        startDate.setDate(now.getDate() - 30);
        label = 'Last 30 Days';
    }

    return { startDate, endDate: now, label };
  }

  private async getBookingsInPeriod(workerId: string, period: AnalyticsPeriod) {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('workerId', workerId),
          Query.greaterThanEqual('$createdAt', period.startDate.toISOString()),
          Query.lessThanEqual('$createdAt', period.endDate.toISOString()),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );

      return response.documents;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  }

  private async getEarningsInPeriod(workerId: string, period: AnalyticsPeriod) {
    try {
      const transactions = await EscrowService.getUserEscrowTransactions(
        workerId,
        'worker',
        100,
        period.startDate,
        period.endDate
      );

      return transactions;
    } catch (error) {
      console.error('Error fetching earnings:', error);
      return [];
    }
  }

  private async getRatingsInPeriod(workerId: string, period: AnalyticsPeriod) {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        [
          Query.equal('workerId', workerId),
          Query.greaterThanEqual('$createdAt', period.startDate.toISOString()),
          Query.lessThanEqual('$createdAt', period.endDate.toISOString()),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );

      return response.documents;
    } catch (error) {
      console.error('Error fetching ratings:', error);
      return [];
    }
  }

  private calculateMetrics(
    bookings: any[],
    earnings: EscrowTransaction[],
    ratings: any[],
    period: AnalyticsPeriod
  ): AnalyticsData {
    // Calculate total earnings
    const totalEarnings = earnings.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Group earnings by date
    const earningsData = this.groupByDate(earnings, 'createdAt', 'amount');

    // Group bookings by date
    const bookingsData = this.groupByDate(bookings, '$createdAt', 'count');

    // Calculate ratings distribution
    const ratingDistribution = ratings.reduce((dist: { [key: number]: number }, review) => {
      const rating = review.rating || 0;
      dist[rating] = (dist[rating] || 0) + 1;
      return dist;
    }, {});

    // Calculate average rating
    const totalRating = ratings.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = ratings.length > 0 ? totalRating / ratings.length : 0;

    // Calculate performance metrics
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const responseRate = bookings.length > 0 
      ? (bookings.filter(b => b.status !== 'confirmed').length / bookings.length) * 100 
      : 0;
    const completionRate = bookings.length > 0
      ? (completedBookings.length / bookings.length) * 100
      : 0;
    const onTimeBookings = completedBookings.filter(b => {
      const completedAt = new Date(b.completedAt);
      const scheduledDate = new Date(b.scheduledDate);
      return completedAt <= scheduledDate;
    });
    const onTimeRate = completedBookings.length > 0
      ? (onTimeBookings.length / completedBookings.length) * 100
      : 0;
    const satisfactionRate = ratings.length > 0
      ? (ratings.filter(r => r.rating >= 4).length / ratings.length) * 100
      : 0;

    // Prepare metrics
    const metrics: AnalyticsMetric[] = [
      {
        label: 'Total Earnings',
        value: `₦${totalEarnings.toLocaleString()}`,
        change: 0, // Calculate change from previous period
        changeType: 'neutral',
        icon: 'DollarSign',
        color: 'text-green-600'
      },
      {
        label: 'Completed Jobs',
        value: completedBookings.length,
        change: completionRate,
        changeType: completionRate >= 70 ? 'increase' : 'decrease',
        icon: 'CheckCircle',
        color: 'text-blue-600'
      },
      {
        label: 'Average Rating',
        value: averageRating.toFixed(1),
        change: ratings.length,
        changeType: averageRating >= 4 ? 'increase' : 'decrease',
        icon: 'Star',
        color: 'text-yellow-600'
      },
      {
        label: 'Response Rate',
        value: `${Math.round(responseRate)}%`,
        change: responseRate,
        changeType: responseRate >= 80 ? 'increase' : 'decrease',
        icon: 'Clock',
        color: 'text-purple-600'
      }
    ];

    return {
      metrics,
      earnings: {
        total: totalEarnings,
        data: earningsData
      },
      bookings: {
        total: bookings.length,
        data: bookingsData
      },
      ratings: {
        average: averageRating,
        total: ratings.length,
        distribution: ratingDistribution
      },
      performance: {
        responseRate,
        completionRate,
        onTimeRate,
        satisfactionRate
      }
    };
  }

  private groupByDate(items: any[], dateField: string, valueField: string | 'count') {
    const groups = items.reduce((acc: { [key: string]: number }, item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      if (valueField === 'count') {
        acc[date] = (acc[date] || 0) + 1;
      } else {
        acc[date] = (acc[date] || 0) + (item[valueField] || 0);
      }
      return acc;
    }, {});

    return Object.entries(groups).map(([date, value]) => ({
      date,
      amount: value
    }));
  }

  async getAnalytics(workerId: string, period: string = 'last-30-days'): Promise<AnalyticsData> {
    const cacheKey = `analytics-${workerId}-${period}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const periodDates = this.getPeriodDates(period);

    const [bookings, earnings, ratings] = await Promise.all([
      this.getBookingsInPeriod(workerId, periodDates),
      this.getEarningsInPeriod(workerId, periodDates),
      this.getRatingsInPeriod(workerId, periodDates)
    ]);

    const analytics = this.calculateMetrics(bookings, earnings, ratings, periodDates);

    this.cache.set(cacheKey, {
      data: analytics,
      timestamp: Date.now()
    });

    return analytics;
  }

  clearCache(workerId?: string) {
    if (workerId) {
      // Clear specific worker's cache
      Array.from(this.cache.keys())
        .filter(key => key.includes(workerId))
        .forEach(key => this.cache.delete(key));
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }
}

export const workerAnalyticsService = new WorkerAnalyticsService(); 