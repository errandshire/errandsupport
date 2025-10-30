"use client";

import * as React from "react";
import { Star, AlertTriangle, CheckCircle, FileText, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ReviewService } from "@/lib/review-service";
import { cn } from "@/lib/utils";

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onRefresh?: () => void;
}

export function BookingConfirmationModal({ 
  isOpen, 
  onClose, 
  booking,
  onRefresh 
}: BookingConfirmationModalProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [action, setAction] = React.useState<'confirm' | 'dispute' | null>(null);
  
  // Confirmation state
  const [rating, setRating] = React.useState(0);
  const [hoveredRating, setHoveredRating] = React.useState(0);
  const [review, setReview] = React.useState('');
  const [tip, setTip] = React.useState('');
  
  // Dispute state
  const [disputeCategory, setDisputeCategory] = React.useState('');
  const [disputeDescription, setDisputeDescription] = React.useState('');
  const [evidence, setEvidence] = React.useState<string[]>([]);

  const disputeCategories = [
    { value: 'quality', label: 'Poor Quality of Work' },
    { value: 'incomplete', label: 'Work Not Completed' },
    { value: 'damage', label: 'Property Damage' },
    { value: 'time', label: 'Unreasonable Delays' },
    { value: 'communication', label: 'Poor Communication' },
    { value: 'other', label: 'Other Issue' }
  ];

  const handleConfirmCompletion = async () => {
    if (!booking || !user) return;

    if (rating === 0) {
      toast.error("Please select a rating before confirming completion");
      return;
    }

    try {
      setIsProcessing(true);

      // First, confirm completion and release payment
      const { BookingActionService } = await import('@/lib/booking-action-service');

      const result = await BookingActionService.confirmCompletion({
        bookingId: booking.$id || booking.id,
        userId: user.$id,
        userRole: 'client',
        action: 'confirm_completion'
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      // Then create the review (after payment is released)
      try {
        await ReviewService.createReview({
          bookingId: booking.$id || booking.id,
          clientId: user.$id,
          workerId: booking.workerId,
          rating,
          comment: review.trim() || undefined,
          isPublic: true,
        });
      } catch (reviewError: any) {
        // Don't fail the whole flow if review already exists
        if (!reviewError.message?.includes('already exists')) {
          console.error('Error creating review:', reviewError);
          toast.warning('Work confirmed but review failed. Please try adding review later.');
        }
      }

      toast.success("Work completed and payment released!");
      onRefresh?.();
      onClose();

    } catch (error) {
      console.error('Error confirming completion:', error);
      toast.error("Failed to confirm completion. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!booking || !user) return;
    
    if (!disputeCategory || !disputeDescription.trim()) {
      toast.error("Please select a category and provide a description for the dispute");
      return;
    }

    try {
      setIsProcessing(true);

      const { BookingActionService } = await import('@/lib/booking-action-service');
      
      const result = await BookingActionService.raiseDispute({
        bookingId: booking.$id || booking.id,
        userId: user.$id,
        userRole: 'client',
        action: 'dispute',
        disputeDetails: {
          category: disputeCategory,
          description: disputeDescription.trim(),
          evidence
        }
      });

      if (result.success) {
        toast.success(result.message);
        onRefresh?.();
        onClose();
      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error('Error raising dispute:', error);
      toast.error("Failed to raise dispute. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStarRating = () => {
    const currentRating = hoveredRating || rating;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  star <= currentRating
                    ? "text-yellow-400 fill-current"
                    : "text-gray-300 hover:text-yellow-200"
                )}
              />
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-600">
          {rating > 0 ? (
            <span className="font-medium">
              {rating} out of 5 stars - {getRatingText(rating)}
            </span>
          ) : (
            <span className="text-gray-400">Click to rate the service</span>
          )}
        </div>
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Very Good";
      case 5: return "Excellent";
      default: return "";
    }
  };

  const resetForm = () => {
    setAction(null);
    setRating(0);
    setHoveredRating(0);
    setReview('');
    setTip('');
    setDisputeCategory('');
    setDisputeDescription('');
    setEvidence([]);
  };

  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Work Completion</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{booking.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Service Amount</p>
                  <p className="text-xl font-semibold">₦{booking.budgetAmount?.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className="bg-orange-100 text-orange-800">
                    Awaiting Your Confirmation
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Selection */}
          {!action && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <p>The worker has marked this job as completed. Please review the work and choose an action:</p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => setAction('confirm')}
                      className="bg-green-500 hover:bg-green-600 flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm & Release Payment
                    </Button>
                    <Button 
                      onClick={() => setAction('dispute')}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 flex-1"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Raise a Dispute
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation Form */}
          {action === 'confirm' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  Confirm Completion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Rate the Service</Label>
                  <div className="mt-2">
                    {renderStarRating()}
                  </div>
                </div>

                <div>
                  <Label htmlFor="review" className="text-base font-medium">
                    Review (Optional)
                  </Label>
                  <Textarea
                    id="review"
                    placeholder="Share your experience with this service..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Payment Release:</strong> Confirming will immediately release ₦{booking.budgetAmount?.toLocaleString()} to the worker.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setAction(null)}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleConfirmCompletion}
                    disabled={isProcessing || rating === 0}
                    className="bg-green-500 hover:bg-green-600 flex-1"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm & Release Payment'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dispute Form */}
          {action === 'dispute' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  Raise a Dispute
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dispute-category" className="text-base font-medium">
                    Issue Category *
                  </Label>
                  <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select the type of issue" />
                    </SelectTrigger>
                    <SelectContent>
                      {disputeCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dispute-description" className="text-base font-medium">
                    Detailed Description *
                  </Label>
                  <Textarea
                    id="dispute-description"
                    placeholder="Describe the issue in detail. Include what went wrong and what you expected..."
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    className="mt-2"
                    rows={4}
                  />
                </div>

                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Dispute Process:</strong> Our team will review your dispute within 24 hours and contact both parties to resolve the issue fairly.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setAction(null)}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleRaiseDispute}
                    disabled={isProcessing || !disputeCategory || !disputeDescription.trim()}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isProcessing ? 'Processing...' : 'Submit Dispute'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 