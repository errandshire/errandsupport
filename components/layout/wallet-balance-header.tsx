"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wallet, 
  Plus, 
  RefreshCw, 
  Zap, 
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff
} from "lucide-react";
import { VirtualWalletService } from "@/lib/virtual-wallet-service";
import type { VirtualWallet } from "@/lib/virtual-wallet-service";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import Link from "next/link";

interface WalletBalanceHeaderProps {
  showBalance?: boolean;
  onTopUpClick?: () => void;
  className?: string;
  variant?: 'full' | 'compact' | 'minimal';
}

export function WalletBalanceHeader({ 
  showBalance = true, 
  onTopUpClick,
  className = "",
  variant = 'full'
}: WalletBalanceHeaderProps) {
  const { user } = useAuth();
  const [virtualWallet, setVirtualWallet] = React.useState<VirtualWallet | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = React.useState(true);

  // Load wallet data
  const loadWallet = React.useCallback(async () => {
    if (!user || user.role !== 'client') return;
    
    try {
      setIsLoading(true);
      setError(null);

      const wallet = await VirtualWalletService.getUserWallet(user.$id);
      if (!wallet) {
        // Initialize wallet if it doesn't exist
        const newWallet = await VirtualWalletService.initializeWallet(user.$id);
        setVirtualWallet(newWallet);
      } else {
        setVirtualWallet(wallet);
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
      setError('Failed to load wallet');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Don't show for non-clients
  if (!user || user.role !== 'client') {
    return null;
  }

  const handleTopUp = () => {
    if (onTopUpClick) {
      onTopUpClick();
    } else {
      window.location.href = '/client/wallet';
    }
  };

  const hasLowBalance = virtualWallet && virtualWallet.availableBalance < 5000; // Less than 5K NGN
  const hasVeryLowBalance = virtualWallet && virtualWallet.availableBalance < 1000; // Less than 1K NGN

  // Minimal variant - just balance and top-up button
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading wallet...</span>
          </div>
        ) : error ? (
          <Button variant="outline" size="sm" onClick={loadWallet}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              <span className="font-medium">
                {isBalanceVisible 
                  ? `₦${virtualWallet?.availableBalance.toLocaleString() || '0'}`
                  : '₦****'
                }
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              >
                {isBalanceVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            <Button size="sm" onClick={handleTopUp}>
              <Plus className="h-3 w-3 mr-1" />
              Top Up
            </Button>
          </>
        )}
      </div>
    );
  }

  // Compact variant - single line with balance and actions
  if (variant === 'compact') {
    return (
      <Card className={`${className} ${hasVeryLowBalance ? 'border-red-200 bg-red-50' : hasLowBalance ? 'border-orange-200 bg-orange-50' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasVeryLowBalance ? 'bg-red-100' : hasLowBalance ? 'bg-orange-100' : 'bg-blue-100'
              }`}>
                <Wallet className={`h-4 w-4 ${
                  hasVeryLowBalance ? 'text-red-600' : hasLowBalance ? 'text-orange-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Wallet Balance</span>
                  {hasVeryLowBalance && <Badge variant="destructive" className="text-xs">Very Low</Badge>}
                  {hasLowBalance && !hasVeryLowBalance && <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">Low</Badge>}
                </div>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-gray-500">Loading...</span>
                  </div>
                ) : error ? (
                  <span className="text-xs text-red-600">{error}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {isBalanceVisible 
                        ? `₦${virtualWallet?.availableBalance.toLocaleString() || '0'}`
                        : '₦****'
                      }
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                    >
                      {isBalanceVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleTopUp}>
                <Plus className="h-3 w-3 mr-1" />
                Top Up
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/client/wallet">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant - complete wallet overview
  return (
    <div className={className}>
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Your Wallet</h3>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <Zap className="h-3 w-3 mr-1" />
                    Instant Booking
                  </Badge>
                </div>
                <p className="text-blue-100 text-sm">Ready for instant service bookings</p>
              </div>
            </div>
            <div className="text-right">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <div>
                  <p className="text-sm text-red-200">Error loading balance</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:text-blue-100 p-0 h-auto"
                    onClick={loadWallet}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-2xl font-bold">
                      {isBalanceVisible 
                        ? `₦${virtualWallet?.availableBalance.toLocaleString() || '0'}`
                        : '₦****'
                      }
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:text-blue-100 h-6 w-6 p-0"
                      onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                    >
                      {isBalanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-blue-100 text-sm">Available Balance</p>
                </>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button 
              variant="secondary" 
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={handleTopUp}
            >
              <Plus className="h-4 w-4 mr-2" />
              Top Up Wallet
            </Button>
            <Button 
              variant="ghost" 
              className="text-white hover:text-blue-100"
              asChild
            >
              <Link href="/client/wallet">
                View Wallet
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Low Balance Alert */}
      {(hasLowBalance || hasVeryLowBalance) && !isLoading && !error && (
        <Alert className={`mt-3 ${hasVeryLowBalance ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
          <AlertCircle className={`h-4 w-4 ${hasVeryLowBalance ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertDescription className={hasVeryLowBalance ? 'text-red-800' : 'text-orange-800'}>
            <div className="flex items-center justify-between">
              <span>
                {hasVeryLowBalance 
                  ? 'Your wallet balance is very low. Top up now to avoid booking interruptions.'
                  : 'Your wallet balance is getting low. Consider topping up for seamless bookings.'
                }
              </span>
              <Button 
                variant="outline" 
                size="sm"
                className={hasVeryLowBalance ? 'border-red-300 text-red-600 hover:bg-red-100' : 'border-orange-300 text-orange-600 hover:bg-orange-100'}
                onClick={handleTopUp}
              >
                Top Up Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 