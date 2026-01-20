"use client";

import * as React from "react";
import {
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobApplicationCard } from "@/components/worker/job-application-card";
import { ApplicationWithJob, WorkerApplicationsService } from "@/lib/worker-applications.service";
import { toast } from "sonner";

interface JobApplicationsListProps {
  workerId: string;
  onApplicationClick?: (application: ApplicationWithJob) => void;
  onRefresh?: () => void;
}

export function JobApplicationsList({
  workerId,
  onApplicationClick,
  onRefresh
}: JobApplicationsListProps) {
  const [applications, setApplications] = React.useState<ApplicationWithJob[]>([]);
  const [filteredApplications, setFilteredApplications] = React.useState<ApplicationWithJob[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Fetch applications
  const fetchApplications = React.useCallback(async () => {
    try {
      setIsLoading(true);

      const apps = await WorkerApplicationsService.getWorkerApplications(workerId);
      setApplications(apps);

      // Trigger parent refresh callback if provided
      onRefresh?.();

    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error("Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  }, [workerId, onRefresh]);

  // Initial fetch
  React.useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Apply filters and search
  React.useEffect(() => {
    let filtered = [...applications];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => {
        switch (statusFilter) {
          case 'pending':
            return app.status === 'pending';

          case 'selected':
            // Selected but not yet accepted/declined, and within 1 hour
            return app.status === 'selected' &&
              !app.acceptedAt &&
              !app.declinedAt &&
              !WorkerApplicationsService.isSelectionExpired(app.selectedAt);

          case 'accepted':
            return app.acceptedAt !== undefined;

          case 'rejected':
            return app.status === 'rejected';

          case 'withdrawn':
            return app.status === 'withdrawn';

          case 'expired':
            // Selected but expired (> 1 hour)
            return app.status === 'selected' &&
              WorkerApplicationsService.isSelectionExpired(app.selectedAt);

          default:
            return true;
        }
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(app => {
        const job = app.job;
        if (!job) return false;

        return (
          job.title?.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.locationAddress?.toLowerCase().includes(query) ||
          app.message?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredApplications(filtered);
  }, [applications, statusFilter, searchQuery]);

  // Calculate status counts
  const statusCounts = React.useMemo(() => {
    const counts = {
      all: applications.length,
      pending: 0,
      selected: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0,
      expired: 0
    };

    applications.forEach(app => {
      if (app.status === 'pending') {
        counts.pending++;
      }

      if (app.status === 'selected') {
        if (app.acceptedAt) {
          counts.accepted++;
        } else if (app.declinedAt) {
          // Don't count declined
        } else if (WorkerApplicationsService.isSelectionExpired(app.selectedAt)) {
          counts.expired++;
        } else {
          counts.selected++; // Action needed
        }
      }

      if (app.status === 'rejected') {
        counts.rejected++;
      }

      if (app.status === 'withdrawn') {
        counts.withdrawn++;
      }

      if (app.acceptedAt && app.status !== 'selected') {
        counts.accepted++;
      }
    });

    return counts;
  }, [applications]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search and Filter Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 h-10 bg-gray-200 animate-pulse rounded-md" />
          <div className="w-full sm:w-48 h-10 bg-gray-200 animate-pulse rounded-md" />
          <div className="w-full sm:w-auto h-10 bg-gray-200 animate-pulse rounded-md" />
        </div>

        {/* Card Skeletons */}
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  // Empty state
  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Inbox className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Applications Yet
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">
          You haven't applied to any jobs yet. Browse available jobs to get started and earn money!
        </p>
        <Button onClick={() => window.location.href = '/worker/jobs'}>
          <Briefcase className="h-4 w-4 mr-2" />
          Browse Available Jobs
        </Button>
      </div>
    );
  }

  // No results after filtering
  if (filteredApplications.length === 0) {
    return (
      <div className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications ({statusCounts.all})</SelectItem>
              <SelectItem value="selected">
                Action Needed {statusCounts.selected > 0 && `(${statusCounts.selected})`}
              </SelectItem>
              <SelectItem value="pending">Pending Review ({statusCounts.pending})</SelectItem>
              <SelectItem value="accepted">Accepted ({statusCounts.accepted})</SelectItem>
              <SelectItem value="rejected">Not Selected ({statusCounts.rejected})</SelectItem>
              <SelectItem value="withdrawn">Withdrawn ({statusCounts.withdrawn})</SelectItem>
              {statusCounts.expired > 0 && (
                <SelectItem value="expired">Expired ({statusCounts.expired})</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchApplications}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* No results message */}
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Filter className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Applications Found
          </h3>
          <p className="text-gray-600 mb-4">
            No applications match your current filters or search query.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by job title, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications ({statusCounts.all})</SelectItem>
            <SelectItem value="selected">
              <span className="flex items-center gap-2">
                {statusCounts.selected > 0 && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                )}
                Action Needed {statusCounts.selected > 0 && `(${statusCounts.selected})`}
              </span>
            </SelectItem>
            <SelectItem value="pending">Pending Review ({statusCounts.pending})</SelectItem>
            <SelectItem value="accepted">Accepted ({statusCounts.accepted})</SelectItem>
            <SelectItem value="rejected">Not Selected ({statusCounts.rejected})</SelectItem>
            <SelectItem value="withdrawn">Withdrawn ({statusCounts.withdrawn})</SelectItem>
            {statusCounts.expired > 0 && (
              <SelectItem value="expired">Expired ({statusCounts.expired})</SelectItem>
            )}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={fetchApplications} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Action Needed Alert */}
      {statusCounts.selected > 0 && statusFilter === 'all' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-orange-900">
              {statusCounts.selected} Application{statusCounts.selected !== 1 ? 's' : ''} Need{statusCounts.selected === 1 ? 's' : ''} Your Response
            </h4>
            <p className="text-sm text-orange-700 mt-1">
              You have been selected by client{statusCounts.selected !== 1 ? 's' : ''}. Accept or decline within 1 hour to avoid automatic rejection.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter('selected')}
            className="border-orange-300 text-orange-700 hover:bg-orange-100 whitespace-nowrap"
          >
            View Now
          </Button>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredApplications.length} of {applications.length} application{applications.length !== 1 ? 's' : ''}
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {filteredApplications.map((application) => (
          <JobApplicationCard
            key={application.$id}
            application={application}
            onClick={() => onApplicationClick?.(application)}
          />
        ))}
      </div>
    </div>
  );
}
