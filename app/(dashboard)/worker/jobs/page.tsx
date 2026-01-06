"use client";

import * as React from "react";
import { RefreshCw, Briefcase, MapPin, DollarSign, Calendar, Clock, ChevronDown, ChevronUp, User, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Job, JobWithDetails } from "@/lib/types";
import { JobAcceptanceService } from "@/lib/job-acceptance.service";
import { useAuth } from "@/hooks/use-auth";
import { SERVICE_CATEGORIES, COMMISSION_RATE } from "@/lib/constants";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function WorkerJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [workerCategories, setWorkerCategories] = React.useState<string[]>([]);
  const [expandedJobId, setExpandedJobId] = React.useState<string | null>(null);
  const [jobDetails, setJobDetails] = React.useState<Record<string, JobWithDetails>>({});
  const [appliedJobs, setAppliedJobs] = React.useState<Set<string>>(new Set()); // Track jobs worker has applied to
  const [applyingToJob, setApplyingToJob] = React.useState<string | null>(null); // Track current application in progress

  // Fetch worker data
  React.useEffect(() => {
    const fetchWorkerData = async () => {
      if (!user?.$id) return;

      try {
        const { databases, COLLECTIONS } = await import('@/lib/appwrite');
        const { Query } = await import('appwrite');

        const workers = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WORKERS,
          [Query.equal('userId', user.$id)]
        );

        if (workers.documents.length > 0) {
          const worker = workers.documents[0];
          console.log('👤 Worker data:', worker);
          console.log('📂 Worker categories:', worker.categories);
          setWorkerCategories(worker.categories || []);
        } else {
          console.warn('⚠️ No worker profile found for user:', user.$id);
        }
      } catch (error) {
        console.error('Failed to fetch worker data:', error);
      }
    };

    fetchWorkerData();
  }, [user]);

  const fetchJobs = React.useCallback(async () => {
    // No longer need to wait for worker categories - show all jobs
    setIsLoading(true);
    try {
      const fetchedJobs = await JobAcceptanceService.getAvailableJobs(
        workerCategories,
        selectedCategory && selectedCategory !== 'all' ? { categoryId: selectedCategory } : undefined
      );
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [workerCategories, selectedCategory]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh jobs every 30 seconds to remove jobs accepted by others
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleToggleJob = async (job: Job) => {
    // If clicking the same job, collapse it
    if (expandedJobId === job.$id) {
      setExpandedJobId(null);
      return;
    }

    // Expand the job
    setExpandedJobId(job.$id);

    // Fetch details if not already loaded
    if (!jobDetails[job.$id]) {
      try {
        const jobWithDetails = await JobAcceptanceService.getJobDetailsForWorker(job.$id);

        // Check if job is still available
        if (jobWithDetails.status !== 'open') {
          toast.error('This job is no longer available');
          setJobs(prevJobs => prevJobs.filter(j => j.$id !== job.$id));
          setExpandedJobId(null);
          return;
        }

        setJobDetails(prev => ({ ...prev, [job.$id]: jobWithDetails }));
      } catch (error) {
        console.error('Failed to fetch job details:', error);
        toast.error('Failed to load job details');
        // Remove job from list if it can't be fetched (might be deleted/assigned)
        setJobs(prevJobs => prevJobs.filter(j => j.$id !== job.$id));
        setExpandedJobId(null);
      }
    }
  };

  // Check which jobs worker has already applied to
  React.useEffect(() => {
    const checkApplications = async () => {
      if (!user?.$id) return;

      try {
        const { databases, COLLECTIONS, DATABASE_ID } = await import('@/lib/appwrite');
        const { Query } = await import('appwrite');

        // Fetch all applications by this worker
        const applications = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.JOB_APPLICATIONS,
          [
            Query.equal('workerId', user.$id),
            Query.equal('status', 'pending'),
            Query.limit(100)
          ]
        );

        const appliedJobIds = new Set(applications.documents.map((app: any) => app.jobId));
        setAppliedJobs(appliedJobIds);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      }
    };

    checkApplications();
  }, [user?.$id]);

  const handleApplyToJob = async (job: Job) => {
    if (!user) return;

    try {
      setApplyingToJob(job.$id);

      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.$id,
          workerId: user.$id,
          message: '', // Optional: could add a message field in the UI
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || 'Failed to apply to job');

        // If job is no longer available, remove it from the list
        if (data.message?.toLowerCase().includes('no longer accepting') ||
            data.message?.toLowerCase().includes('no longer available')) {
          setJobs(prevJobs => prevJobs.filter(j => j.$id !== job.$id));
          setExpandedJobId(null);
        }
        return;
      }

      toast.success('Application submitted! The client will review your application.');

      // Add this job to applied jobs
      setAppliedJobs(prev => new Set([...prev, job.$id]));

      // Keep the job in the list but mark as applied
      // Don't remove it - worker can still see it
    } catch (error) {
      console.error('Failed to apply to job:', error);
      toast.error('Failed to apply to job. Please try again.');
    } finally {
      setApplyingToJob(null);
    }
  };

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Available Jobs</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Browse and accept jobs matching your skills</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {SERVICE_CATEGORIES.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-2">No jobs available</p>
          <p className="text-sm text-gray-400">Check back later for new opportunities</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map(job => {
            const isExpanded = expandedJobId === job.$id;
            const details = jobDetails[job.$id];
            const workerEarnings = details ? Math.round(details.budgetMax * (1 - COMMISSION_RATE)) : Math.round(job.budgetMax * (1 - COMMISSION_RATE));
            const platformFee = details ? (details.budgetMax - workerEarnings) : (job.budgetMax - workerEarnings);

            return (
              <Collapsible key={job.$id} open={isExpanded} onOpenChange={() => handleToggleJob(job)}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CollapsibleTrigger className="w-full text-left p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <h3 className="font-semibold text-base sm:text-lg">{job.title}</h3>
                          <Badge variant="secondary" className="w-fit text-xs">
                            {SERVICE_CATEGORIES.find(c => c.id === job.categoryId)?.icon}
                            <span className="hidden sm:inline ml-1">{SERVICE_CATEGORIES.find(c => c.id === job.categoryId)?.name}</span>
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mt-1">{job.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{job.locationAddress}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span>{job.duration} hours</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="font-semibold text-green-600">
                              ₦{job.budgetMax.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 text-gray-500">
                        {isExpanded ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {details ? (
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                        {/* Full Description */}
                        <div>
                          <h4 className="font-medium mb-2 text-xs sm:text-sm">Full Description</h4>
                          <p className="text-xs sm:text-sm text-gray-700">{details.description}</p>
                        </div>

                        {/* Skills Required */}
                        {details.skillsRequired && details.skillsRequired.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 text-xs sm:text-sm">Skills Required</h4>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {details.skillsRequired.map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attachments */}
                        {details.attachments && details.attachments.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 text-xs sm:text-sm">Photos</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {details.attachments.map((url, index) => (
                                <img key={index} src={url} alt={`Attachment ${index + 1}`} className="w-full h-20 sm:h-24 object-cover rounded" />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Client Info */}
                        <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                          <h4 className="font-medium mb-2 text-xs sm:text-sm">Client Information</h4>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">{details.clientName}</p>
                              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                <span>{details.clientRating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Earnings Breakdown */}
                        <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg">
                          <h4 className="font-medium mb-2 text-xs sm:text-sm">Your Earnings</h4>
                          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                            <div className="flex justify-between gap-2">
                              <span>Job Budget:</span>
                              <span className="font-medium">₦{details.budgetMax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-2 text-red-600">
                              <span>Platform Fee ({COMMISSION_RATE * 100}%):</span>
                              <span>-₦{platformFee.toLocaleString()}</span>
                            </div>
                            <div className="border-t pt-1.5 sm:pt-2 flex justify-between gap-2 text-sm sm:text-base font-semibold text-green-600">
                              <span>You'll Earn:</span>
                              <span>₦{workerEarnings.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Apply/Interest Button */}
                        {appliedJobs.has(job.$id) ? (
                          <Button
                            disabled
                            className="w-full bg-gray-400 text-sm sm:text-base"
                            size="lg"
                          >
                            ✓ Application Sent
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyToJob(job);
                            }}
                            disabled={applyingToJob === job.$id}
                            className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                            size="lg"
                          >
                            {applyingToJob === job.$id ? 'Applying...' : 'Show Interest'}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-3 sm:pt-4 text-center">
                        <p className="text-xs sm:text-sm text-gray-500">Loading details...</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

    </div>
  );
}
