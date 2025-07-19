"use client";

import * as React from "react";
import { Wallet, TrendingUp, TrendingDown, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EscrowUtils } from "@/lib/escrow-utils";
import type { UserBalance } from "@/lib/types";

interface BalanceCardProps {
  balance: UserBalance | null;
  userRole: 'worker' | 'client' | 'admin';
  isLoading?: boolean;
  showDetails?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function BalanceCard({ 
  balance, 
  userRole, 
  isLoading = false, 
  showDetails = true,
  onRefresh,
  className 
}: BalanceCardProps) {
  const [showBalance, setShowBalance] = React.useState(true);

  // Calculate totals and trends
  const availableBalance = balance?.availableBalance || 0;
  const pendingBalance = balance?.pendingBalance || 0;
  const totalEarnings = balance?.totalEarnings || 0;
  const totalWithdrawn = balance?.totalWithdrawn || 0;
  const totalBalance = availableBalance + pendingBalance;

  // Role-specific configurations
  const getRoleConfig = () => {
    switch (userRole) {
      case 'worker':
        return {
          title: "Your Wallet",
          primaryLabel: "Available Balance",
          secondaryLabel: "Pending Payments",
          showWithdrawn: true,
          color: "emerald"
        };
      case 'client':
        return {
          title: "Payment Summary",
          primaryLabel: "Total Spent",
          secondaryLabel: "Pending Payments",
          showWithdrawn: false,
          color: "blue"
        };
      case 'admin':
        return {
          title: "Financial Overview",
          primaryLabel: "Total Balance",
          secondaryLabel: "Pending Escrows",
          showWithdrawn: true,
          color: "purple"
        };
      default:
        return {
          title: "Wallet",
          primaryLabel: "Balance",
          secondaryLabel: "Pending",
          showWithdrawn: false,
          color: "gray"
        };
    }
  };

  const config = getRoleConfig();

  const formatCurrency = (amount: number) => {
    if (!showBalance) return "••••••";
    return EscrowUtils.formatAmount(amount);
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {config.title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary Balance */}
        <div className="space-y-1">
          <p className="text-sm text-gray-600">{config.primaryLabel}</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(userRole === 'client' ? totalEarnings : availableBalance)}
          </p>
        </div>

        {/* Balance Breakdown */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-4">
            {/* Available/Secondary Balance */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{config.secondaryLabel}</p>
              <p className="text-lg font-semibold text-gray-800">
                {formatCurrency(pendingBalance)}
              </p>
              {pendingBalance > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {userRole === 'worker' ? 'In Escrow' : 'Processing'}
                </Badge>
              )}
            </div>

            {/* Total Earnings/Withdrawn */}
            {config.showWithdrawn && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {userRole === 'worker' ? 'Total Earned' : 'Total Withdrawn'}
                </p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatCurrency(userRole === 'worker' ? totalEarnings : totalWithdrawn)}
                </p>
                {totalEarnings > 0 && userRole === 'worker' && (
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Lifetime
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No Balance State */}
        {!balance && !isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">No transactions yet</p>
            <p className="text-xs text-gray-400">
              {userRole === 'worker' 
                ? 'Start accepting jobs to see your earnings here'
                : 'Make your first booking to see payment history'
              }
            </p>
          </div>
        )}

        {/* Last Updated */}
        {balance?.updatedAt && showDetails && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Last updated: {new Date(balance.updatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 