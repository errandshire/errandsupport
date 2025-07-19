"use client";

import * as React from "react";
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Eye, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EscrowUtils, TRANSACTION_TYPES, TRANSACTION_STATUS } from "@/lib/escrow-utils";
import type { Transaction, EscrowTransaction } from "@/lib/types";

interface TransactionListProps {
  transactions: Transaction[];
  escrowTransactions?: EscrowTransaction[];
  userRole: 'worker' | 'client' | 'admin';
  isLoading?: boolean;
  showFilters?: boolean;
  onViewDetail?: (transaction: Transaction | EscrowTransaction) => void;
  className?: string;
}

export function TransactionList({ 
  transactions, 
  escrowTransactions = [],
  userRole, 
  isLoading = false,
  showFilters = true,
  onViewDetail,
  className 
}: TransactionListProps) {
  const [filter, setFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');

  // Combine and sort transactions
  const allTransactions = React.useMemo(() => {
    const combined = [
      ...transactions.map(tx => ({ ...tx, source: 'transaction' as const })),
      ...escrowTransactions.map(tx => ({ 
        ...tx, 
        source: 'escrow' as const,
        type: 'escrow_payment',
        description: `Escrow payment for booking ${tx.bookingId}`,
        status: tx.status === 'held' ? 'pending' : tx.status === 'released' ? 'completed' : 'cancelled'
      }))
    ];

    return combined.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [transactions, escrowTransactions]);

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    let filtered = allTransactions;

    if (filter !== 'all') {
      filtered = filtered.filter(tx => tx.status === filter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    return filtered;
  }, [allTransactions, filter, typeFilter]);

  // Get transaction icon and color
  const getTransactionIcon = (type: string, amount: number) => {
    if (type.includes('escrow') || type.includes('payment')) {
      return amount > 0 ? ArrowDownLeft : ArrowUpRight;
    }
    if (type.includes('withdrawal') || type.includes('refund')) {
      return ArrowUpRight;
    }
    return Clock;
  };

  const getTransactionColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'released':
        return 'text-green-600';
      case 'pending':
      case 'held':
        return 'text-yellow-600';
      case 'failed':
      case 'cancelled':
      case 'refunded':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'released':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
      case 'held':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
      case 'cancelled':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="border-blue-200 text-blue-800">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transaction History</CardTitle>
          <div className="flex items-center gap-2">
            {showFilters && (
              <>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="escrow_payment">Payments</SelectItem>
                    <SelectItem value="escrow_hold">Escrow Hold</SelectItem>
                    <SelectItem value="escrow_release">Escrow Release</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    <SelectItem value="refund">Refunds</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-2">No transactions found</p>
            <p className="text-xs text-gray-400">
              {userRole === 'worker' 
                ? 'Your payment history will appear here'
                : 'Your booking payments will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => {
              const Icon = getTransactionIcon(transaction.type, transaction.amount);
              const isIncoming = transaction.type.includes('release') || 
                                transaction.type.includes('payment') && userRole === 'worker';
              
              return (
                <div
                  key={transaction.id || transaction.$id}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full",
                      isIncoming ? "bg-green-100" : "bg-blue-100"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        isIncoming ? "text-green-600" : "text-blue-600"
                      )} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                        {transaction.reference && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                            {transaction.reference.slice(-8)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-semibold",
                        isIncoming ? "text-green-600" : "text-gray-900"
                      )}>
                        {isIncoming ? '+' : ''}{EscrowUtils.formatAmount(transaction.amount)}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>

                    {onViewDetail && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewDetail(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="sm">
              Load More Transactions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 