"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Eye,
  Filter,
  CreditCard,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface EarningsData {
  period: string;
  totalEarnings: number;
  totalJobs: number;
  averagePerJob: number;
  change: number;
  changeType: "increase" | "decrease";
}

interface Transaction {
  id: string;
  date: string;
  client: string;
  jobTitle: string;
  amount: number;
  status: "completed" | "pending" | "processing";
  method: "escrow" | "direct" | "tip";
}

const earningsData: EarningsData[] = [
  {
    period: "This Month",
    totalEarnings: 125000,
    totalJobs: 15,
    averagePerJob: 8333,
    change: 15.5,
    changeType: "increase"
  },
  {
    period: "Last Month",
    totalEarnings: 98000,
    totalJobs: 12,
    averagePerJob: 8167,
    change: 8.2,
    changeType: "increase"
  },
  {
    period: "This Year",
    totalEarnings: 890000,
    totalJobs: 98,
    averagePerJob: 9082,
    change: 23.1,
    changeType: "increase"
  }
];

const transactions: Transaction[] = [
  {
    id: "1",
    date: "2024-01-15",
    client: "Sarah Johnson",
    jobTitle: "House Cleaning Service",
    amount: 15000,
    status: "completed",
    method: "escrow"
  },
  {
    id: "2",
    date: "2024-01-14",
    client: "David Wilson",
    jobTitle: "Plumbing Repair",
    amount: 8000,
    status: "processing",
    method: "escrow"
  },
  {
    id: "3",
    date: "2024-01-13",
    client: "Maria Garcia",
    jobTitle: "Garden Maintenance",
    amount: 12000,
    status: "completed",
    method: "direct"
  },
  {
    id: "4",
    date: "2024-01-12",
    client: "John Smith",
    jobTitle: "Electrical Work",
    amount: 2000,
    status: "completed",
    method: "tip"
  }
];

export default function WorkerEarningsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [selectedPeriod, setSelectedPeriod] = React.useState("This Month");
  const [selectedFilter, setSelectedFilter] = React.useState("all");

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/earnings");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  const currentData = earningsData.find(data => data.period === selectedPeriod) || earningsData[0];

  const filteredTransactions = transactions.filter(transaction => {
    if (selectedFilter === "all") return true;
    return transaction.status === selectedFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "escrow":
        return <Wallet className="h-4 w-4" />;
      case "direct":
        return <CreditCard className="h-4 w-4" />;
      case "tip":
        return <PiggyBank className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      

      <div className="flex-1 flex flex-col lg:ml-0">
        
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  Earnings
                </h1>
                <p className="text-neutral-600">
                  Track your income and financial performance
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="This Month">This Month</SelectItem>
                    <SelectItem value="Last Month">Last Month</SelectItem>
                    <SelectItem value="This Year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      {currentData.changeType === "increase" ? (
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                      )}
                      {currentData.change}%
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-neutral-900">
                      ₦{currentData.totalEarnings.toLocaleString()}
                    </h3>
                    <p className="text-sm text-neutral-600">
                      Total Earnings ({selectedPeriod})
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <Badge variant="outline">{currentData.totalJobs} jobs</Badge>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-neutral-900">
                      ₦{currentData.averagePerJob.toLocaleString()}
                    </h3>
                    <p className="text-sm text-neutral-600">
                      Average per Job
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="text-sm text-neutral-600">Monthly Goal</div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-neutral-900">
                      83%
                    </h3>
                    <p className="text-sm text-neutral-600 mb-2">
                      ₦{currentData.totalEarnings.toLocaleString()} of ₦150,000
                    </p>
                    <Progress value={83} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Your payment history and earnings</CardDescription>
                      </div>
                      <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Transactions</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Job</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {transaction.client}
                            </TableCell>
                            <TableCell>{transaction.jobTitle}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getMethodIcon(transaction.method)}
                                <span className="capitalize">{transaction.method}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(transaction.status)}>
                                {transaction.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ₦{transaction.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Earnings Breakdown</CardTitle>
                      <CardDescription>Revenue by service category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Cleaning Services</span>
                          <span className="text-sm text-neutral-600">₦45,000 (36%)</span>
                        </div>
                        <Progress value={36} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Plumbing</span>
                          <span className="text-sm text-neutral-600">₦32,000 (26%)</span>
                        </div>
                        <Progress value={26} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Garden Maintenance</span>
                          <span className="text-sm text-neutral-600">₦28,000 (22%)</span>
                        </div>
                        <Progress value={22} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Electrical</span>
                          <span className="text-sm text-neutral-600">₦20,000 (16%)</span>
                        </div>
                        <Progress value={16} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Methods</CardTitle>
                      <CardDescription>How you receive payments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Wallet className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">Escrow Payments</p>
                              <p className="text-sm text-neutral-600">Secure transactions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₦95,000</p>
                            <p className="text-sm text-neutral-600">76%</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">Direct Payments</p>
                              <p className="text-sm text-neutral-600">Immediate transfer</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₦25,000</p>
                            <p className="text-sm text-neutral-600">20%</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <PiggyBank className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="font-medium">Tips</p>
                              <p className="text-sm text-neutral-600">Bonus payments</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₦5,000</p>
                            <p className="text-sm text-neutral-600">4%</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="payouts" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payout Settings</CardTitle>
                    <CardDescription>Configure how you receive your earnings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-neutral-200 rounded-lg">
                          <h3 className="font-medium mb-2">Primary Bank Account</h3>
                          <p className="text-sm text-neutral-600 mb-3">
                            Zenith Bank - **** 1234
                          </p>
                          <Button variant="outline" size="sm">
                            Update Account
                          </Button>
                        </div>
                        
                        <div className="p-4 border border-neutral-200 rounded-lg">
                          <h3 className="font-medium mb-2">Payout Schedule</h3>
                          <p className="text-sm text-neutral-600 mb-3">
                            Weekly - Every Friday
                          </p>
                          <Button variant="outline" size="sm">
                            Change Schedule
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-medium text-blue-900 mb-2">Next Payout</h3>
                        <p className="text-sm text-blue-800">
                          ₦12,500 will be transferred to your account on Friday, Jan 19, 2024
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
      </div>
    </div>
  );
} 