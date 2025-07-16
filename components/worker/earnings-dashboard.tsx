"use client";

import * as React from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Download,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface EarningsData {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  currentMonthEarnings: number;
  averageJobValue: number;
  completedJobs: number;
  payoutHistory: PayoutRecord[];
  upcomingPayouts: PayoutRecord[];
}

interface PayoutRecord {
  id: string;
  bookingId: string;
  clientName: string;
  serviceName: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: string;
  payoutDate?: string;
  payoutReference?: string;
}

export function EarningsDashboard() {
  const { user } = useAuth();
  const [earnings, setEarnings] = React.useState<EarningsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedPayout, setSelectedPayout] = React.useState<PayoutRecord | null>(null);

  React.useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user]);

  const fetchEarningsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch completed bookings for this worker
      const bookingsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          { attribute: 'workerId', value: user!.$id },
          { attribute: 'status', value: 'completed' }
        ]
      );

      // Fetch payment records
      const paymentsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        [
          { attribute: 'workerId', value: user!.$id }
        ]
      );

      // Process earnings data
      const processedEarnings = processEarningsData(bookingsResponse.documents, paymentsResponse.documents);
      setEarnings(processedEarnings);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setIsLoading(false);
    }
  };

  const processEarningsData = (bookings: any[], payments: any[]): EarningsData => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let totalEarnings = 0;
    let pendingPayouts = 0;
    let completedPayouts = 0;
    let currentMonthEarnings = 0;
    let completedJobs = bookings.length;
    
    const payoutHistory: PayoutRecord[] = [];
    const upcomingPayouts: PayoutRecord[] = [];

    payments.forEach(payment => {
      const netAmount = payment.amount - (payment.amount * 0.05); // 5% platform fee
      totalEarnings += netAmount;
      
      const paymentDate = new Date(payment.createdAt);
      if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
        currentMonthEarnings += netAmount;
      }

      const payoutRecord: PayoutRecord = {
        id: payment.$id,
        bookingId: payment.bookingId,
        clientName: 'Client', // You'd fetch this from user data
        serviceName: 'Service', // You'd fetch this from booking data
        amount: payment.amount,
        platformFee: payment.amount * 0.05,
        netAmount,
        status: payment.status === 'released' ? 'completed' : payment.status === 'escrowed' ? 'pending' : 'processing',
        completedAt: payment.paidAt,
        payoutDate: payment.releasedAt,
        payoutReference: payment.transferReference
      };

      if (payoutRecord.status === 'completed') {
        completedPayouts += netAmount;
        payoutHistory.push(payoutRecord);
      } else {
        pendingPayouts += netAmount;
        upcomingPayouts.push(payoutRecord);
      }
    });

    const averageJobValue = completedJobs > 0 ? totalEarnings / completedJobs : 0;

    return {
      totalEarnings,
      pendingPayouts,
      completedPayouts,
      currentMonthEarnings,
      averageJobValue,
      completedJobs,
      payoutHistory: payoutHistory.sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()),
      upcomingPayouts: upcomingPayouts.sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <TrendingUp className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No earnings data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Earnings Dashboard</h2>
          <p className="text-gray-600">Track your income and payout history</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">₦{earnings.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-yellow-600">₦{earnings.pendingPayouts.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-blue-600">₦{earnings.currentMonthEarnings.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Jobs</p>
                <p className="text-2xl font-bold text-purple-600">{earnings.completedJobs}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Timeline */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming Payouts</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payouts</CardTitle>
              <CardDescription>
                Payments awaiting release after job completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.upcomingPayouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No upcoming payouts
                </div>
              ) : (
                <div className="space-y-4">
                  {earnings.upcomingPayouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{payout.clientName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{payout.serviceName}</p>
                          <p className="text-sm text-gray-600">Client: {payout.clientName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">₦{payout.netAmount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">After fees</p>
                        </div>
                        <Badge className={getStatusColor(payout.status)}>
                          {getStatusIcon(payout.status)}
                          <span className="ml-1 capitalize">{payout.status}</span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                Completed payments and transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.payoutHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payout history
                </div>
              ) : (
                <div className="space-y-4">
                  {earnings.payoutHistory.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{payout.clientName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{payout.serviceName}</p>
                          <p className="text-sm text-gray-600">
                            Paid on {formatDate(payout.payoutDate!)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium text-green-600">₦{payout.netAmount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">
                            Ref: {payout.payoutReference?.substring(0, 8)}...
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 