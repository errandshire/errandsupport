"use client";

import * as React from "react";
import { MapPin, Calendar, Clock, DollarSign, User, Star, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { JobWithDetails } from "@/lib/types";
import { useRouter } from "next/navigation";
import { COMMISSION_RATE } from "@/lib/constants";

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobWithDetails;
  onJobAccepted?: () => void;
}

export function JobDetailsModal({ isOpen, onClose, job, onJobAccepted }: JobDetailsModalProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  const workerEarnings = Math.round(job.budgetMax * (1 - COMMISSION_RATE));
  const platformFee = job.budgetMax - workerEarnings;

  const handleAcceptJob = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch('/api/jobs/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.$id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || 'Failed to accept job');
        return;
      }

      toast.success('Job accepted successfully!');
      onJobAccepted?.();
      onClose();

      // Redirect to booking
      if (data.bookingId) {
        router.push(`/worker/bookings?id=${data.bookingId}`);
      }
    } catch (error) {
      console.error('Failed to accept job:', error);
      toast.error('Failed to accept job. Please try again.');
    } finally {
      setIsAccepting(false);
      setShowConfirmation(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Title & Description */}
          <div>
            <h3 className="text-xl font-semibold">{job.title}</h3>
            <Badge className="mt-2">{job.categoryName}</Badge>
          </div>

          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-gray-700">{job.description}</p>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{job.locationAddress}</span>
              </div>
              {job.distanceFromWorker && (
                <p className="text-xs text-gray-500 mt-1">
                  {job.distanceFromWorker.toFixed(1)}km from you
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500">Scheduled Date</p>
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {new Date(job.scheduledDate).toLocaleDateString()} at {job.scheduledTime}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{job.duration} hours</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Budget</p>
              <div className="flex items-center gap-1 mt-1">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-green-600">
                  ₦{job.budgetMax.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Skills Required */}
          {job.skillsRequired && job.skillsRequired.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Skills Required</h4>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map((skill, index) => (
                  <Badge key={index} variant="outline">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {job.attachments && job.attachments.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Photos</h4>
              <div className="grid grid-cols-3 gap-2">
                {job.attachments.map((url, index) => (
                  <img key={index} src={url} alt={`Attachment ${index + 1}`} className="w-full h-24 object-cover rounded" />
                ))}
              </div>
            </div>
          )}

          {/* Client Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Client Information</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium">{job.clientName}</p>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{job.clientRating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Your Earnings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Job Budget:</span>
                <span className="font-medium">₦{job.budgetMax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Platform Fee ({COMMISSION_RATE * 100}%):</span>
                <span>-₦{platformFee.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-semibold text-green-600">
                <span>You'll Earn:</span>
                <span>₦{workerEarnings.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Confirmation Section */}
          {showConfirmation ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Confirm Job Acceptance</p>
                <p className="text-sm mb-3">
                  By accepting this job, you agree to complete it on the scheduled date.
                  Payment will be held in escrow until completion.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleAcceptJob} disabled={isAccepting}>
                    {isAccepting ? 'Accepting...' : 'Confirm Accept'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isAccepting}>
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Button
              onClick={() => setShowConfirmation(true)}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Accept This Job
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
