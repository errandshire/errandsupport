"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowRight,
  Plus,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { VirtualWalletService } from "@/lib/virtual-wallet-service";
import type { WorkerProfile, BookingRequest } from "@/lib/types/marketplace";
import type { VirtualWallet } from "@/lib/virtual-wallet-service";
import { toast } from "sonner";
import Link from "next/link";

interface WalletOnlyBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  onBookingSubmit: (bookingData: Partial<BookingRequest>) => Promise<void>;
}

export function WalletOnlyBookingModal({
  isOpen,
  onClose,
  worker,
  onBookingSubmit
}: WalletOnlyBookingModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [virtualWallet, setVirtualWallet] = React.useState<VirtualWallet | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = React.useState(true);
  const [walletError, setWalletError] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    location: { address: '', coordinates: { lat: 0, lng: 0 } },
    scheduledDate: '',
    estimatedDuration: 1,
    budget: { amount: 0, currency: 'NGN', isHourly: false },
    urgency: 'medium' as 'low' | 'medium' | 'high',
    requirements: [] as string[],
    attachments: [] as string[]
  });

  // Load user's virtual wallet
  const loadWallet = React.useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoadingWallet(true);
      setWalletError(null);

      const wallet = await VirtualWalletService.getUserWallet(user.$id);
      if (!wallet) {
        // Initialize wallet if it doesn't exist
        const newWallet = await VirtualWalletService.initializeWallet(user.$id);
        setVirtualWallet(newWallet);
      } else {
        setVirtualWallet(wallet);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      setWalletError('Failed to load wallet. Please try again.');
    } finally {
      setIsLoadingWallet(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (isOpen && user) {
      loadWallet();
    }
  }, [isOpen, user, loadWallet]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setFormData({
        title: '',
        description: '',
        location: { address: '', coordinates: { lat: 0, lng: 0 } },
        scheduledDate: '',
        estimatedDuration: 1,
        budget: { amount: 0, currency: 'NGN', isHourly: false },
        urgency: 'medium',
        requirements: [],
        attachments: []
      });
    }
  }, [isOpen]);

  // Calculate totals
  const platformFee = formData.budget.amount * 0.05; // 5% platform fee
  const total = formData.budget.amount + platformFee;

  // Check if wallet has sufficient funds
  const hasSufficientFunds = virtualWallet ? virtualWallet.availableBalance >= total : false;
  const shortfall = virtualWallet ? Math.max(0, total - virtualWallet.availableBalance) : total;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || !worker || !virtualWallet) {
      toast.error("Please log in to book a service");
      return;
    }

    if (!hasSufficientFunds) {
      toast.error("Insufficient wallet balance. Please top up your wallet first.");
      return;
    }

    try {
      setIsProcessing(true);
      
      // Generate booking ID
      const { ID } = await import('appwrite');
      const bookingId = ID.unique();
      
      const bookingData: Partial<BookingRequest> = {
        id: bookingId,
        ...formData,
        workerId: worker.userId || worker.$id, // Use userId first, then fallback
        categoryId: worker.categories?.[0] || 'general'
      };

      // Process instant wallet payment
      const paymentResult = await VirtualWalletService.makeInstantPayment({
        userId: user.$id,
        bookingId,
        amount: total,
        workerId: worker.userId || worker.$id, // Use userId first, then fallback
        clientId: user.$id,
        description: formData.title || 'Service Booking'
      });

      if (paymentResult.success) {
        // Submit booking
        await onBookingSubmit(bookingData);
        
        toast.success("🎉 Booking confirmed! Payment processed instantly from your wallet.");
        onClose();
        
        // Refresh wallet data
        await loadWallet();
      } else {
        toast.error(paymentResult.message);
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error("Failed to process booking. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!worker) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-500" />
            Book Service with {worker.name || worker.displayName}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 ? 'Complete your booking details' : 'Review and confirm your booking'}
          </DialogDescription>
        </DialogHeader>

        {/* Wallet Balance Card - Always Visible */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Wallet Balance</p>
                  <p className="text-blue-100 text-sm">Available for instant booking</p>
                </div>
              </div>
              <div className="text-right">
                {isLoadingWallet ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : walletError ? (
                  <div className="text-red-200">
                    <p className="text-sm">Error loading balance</p>
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
                    <p className="text-2xl font-bold">
                      ₦{virtualWallet?.availableBalance.toLocaleString() || '0'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Zap className="h-3 w-3" />
                      <span className="text-xs">Instant payments</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
              </div>
              {step < 2 && (
                <div className={`w-12 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Service Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Service Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="What service do you need?"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what you need in detail"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Scheduled Date</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.estimatedDuration}
                  onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location.address}
                onChange={(e) => handleInputChange('location', { 
                  ...formData.location, 
                  address: e.target.value 
                })}
                placeholder="Enter your address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Budget (₦)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="500"
                  value={formData.budget.amount}
                  onChange={(e) => handleInputChange('budget', {
                    ...formData.budget,
                    amount: parseFloat(e.target.value) || 0
                  })}
                  placeholder="Enter your budget"
                />
              </div>
              <div>
                <Label htmlFor="urgency">Urgency</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => handleInputChange('urgency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Flexible timing</SelectItem>
                    <SelectItem value="medium">Medium - Within a week</SelectItem>
                    <SelectItem value="high">High - ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review & Confirm */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formData.title || 'Service Booking'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{formData.estimatedDuration} hour(s) - {formData.scheduledDate ? new Date(formData.scheduledDate).toLocaleString() : 'Schedule TBD'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{formData.location.address || 'Location TBD'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span>₦{formData.budget.amount.toLocaleString()}</span>
                  <Badge variant={formData.urgency === 'high' ? 'destructive' : formData.urgency === 'medium' ? 'default' : 'secondary'}>
                    {formData.urgency} priority
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Service Fee</span>
                  <span>₦{formData.budget.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Platform Fee (5%)</span>
                  <span>₦{platformFee.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span>₦{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Method</span>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Wallet className="h-3 w-3" />
                    <span>Virtual Wallet</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Balance Check */}
            {!isLoadingWallet && !walletError && (
              <Card className={hasSufficientFunds ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasSufficientFunds ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className={`font-medium ${hasSufficientFunds ? 'text-green-800' : 'text-red-800'}`}>
                          {hasSufficientFunds ? 'Sufficient Balance' : 'Insufficient Balance'}
                        </p>
                        <p className={`text-sm ${hasSufficientFunds ? 'text-green-600' : 'text-red-600'}`}>
                          {hasSufficientFunds 
                            ? `₦${(virtualWallet!.availableBalance - total).toLocaleString()} will remain after booking`
                            : `You need ₦${shortfall.toLocaleString()} more to complete this booking`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Available</p>
                      <p className="font-bold">₦{virtualWallet?.availableBalance.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Insufficient funds alert */}
            {!hasSufficientFunds && !isLoadingWallet && !walletError && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="flex items-center justify-between">
                    <span>You need to top up your wallet to complete this booking.</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-orange-600 border-orange-300 hover:bg-orange-100"
                      onClick={() => {
                        onClose();
                        window.location.href = '/client/wallet';
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Top Up Now
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Wallet service error */}
            {walletError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="flex items-center justify-between">
                    <span>{walletError}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-100"
                      onClick={loadWallet}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-blue-500" />
                  <span>Your payment is protected by escrow and will be processed instantly from your wallet.</span>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={isProcessing}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {currentStep < 2 ? (
            <Button 
              onClick={handleNext}
              disabled={!formData.title || !formData.budget.amount}
            >
              Review Booking
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isProcessing || !hasSufficientFunds || isLoadingWallet || !!walletError}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Book Instantly
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 