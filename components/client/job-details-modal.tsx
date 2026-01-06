"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Job } from "@/lib/types";
import { MapPin, Calendar, Clock, DollarSign, Users, Eye, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ApplicantList } from "./applicant-list";

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated?: () => void;
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
  assigned: { label: 'Assigned', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' },
};

export function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onJobUpdated,
}: JobDetailsModalProps) {
  if (!job) return null;

  const status = statusConfig[job.status];
  const category = SERVICE_CATEGORIES.find(c => c.id === job.categoryId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{job.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn(status.color)}>{status.label}</Badge>
                {category && (
                  <Badge variant="outline">
                    {category.icon} {category.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Job Details */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700">{job.locationAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700">
                  {new Date(job.scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700">{job.duration} hours at {job.scheduledTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-semibold text-green-600">
                  {job.budgetType === 'fixed'
                    ? `₦${job.budgetMax.toLocaleString()}`
                    : `₦${job.budgetMin.toLocaleString()} - ₦${job.budgetMax.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Skills Required */}
          {job.skillsRequired && job.skillsRequired.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map((skill, index) => (
                  <Badge key={index} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {job.attachments && job.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {job.attachments.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {job.viewCount > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{job.viewCount} views</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Applicants Section - Only show for open jobs */}
          {job.status === 'open' && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Applicants
              </h3>
              <ApplicantList
                jobId={job.$id}
                onWorkerSelected={() => {
                  onJobUpdated?.();
                  onClose();
                }}
              />
            </div>
          )}

          {/* Assigned Worker Info - Show for assigned jobs */}
          {job.status === 'assigned' && job.assignedWorkerId && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Assigned Worker</h3>
              <p className="text-sm text-gray-600">
                This job has been assigned to a worker. View the booking for more details.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
