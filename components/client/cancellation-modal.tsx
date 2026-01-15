"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { trackMetaEvent } from "@/lib/meta-pixel-events";
import { useAuth } from "@/hooks/use-auth";

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'job' | 'booking';
  itemId: string;
  itemTitle: string;
  loading?: boolean;
}

export function CancellationModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  itemId,
  itemTitle,
  loading = false
}: CancellationModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset reason when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setReason("");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!user?.$id) {
      toast.error('You must be logged in to cancel');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the appropriate API endpoint
      const endpoint = type === 'job'
        ? `/api/jobs/cancel?jobId=${itemId}`
        : `/api/bookings/${itemId}/complete`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: user.$id,
          reason: reason || undefined
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to cancel ${type}`);
      }

      // Track cancellation with Meta Pixel
      try {
        trackMetaEvent('CustomEvent', {
          content_name: type === 'job' ? 'Client Job Cancellation' : 'Client Booking Cancellation',
          content_ids: [itemId],
          content_type: type === 'job' ? 'job_cancellation' : 'booking_cancellation'
        });
      } catch (trackError) {
        console.error('Meta Pixel tracking error:', trackError);
      }

      toast.success(data.message || `${type === 'job' ? 'Job' : 'Booking'} cancelled successfully`);
      onConfirm();
      onClose();
    } catch (error) {
      console.error(`Error cancelling ${type}:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to cancel ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getImpactMessage = () => {
    if (type === 'job') {
      return "Your job will be cancelled and reopened for new applications. Any selected worker will be notified and fully refunded.";
    }
    return "The worker will be notified of the cancellation. Your payment will be fully refunded to your wallet.";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancel {type === 'job' ? 'Job' : 'Booking'}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel "{itemTitle}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Impact Warning */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {getImpactMessage()}
            </AlertDescription>
          </Alert>

          {/* Optional Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for cancellation (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Let us know why you're cancelling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
              disabled={isSubmitting || loading}
            />
            <p className="text-xs text-neutral-500">
              This helps us improve our service
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || loading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Keep {type === 'job' ? 'Job' : 'Booking'}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || loading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting || loading ? (
                <>
                  <span className="mr-2">Cancelling...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Confirm Cancel
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
