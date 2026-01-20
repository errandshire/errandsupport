"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  MinusCircle,
  Briefcase,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ApplicationWithJob, WorkerApplicationsService } from "@/lib/worker-applications.service";
import { CountdownTimer } from "@/components/shared/countdown-timer";

interface JobApplicationCardProps {
  application: ApplicationWithJob;
  onClick?: () => void;
}

export function JobApplicationCard({ application, onClick }: JobApplicationCardProps) {
  const job = application.job;

  if (!job) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Job details not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate if selection is expired
  const isExpired = application.status === 'selected' &&
    WorkerApplicationsService.isSelectionExpired(application.selectedAt);

  // Get status display
  const getStatusDisplay = () => {
    if (application.status === 'pending') {
      return {
        text: 'Pending Review',
        icon: Clock,
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    }

    if (application.status === 'selected') {
      if (application.acceptedAt) {
        return {
          text: 'Accepted',
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800 border-green-200'
        };
      }

      if (application.declinedAt) {
        return {
          text: 'Declined',
          icon: MinusCircle,
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      }

      if (isExpired) {
        return {
          text: 'Selection Expired',
          icon: XCircle,
          color: 'bg-gray-100 text-gray-600 border-gray-200'
        };
      }

      // Within 1-hour window
      return {
        text: 'Selected - Accept Now!',
        icon: AlertCircle,
        color: 'bg-orange-100 text-orange-800 border-orange-300 animate-pulse'
      };
    }

    if (application.status === 'rejected') {
      return {
        text: 'Not Selected',
        icon: XCircle,
        color: 'bg-red-100 text-red-800 border-red-200'
      };
    }

    if (application.status === 'withdrawn') {
      return {
        text: 'Withdrawn',
        icon: MinusCircle,
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    }

    if (application.status === 'unpicked') {
      return {
        text: 'Selection Cancelled',
        icon: MinusCircle,
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    }

    return {
      text: application.status,
      icon: AlertCircle,
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    };
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  // Get urgency color
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return dateString;
    }
  };

  // Check if needs urgent action
  const needsAction = application.status === 'selected' &&
    !application.acceptedAt &&
    !application.declinedAt &&
    !isExpired;

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200",
        needsAction && "border-orange-300 shadow-md ring-2 ring-orange-100"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Title and Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-gray-900 truncate">
                {job.title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Applied {formatDate(application.appliedAt)}
              </p>
            </div>

            <Badge className={cn("flex items-center gap-1 whitespace-nowrap", statusDisplay.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusDisplay.text}
            </Badge>
          </div>

          {/* Countdown Timer for Selected Applications */}
          {needsAction && application.selectedAt && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-900">
                  Time to accept:
                </span>
                <CountdownTimer
                  targetTime={new Date(
                    new Date(application.selectedAt).getTime() + 60 * 60 * 1000
                  )}
                  className="text-sm font-bold text-orange-700"
                  onExpire={() => {
                    // Will be handled by parent component refresh
                  }}
                />
              </div>
            </div>
          )}

          {/* Job Description */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {job.description}
          </p>

          {/* Job Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <DollarSign className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                ₦{job.budgetMin.toLocaleString()}-₦{job.budgetMax.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-600">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{job.locationAddress}</span>
            </div>

            {job.scheduledDate && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {new Date(job.scheduledDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}

            {job.duration && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{job.duration} hour(s)</span>
              </div>
            )}
          </div>

          {/* Footer: Urgency and Applicants */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Badge className={cn("text-xs", getUrgencyColor(job.urgency || 'medium'))}>
              {(job.urgency || 'medium').charAt(0).toUpperCase() + (job.urgency || 'medium').slice(1)} Priority
            </Badge>

            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              <span>{job.applicantCount || 0} applicant{(job.applicantCount || 0) !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Link to Booking (if exists) */}
          {application.bookingId && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Briefcase className="h-4 w-4" />
                <span className="font-medium">Booking Created</span>
              </div>
            </div>
          )}

          {/* Application Message (if exists) */}
          {application.message && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 italic line-clamp-1">
                "{application.message}"
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
