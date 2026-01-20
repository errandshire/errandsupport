"use client";

import * as React from "react";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  User,
  Mail,
  Phone,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageCircle,
  ExternalLink,
  Users
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CountdownTimer } from "@/components/shared/countdown-timer";
import { ApplicationWithJob, WorkerApplicationsService } from "@/lib/worker-applications.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface JobApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationWithJob | null;
  workerId: string;
  onRefresh?: () => void;
}

export function JobApplicationDetailModal({
  isOpen,
  onClose,
  application,
  workerId,
  onRefresh
}: JobApplicationDetailModalProps) {
  const router = useRouter();
  const [isWithdrawing, setIsWithdrawing] = React.useState(false);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isDeclining, setIsDeclining] = React.useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = React.useState(false);

  if (!application || !application.job) return null;

  const job = application.job;
  const client = application.client;

  // Check status and actions
  const canWithdraw = application.status === 'pending';
  const isExpired = application.status === 'selected' &&
    WorkerApplicationsService.isSelectionExpired(application.selectedAt);
  const canAcceptDecline = application.status === 'selected' &&
    !application.acceptedAt &&
    !application.declinedAt &&
    !isExpired;
  const hasBooking = !!application.bookingId;

  // Handle withdraw
  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);

      const result = await WorkerApplicationsService.withdrawApplication(
        application.$id,
        workerId
      );

      if (result.success) {
        toast.success(result.message);
        onRefresh?.();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Failed to withdraw application');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Handle accept
  const handleAccept = async () => {
    try {
      setIsAccepting(true);

      const response = await fetch('/api/jobs/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.$id,
          workerId: workerId,
          action: 'accept'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Job accepted successfully!');
        onRefresh?.();
        onClose();
        // Redirect to bookings page
        router.push('/worker/bookings');
      } else {
        toast.error(result.message || 'Failed to accept job');
      }
    } catch (error) {
      console.error('Error accepting job:', error);
      toast.error('Failed to accept job');
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle decline
  const handleDecline = async () => {
    try {
      setIsDeclining(true);

      const response = await fetch('/api/jobs/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.$id,
          workerId: workerId,
          action: 'decline',
          reason: 'Worker declined the selection'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Job declined successfully');
        onRefresh?.();
        onClose();
      } else {
        toast.error(result.message || 'Failed to decline job');
      }
    } catch (error) {
      console.error('Error declining job:', error);
      toast.error('Failed to decline job');
    } finally {
      setIsDeclining(false);
      setShowDeclineConfirm(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Not specified';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Not specified';
    }
  };

  // Get status display
  const getStatusBadge = () => {
    if (application.status === 'pending') {
      return <Badge className="bg-blue-100 text-blue-800">Pending Review</Badge>;
    }

    if (application.status === 'selected') {
      if (application.acceptedAt) {
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      }
      if (application.declinedAt) {
        return <Badge className="bg-gray-100 text-gray-800">Declined</Badge>;
      }
      if (isExpired) {
        return <Badge className="bg-gray-100 text-gray-600">Selection Expired</Badge>;
      }
      return <Badge className="bg-orange-100 text-orange-800 animate-pulse">Selected - Accept Now!</Badge>;
    }

    if (application.status === 'rejected') {
      return <Badge className="bg-red-100 text-red-800">Not Selected</Badge>;
    }

    if (application.status === 'withdrawn') {
      return <Badge className="bg-gray-100 text-gray-800">Withdrawn</Badge>;
    }

    if (application.status === 'unpicked') {
      return <Badge className="bg-gray-100 text-gray-800">Selection Cancelled</Badge>;
    }

    return <Badge className="bg-gray-100 text-gray-800">{application.status}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Application Details</span>
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Countdown Timer for Selected Applications */}
          {canAcceptDecline && application.selectedAt && (
            <Alert className="border-orange-300 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-orange-900">
                    Time remaining to respond:
                  </span>
                  <CountdownTimer
                    targetTime={new Date(
                      new Date(application.selectedAt).getTime() + 60 * 60 * 1000
                    )}
                    onExpire={() => {
                      toast.error('The 1-hour acceptance window has expired');
                      onRefresh?.();
                    }}
                    className="text-lg font-bold text-orange-700"
                  />
                  <span className="text-sm text-orange-700">
                    You must accept or decline within 1 hour of being selected
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Accept/Decline Actions */}
          {canAcceptDecline && !showDeclineConfirm && (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeclineConfirm(true)}
                disabled={isDeclining || isAccepting}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isAccepting || isDeclining}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isAccepting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Job
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Decline Confirmation */}
          {showDeclineConfirm && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="text-red-800 font-medium">
                    Are you sure you want to decline this job?
                  </p>
                  <p className="text-sm text-red-700">
                    The client will be notified and can select another worker. This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeclineConfirm(false)}
                      disabled={isDeclining}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDecline}
                      disabled={isDeclining}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeclining ? 'Declining...' : 'Confirm Decline'}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{job.title}</span>
                <Badge className={cn(
                  (job.urgency || 'medium') === 'high' ? 'bg-red-100 text-red-800' :
                  (job.urgency || 'medium') === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                )}>
                  {(job.urgency || 'medium').charAt(0).toUpperCase() + (job.urgency || 'medium').slice(1)} Priority
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{job.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{job.locationAddress}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    ₦{job.budgetMin.toLocaleString()}-₦{job.budgetMax.toLocaleString()}
                  </span>
                </div>

                {job.scheduledDate && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{formatDate(job.scheduledDate)}</span>
                  </div>
                )}

                {job.duration && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{job.duration} hour(s)</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    {job.applicantCount || 0} applicant{(job.applicantCount || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/jobs/${job.$id}`, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View Full Job
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={client.avatar} alt={client.name} />
                    <AvatarFallback>
                      {client.name?.charAt(0).toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{client.name || 'Client'}</h3>
                    <div className="flex flex-col gap-1 text-sm text-gray-600 mt-1">
                      {client.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Application Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Applied:</span>
                  <p className="font-medium">{formatDateTime(application.appliedAt)}</p>
                </div>

                {application.selectedAt && (
                  <div>
                    <span className="text-gray-600">Selected:</span>
                    <p className="font-medium">{formatDateTime(application.selectedAt)}</p>
                  </div>
                )}

                {application.acceptedAt && (
                  <div>
                    <span className="text-gray-600">Accepted:</span>
                    <p className="font-medium">{formatDateTime(application.acceptedAt)}</p>
                  </div>
                )}

                {application.declinedAt && (
                  <div>
                    <span className="text-gray-600">Declined:</span>
                    <p className="font-medium">{formatDateTime(application.declinedAt)}</p>
                  </div>
                )}
              </div>

              {application.message && (
                <div>
                  <span className="text-sm text-gray-600">Message:</span>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md italic">
                    "{application.message}"
                  </p>
                </div>
              )}

              {hasBooking && (
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      router.push('/worker/bookings');
                    }}
                    className="w-full"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    View Booking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdraw Action */}
          {canWithdraw && (
            <div className="flex justify-between items-center pt-2 border-t">
              <p className="text-sm text-gray-600">
                No longer interested in this job?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                {isWithdrawing ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-600 mr-2" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <MinusCircle className="h-3.5 w-3.5 mr-2" />
                    Withdraw Application
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
