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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  CreditCard,
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  Info,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { VirtualWalletService } from "@/lib/virtual-wallet-service";
import { paystack } from "@/lib/paystack";
import type { WorkerProfile, BookingRequest } from "@/lib/types/marketplace";
import type { VirtualWallet } from "@/lib/virtual-wallet-service";
import { toast } from "sonner";

interface EnhancedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  onBookingSubmit: (bookingData: Partial<BookingRequest>) => Promise<void>;
}

interface PaymentMethod {
  id: 'wallet' | 'card';
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  benefits?: string[];
}

export function EnhancedBookingModal({
  isOpen,
  onClose,
  worker,
  onBookingSubmit
}: EnhancedBookingModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [virtualWallet, setVirtualWallet] = React.useState<VirtualWallet | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<'wallet' | 'card'>('card');

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
  React.useEffect(() => {
    async function loadWallet() {
      if (!user) return;
      
      try {
        const wallet = await VirtualWalletService.getUserWallet(user.$id);
        setVirtualWallet(wallet);
      } catch (error) {
        console.error('Error loading wallet:', error);
      }
    }

    if (isOpen && user) {
      loadWallet();
    }
  }, [isOpen, user]);

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
      setSelectedPaymentMethod('card');
    }
  }, [isOpen]);

  // Calculate totals
  const platformFee = formData.budget.amount * 0.05; // 5% platform fee
  const total = formData.budget.amount + platformFee;

  // Payment method options
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'wallet',
      name: 'Virtual Wallet',
      description: 'Pay instantly from your wallet balance',
      icon: <Wallet className="h-5 w-5" />,
      available: virtualWallet ? virtualWallet.availableBalance >= total : false,
      benefits: [
        'Instant booking confirmation',
        'No payment processing delays',
        'Secure escrow protection'
      ]
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Pay securely with your card via Paystack',
      icon: <CreditCard className="h-5 w-5" />,
      available: true,
      benefits: [
        'Secure payment processing',
        'All major cards accepted',
        'Escrow protection included'
      ]
    }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || !worker) {
      toast.error("Please log in to book a service");
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
        workerId: worker.userId || worker.$id, // Use userId first, then fallback to $id
        categoryId: worker.categories?.[0] || 'general'
      };

      if (selectedPaymentMethod === 'wallet') {
        // Process instant wallet payment
        const paymentResult = await VirtualWalletService.makeInstantPayment({
          userId: user.$id,
          bookingId,
          amount: total,
          workerId: worker.userId || worker.$id, // Use userId first, then fallback to $id
          clientId: user.$id,
          description: formData.title || 'Service Booking'
        });

        if (paymentResult.success) {
          // Submit booking
          await onBookingSubmit(bookingData);
          
          toast.success("Booking confirmed! Payment processed instantly from your wallet.");
          onClose();
        } else {
          toast.error(paymentResult.message);
        }
      } else {
        // Process card payment via Paystack
        await onBookingSubmit(bookingData);
        
        const paymentReference = paystack.generateReference('booking');
        const paymentData = {
          email: user.email,
          amount: total * 100, // Convert to kobo
          currency: 'NGN',
          reference: paymentReference,
          callback_url: `${window.location.origin}/payment/callback`,
          metadata: {
            bookingId,
            clientId: user.$id,
            workerId: worker.userId || worker.$id, // Use userId first, then fallback to $id
            type: 'booking_payment' as const,
            workerName: worker.name || worker.displayName,
            serviceName: formData.title || 'Service Booking'
          }
        };

        const response = await paystack.initializePayment(paymentData);

        if (response.status && response.data.authorization_url) {
          // Redirect to payment page
          window.location.href = response.data.authorization_url;
        } else {
          toast.error("Failed to initialize payment");
        }
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl font-serif">
            Book Service with {worker.name || worker.displayName}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Complete your booking details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Wallet Balance Card - Compact version */}
          {virtualWallet && virtualWallet.availableBalance > 0 && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Wallet className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-blue-100">Wallet Balance</p>
                    <p className="text-base sm:text-lg font-bold truncate">₦{virtualWallet.availableBalance.toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  <Zap className="h-3 w-3 mr-1" />
                  Instant
                </Badge>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          <div className="flex items-center justify-between">
          {[1, 2].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                  step <= currentStep ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                <span className="text-xs mt-1 text-gray-600 hidden sm:block">
                  {step === 1 ? 'Details' : 'Payment'}
                </span>
              </div>
              {step < 2 && (
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  step < currentStep ? 'bg-emerald-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
          </div>

          {/* Step 1: Service Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">Service Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="What service do you need?"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what you need in detail"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm">Scheduled Date *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-sm">Duration (hours) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.estimatedDuration}
                  onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value))}
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm">Location *</Label>
              <Input
                id="location"
                value={formData.location.address}
                onChange={(e) => handleInputChange('location', {
                  ...formData.location,
                  address: e.target.value
                })}
                placeholder="Enter your address"
                className="h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-sm">Budget (₦) *</Label>
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
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency" className="text-sm">Urgency</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => handleInputChange('urgency', value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </div>
          )}

          {/* Step 2: Payment Method */}
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
                  <Badge variant={formData.urgency === 'high' ? 'destructive' : 'default'}>
                    {formData.urgency} priority
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Breakdown</CardTitle>
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
              </CardContent>
            </Card>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your payment is protected by escrow. Funds are only released to the worker when you confirm the job is completed.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 3: Payment Method */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Choose Payment Method</Label>
              <p className="text-sm text-gray-600 mb-4">Select how you'd like to pay for this service</p>
              
              <RadioGroup value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as 'wallet' | 'card')}>
                {paymentMethods.map((method) => (
                  <div key={method.id} className="relative">
                    <Label 
                      htmlFor={method.id}
                      className={`flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentMethod === method.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : method.available 
                            ? 'border-gray-200 hover:border-gray-300' 
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <RadioGroupItem 
                        value={method.id} 
                        id={method.id}
                        disabled={!method.available}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {method.icon}
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-gray-600">{method.description}</p>
                          </div>
                          {method.id === 'wallet' && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                              <Zap className="h-3 w-3 mr-1" />
                              Instant
                            </Badge>
                          )}
                        </div>
                        
                        {method.available && method.benefits && (
                          <ul className="text-xs text-gray-600 space-y-1">
                            {method.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        )}

                        {method.id === 'wallet' && virtualWallet && (
                          <div className="mt-2 p-2 bg-white rounded border">
                            <p className="text-xs text-gray-600 mb-1">Wallet Balance</p>
                            <p className="font-medium">₦{virtualWallet.availableBalance.toLocaleString()}</p>
                            {virtualWallet.availableBalance < total && (
                              <p className="text-xs text-red-600 mt-1">
                                Insufficient balance. Need ₦{(total - virtualWallet.availableBalance).toLocaleString()} more.
                              </p>
                            )}
                          </div>
                        )}

                        {method.id === 'wallet' && !virtualWallet && (
                          <Alert className="mt-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Virtual wallet not found. It will be created automatically.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {selectedPaymentMethod === 'wallet' && virtualWallet !== null && virtualWallet.availableBalance < total && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  You need to top up your wallet with ₦{(total - virtualWallet.availableBalance).toLocaleString()} to use wallet payment.
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-orange-600 hover:text-orange-700"
                    onClick={() => {
                      onClose();
                      // Navigate to wallet page
                      window.location.href = '/client/wallet';
                    }}
                  >
                    Top up now
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total to pay:</span>
                  <span className="text-xl font-bold">₦{total.toLocaleString()}</span>
                </div>
                {selectedPaymentMethod === 'wallet' && (
                  <p className="text-sm text-green-600 mt-1">
                    <Zap className="h-3 w-3 inline mr-1" />
                    Instant confirmation - no payment delays!
                  </p>
                )}
              </CardContent>
            </Card>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={isProcessing}
            className="h-12 w-full sm:w-auto order-2 sm:order-1"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 2 ? (
            <Button
              onClick={handleNext}
              disabled={!formData.title || !formData.budget.amount}
              className="h-12 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 order-1 sm:order-2"
            >
              Continue to Payment
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || (selectedPaymentMethod === 'wallet' && virtualWallet !== null && virtualWallet.availableBalance < total)}
              className="h-12 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 order-1 sm:order-2"
            >
              {isProcessing ? 'Processing...' :
               selectedPaymentMethod === 'wallet' ? 'Book Instantly' : 'Proceed to Payment'}
            </Button>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 