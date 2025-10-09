"use client";

import * as React from "react";
import { Star, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ReviewService } from "@/lib/review-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    title: string;
    workerId: string;
    workerName: string;
    workerAvatar?: string;
    category: string;
    completedAt: string;
  };
  onReviewSubmitted?: () => void;
}

export function ReviewModal({ 
  isOpen, 
  onClose, 
  booking, 
  onReviewSubmitted 
}: ReviewModalProps) {
  const [rating, setRating] = React.useState(0);
  const [hoveredRating, setHoveredRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoveredRating(0);
      setComment("");
      setIsSubmitted(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      setIsSubmitting(true);
      
      await ReviewService.createReview({
        bookingId: booking.id,
        clientId: "", // Will be filled by the service using current user
        workerId: booking.workerId,
        rating,
        comment: comment.trim() || undefined,
        isPublic: true,
      });

      setIsSubmitted(true);
      toast.success("Review submitted successfully!");
      
      // Call callback after a short delay
      setTimeout(() => {
        onReviewSubmitted?.();
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, onHover?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="focus:outline-none"
            onClick={() => setRating(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
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
    );
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Very Good";
      case 5: return "Excellent";
      default: return "Select a rating";
    }
  };

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Thank you for your review!
            </h3>
            <p className="text-gray-600">
              Your feedback helps improve our service quality.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            Help other clients by sharing your experience with this worker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={booking.workerAvatar} />
                  <AvatarFallback>
                    {booking.workerName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {booking.workerName}
                  </h4>
                  <p className="text-sm text-gray-600 truncate">
                    {booking.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {booking.category}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Completed {new Date(booking.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rating Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">
              How would you rate this service? *
            </label>
            <div className="space-y-2">
              {renderStars(hoveredRating || rating, setHoveredRating)}
              <p className="text-sm text-gray-600">
                {getRatingText(hoveredRating || rating)}
              </p>
            </div>
          </div>

          {/* Comment Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">
              Share your experience (optional)
            </label>
            <Textarea
              placeholder="Tell others about your experience with this worker..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 text-right">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
