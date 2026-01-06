"use client";

import * as React from "react";
import { MapPin, Calendar, Clock, DollarSign, Eye, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
  applicantCount?: number;
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
  assigned: { label: 'Assigned', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' },
};

export function JobCard({ job, onViewDetails, applicantCount }: JobCardProps) {
  const status = statusConfig[job.status];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails(job)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{job.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">{job.description}</p>
            </div>
            <Badge className={cn(status.color)}>{status.label}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{job.locationAddress}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{job.duration} hours</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold text-green-600">
                {job.budgetType === 'fixed'
                  ? `₦${job.budgetMax.toLocaleString()}`
                  : `₦${job.budgetMin.toLocaleString()} - ₦${job.budgetMax.toLocaleString()}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {job.viewCount > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{job.viewCount} views</span>
              </div>
            )}
            {job.status === 'open' && applicantCount !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span className={cn(
                  "font-medium",
                  applicantCount > 0 ? "text-green-600" : "text-gray-500"
                )}>
                  {applicantCount} {applicantCount === 1 ? 'applicant' : 'applicants'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t flex justify-end">
        <Button size="sm" variant="outline" onClick={(e) => {
          e.stopPropagation();
          onViewDetails(job);
        }}>
          View Details
        </Button>
      </div>
    </Card>
  );
}
