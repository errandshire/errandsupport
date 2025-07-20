"use client";

import * as React from "react";
import { Calendar, Clock, MapPin, CreditCard, Check, ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { WorkerProfile, BookingRequest } from "@/lib/types/marketplace";
import { paystack } from "@/lib/paystack";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  onBookingSubmit: (booking: Partial<BookingRequest>) => Promise<void>;
}

type BookingStep = 'details' | 'scheduling' | 'payment' | 'confirmation';

interface StepProgressProps {
  currentStep: BookingStep;
  steps: { id: BookingStep; label: string; icon: React.ReactNode }[];
}

function StepProgress({ currentStep, steps }: StepProgressProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  isActive && "bg-green-600 text-white",
                  isCompleted && "bg-green-600 text-white",
                  isUpcoming && "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium",
                isActive && "text-green-600",
                isCompleted && "text-green-600",
                isUpcoming && "text-gray-500"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-4 transition-colors",
                index < currentIndex ? "bg-green-600" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface BookingDetailsStepProps {
  formData: Partial<BookingRequest>;
  onFormDataChange: (data: Partial<BookingRequest>) => void;
  worker: WorkerProfile;
}

function BookingDetailsStep({ formData, onFormDataChange, worker }: BookingDetailsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
              placeholder="e.g., House cleaning for 3-bedroom apartment"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              placeholder="Provide details about what you need done..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location?.address || ""}
              onChange={(e) => onFormDataChange({ 
                ...formData, 
                location: { ...formData.location, address: e.target.value } 
              })}
              placeholder="Enter full address"
            />
          </div>

          <div>
            <Label htmlFor="urgency">Urgency Level</Label>
            <Select
              value={formData.urgency || "medium"}
              onValueChange={(value) => onFormDataChange({ 
                ...formData, 
                urgency: value as "low" | "medium" | "high" 
              })}
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
    </div>
  );
}

interface SchedulingStepProps {
  formData: Partial<BookingRequest>;
  onFormDataChange: (data: Partial<BookingRequest>) => void;
  worker: WorkerProfile;
}

function SchedulingStep({ formData, onFormDataChange, worker }: SchedulingStepProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule & Timing</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Preferred Date *</Label>
            <Input
              id="date"
              type="date"
              min={today}
              value={formData.scheduledDate?.split('T')[0] || ""}
              onChange={(e) => onFormDataChange({ 
                ...formData, 
                scheduledDate: e.target.value + "T00:00:00Z"
              })}
            />
          </div>

          <div>
            <Label>Preferred Time</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {timeSlots.map((time) => {
                const isSelected = formData.scheduledDate?.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      const date = formData.scheduledDate?.split('T')[0] || today;
                      onFormDataChange({ 
                        ...formData, 
                        scheduledDate: `${date}T${time}:00Z`
                      });
                    }}
                    className={cn(
                      "p-2 text-sm rounded-lg border transition-colors",
                      isSelected 
                        ? "bg-green-600 text-white border-green-600" 
                        : "bg-white text-gray-700 border-gray-200 hover:border-green-600"
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="duration">Estimated Duration (hours) *</Label>
            <Select
              value={formData.estimatedDuration?.toString() || ""}
              onValueChange={(value) => onFormDataChange({ 
                ...formData, 
                estimatedDuration: parseInt(value)
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration..." />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 8].map((hours) => (
                  <SelectItem key={hours} value={hours.toString()}>
                    {hours} hour{hours > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Worker Availability</h4>
            <div className="text-sm text-blue-800">
              <p>Working Days: {worker && worker.availability && worker.availability.workingDays.join(', ')}</p>
              <p>Working Hours: {worker && worker.availability && worker.availability.workingHours.start} - {worker && worker.availability && worker.availability.workingHours.end}</p>
              <p>Response Time: Usually responds within {worker && worker.stats && worker.stats.responseTime} minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PaymentStepProps {
  formData: Partial<BookingRequest>;
  onFormDataChange: (data: Partial<BookingRequest>) => void;
  worker: WorkerProfile;
  onBookingSubmit: (booking: Partial<BookingRequest>) => Promise<void>;
}

function PaymentStep({ formData, onFormDataChange, worker, onBookingSubmit }: PaymentStepProps) {
  const { user } = useAuth();
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  
  const duration = formData.estimatedDuration || 1;
  const subtotal = worker.hourlyRate * duration;
  const platformFee = paystack.calculatePlatformFee(subtotal);
  const total = subtotal + platformFee;

  const handlePaymentTypeChange = (value: string) => {
    const isHourly = value === "hourly";
    const amount = isHourly ? worker.hourlyRate : total;
    
    onFormDataChange({ 
      ...formData, 
      budget: { 
        ...formData.budget,
        isHourly,
        amount,
        currency: worker.currency
      }
    });
  };

  const initializePayment = async () => {
    if (!user) {
      toast.error("Please log in to proceed with payment");
      return;
    }

    try {
      setIsProcessingPayment(true);
      
      // Generate booking ID if not already present
      const { ID } = await import('appwrite');
      const bookingId = formData.id || ID.unique();
      
      // Update form data with booking ID
      const updatedFormData = {
        ...formData,
        id: bookingId
      };
      onFormDataChange(updatedFormData);
      
      // Create booking in database before payment
      const bookingData: Partial<BookingRequest> = {
        ...updatedFormData,
        workerId: worker.userId || worker.id, // Use userId first, then fallback
        categoryId: worker.categories[0], // Use first category
      };
      
      try {
        // Create the booking first
        await onBookingSubmit(bookingData);
      } catch (error) {
        console.error('Failed to create booking:', error);
        setIsProcessingPayment(false);
        return; // Stop payment flow if booking creation fails
      }
      
      const paymentReference = paystack.generateReference('booking');
      const paymentData = {
        email: user.email,
        amount: total * 100, // Convert to kobo
        currency: 'NGN',
        reference: paymentReference,
        callback_url: `${window.location.origin}/payment/callback`,
        metadata: {
          bookingId: bookingId,
          clientId: user.$id,
          workerId: worker.userId || worker.id, // Use userId first, then fallback
          type: 'booking_payment' as const,
          workerName: worker.displayName,
          serviceName: formData.title || 'Service Booking'
        }
      };

      const response = await paystack.initializePayment(paymentData);
      
      if (response.status) {
        // Store payment reference in form data
        onFormDataChange({
          ...updatedFormData,
          paymentReference,
          paymentStatus: 'pending'
        });
        
        // Redirect to Paystack payment page
        window.location.href = response.data.authorization_url;
      } else {
        throw new Error(response.message || 'Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error("Failed to initialize payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment & Budget</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Budget Type</Label>
            <RadioGroup
              value={formData.budget?.isHourly ? "hourly" : "fixed"}
              onValueChange={handlePaymentTypeChange}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hourly" id="hourly" />
                <Label htmlFor="hourly">Hourly Rate (₦{worker.hourlyRate.toLocaleString()}/hr)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed">Fixed Price</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.budget?.isHourly === false && (
            <div>
              <Label htmlFor="fixedAmount">Fixed Amount (₦)</Label>
              <Input
                id="fixedAmount"
                type="number"
                min="0"
                step="100"
                value={formData.budget?.amount || 0}
                onChange={(e) => onFormDataChange({ 
                  ...formData, 
                  budget: { 
                    ...formData.budget,
                    amount: parseFloat(e.target.value) || 0,
                    currency: worker.currency,
                    isHourly: false
                  }
                })}
                className="mt-1"
              />
            </div>
          )}

          {/* Payment Breakdown */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Payment Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Service ({duration}h × ₦{worker.hourlyRate.toLocaleString()})</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee (5%)</span>
                <span>₦{platformFee.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>₦{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Escrow Notice */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">🔒 Secure Escrow Payment</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your payment is held securely until job completion</li>
              <li>• Worker gets paid only after you confirm satisfaction</li>
              <li>• Full refund if service is not delivered</li>
              <li>• Powered by Paystack for secure transactions</li>
            </ul>
          </div>

          {/* Payment Button */}
          <Button 
            onClick={initializePayment}
            disabled={isProcessingPayment || !formData.budget?.amount}
            className="w-full"
            size="lg"
          >
            {isProcessingPayment ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              `Pay ₦${total.toLocaleString()} with Paystack`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmationStepProps {
  formData: Partial<BookingRequest>;
  worker: WorkerProfile;
  onConfirm: () => void;
  isSubmitting: boolean;
}

function ConfirmationStep({ formData, worker, onConfirm, isSubmitting }: ConfirmationStepProps) {
  const duration = formData.estimatedDuration || 1;
  const total = (worker.hourlyRate * duration) * 1.05; // Including 5% fee

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Confirmation</h3>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Booking Summary</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Service:</span> {formData.title}</div>
              <div><span className="font-medium">Worker:</span> {worker.displayName}</div>
              <div><span className="font-medium">Date:</span> {formData.scheduledDate?.split('T')[0]}</div>
              <div><span className="font-medium">Duration:</span> {duration} hours</div>
              <div><span className="font-medium">Location:</span> {formData.location?.address}</div>
              <div><span className="font-medium">Total Cost:</span> ₦{total.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your booking request will be sent to {worker.displayName}</li>
              <li>• You'll receive a response within {worker.responseTimeMinutes} minutes</li>
              <li>• Payment will be held in escrow until job completion</li>
              <li>• You can message the worker directly through our platform</li>
            </ul>
          </div>

          <Button 
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              "Confirm Booking"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BookingModal({ isOpen, onClose, worker, onBookingSubmit }: BookingModalProps) {
  const [currentStep, setCurrentStep] = React.useState<BookingStep>('details');
  const [formData, setFormData] = React.useState<Partial<BookingRequest>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const steps = [
    { id: 'details' as BookingStep, label: 'Details', icon: <MapPin className="h-5 w-5" /> },
    { id: 'scheduling' as BookingStep, label: 'Schedule', icon: <Calendar className="h-5 w-5" /> },
    { id: 'payment' as BookingStep, label: 'Payment', icon: <CreditCard className="h-5 w-5" /> },
    { id: 'confirmation' as BookingStep, label: 'Confirm', icon: <Check className="h-5 w-5" /> },
  ];

  const handleNext = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleConfirmBooking = async () => {
    if (!worker) return;
    
    // Since booking is now created during payment initialization,
    // this step just closes the modal
    onClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'details':
        return formData.title && formData.description && formData.location?.address;
      case 'scheduling':
        return formData.scheduledDate && formData.estimatedDuration;
      case 'payment':
        return formData.budget?.amount;
      default:
        return true;
    }
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setCurrentStep('details');
      setFormData({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!worker) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={worker.profileImage} alt={worker.displayName} />
              <AvatarFallback>
                {worker.displayName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">Book {worker.displayName}</h2>
              <p className="text-sm text-gray-600">₦{worker.hourlyRate.toLocaleString()}/hour</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          <StepProgress currentStep={currentStep} steps={steps} />

          <div className="min-h-96">
            {currentStep === 'details' && (
              <BookingDetailsStep
                formData={formData}
                onFormDataChange={setFormData}
                worker={worker}
              />
            )}
            {currentStep === 'scheduling' && (
              <SchedulingStep
                formData={formData}
                onFormDataChange={setFormData}
                worker={worker}
              />
            )}
            {currentStep === 'payment' && (
              <PaymentStep
                formData={formData}
                onFormDataChange={setFormData}
                worker={worker}
                onBookingSubmit={onBookingSubmit}
              />
            )}
            {currentStep === 'confirmation' && (
              <ConfirmationStep
                formData={formData}
                worker={worker}
                onConfirm={handleConfirmBooking}
                isSubmitting={isSubmitting}
              />
            )}
          </div>

          {currentStep !== 'confirmation' && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 'details'}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 