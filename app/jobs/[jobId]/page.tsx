"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  User,
  Share2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { toast } from "sonner";
import { Job, JobWithDetails } from "@/lib/types";
import { JobAcceptanceService } from "@/lib/job-acceptance.service";
import { useAuth } from "@/hooks/use-auth";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { databases, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite";
import { extractJobIdFromSlug, findJobBySlug } from "@/lib/slug-utils";
import { WorkerSignupModal } from "@/components/jobs/worker-signup-modal";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const jobId = params.jobId as string;

  const [job, setJob] = React.useState<JobWithDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [showSignupModal, setShowSignupModal] = React.useState(false);

  // Fetch job details
  React.useEffect(() => {
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let jobDoc;

        // Check if jobId is a slug (contains hyphens) or a direct ID
        if (jobId.includes('-')) {
          // It's a slug, need to find the job by slug
          try {
            jobDoc = await findJobBySlug(jobId, databases, DATABASE_ID, COLLECTIONS.JOBS);
          } catch (slugError) {
            console.error('Failed to find job by slug:', slugError);
            // Fallback: try as direct ID
            try {
              jobDoc = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.JOBS,
                jobId
              );
            } catch (idError) {
              throw new Error('Job not found');
            }
          }
        } else {
          // It's a direct ID
          jobDoc = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.JOBS,
            jobId
          );
        }

        // Fetch client details
        const client = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          jobDoc.clientId
        );

        // Get category name
        const category = SERVICE_CATEGORIES.find(c => c.id === jobDoc.categoryId);

        const jobWithDetails: JobWithDetails = {
          ...jobDoc,
          clientName: client.name || 'Anonymous',
          clientEmail: client.email || '',
          clientRating: 0, // TODO: Calculate from reviews
          categoryName: category?.name || jobDoc.categoryId,
        } as JobWithDetails;

        setJob(jobWithDetails);

        // Increment view count using the actual document ID
        try {
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.JOBS,
            jobDoc.$id, // Use actual document ID, not the slug
            {
              viewCount: (jobDoc.viewCount || 0) + 1
            }
          );
        } catch (viewError) {
          console.error('Failed to increment view count:', viewError);
          // Don't fail the page load if view count update fails
        }

      } catch (error: any) {
        console.error('Failed to fetch job:', error);
        if (error.code === 404) {
          setError('Job not found. It may have been deleted or completed.');
        } else {
          setError('Failed to load job details. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  const handleCopyLink = async () => {
    // Use slug if available, otherwise fallback to job ID
    const urlSlug = job?.slug || jobId;
    const url = `${window.location.origin}/jobs/${urlSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated || !user) {
      // Show signup modal instead of immediate redirect
      setShowSignupModal(true);
      return;
    }

    if (user.role !== 'worker') {
      toast.error('Only workers can apply for jobs');
      return;
    }

    if (!job) return;

    setApplying(true);
    try {
      const { JobApplicationService } = await import('@/lib/job-application.service');
      const { Query } = await import('appwrite');

      // Get worker ID
      const workers = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', user.$id), Query.limit(1)]
      );

      if (workers.documents.length === 0) {
        toast.error('Worker profile not found. Please complete your profile first.');
        router.push('/worker/profile');
        return;
      }

      const workerId = workers.documents[0].$id;

      // Apply to job using the actual document ID, not the slug
      await JobApplicationService.applyToJob(job.$id, workerId);

      toast.success('Application submitted successfully!');
      router.push('/worker/jobs');

    } catch (error: any) {
      console.error('Failed to apply for job:', error);
      if (error.message.includes('already applied')) {
        toast.error('You have already applied to this job');
      } else if (error.message.includes('no longer accepting')) {
        toast.error('This job is no longer accepting applications');
      } else {
        toast.error(error.message || 'Failed to apply for job');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleGoToJobs = () => {
    if (user?.role === 'worker') {
      router.push('/worker/jobs');
    } else if (user?.role === 'client') {
      router.push('/client/jobs');
    } else {
      router.push('/worker/jobs');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Job Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {error || 'This job may have been deleted or completed.'}
              </p>
              <Button onClick={() => router.push('/')} className="w-full">
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const isJobAvailable = job.status === 'open';
  const isExpired = new Date(job.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoToJobs}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>

          {/* Job Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={isJobAvailable ? "default" : "secondary"}>
                      {job.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{job.categoryName}</Badge>
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl mb-2">
                    {job.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 text-base">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {job.clientName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.locationAddress}
                    </span>
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Status alerts */}
              {!isJobAvailable && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This job is no longer available for applications.
                  </AlertDescription>
                </Alert>
              )}

              {isExpired && isJobAvailable && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This job posting has expired.
                  </AlertDescription>
                </Alert>
              )}

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-semibold">
                      {job.budgetType === 'fixed'
                        ? `₦${job.budgetMax.toLocaleString()}`
                        : `₦${job.budgetMin.toLocaleString()} - ₦${job.budgetMax.toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Date</p>
                    <p className="font-semibold">
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Time</p>
                    <p className="font-semibold">{job.scheduledTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">{job.duration} hour{job.duration !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Job Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>

              {/* Skills Required */}
              {job.skillsRequired && job.skillsRequired.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Skills Required</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skillsRequired.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                <span>{job.viewCount || 0} views</span>
                {job.applicantCount !== undefined && (
                  <span>{job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}</span>
                )}
              </div>

              {/* Action Buttons */}
              {isJobAvailable && !isExpired && (
                <Button
                  onClick={handleApply}
                  disabled={applying || (isAuthenticated && user?.role !== 'worker')}
                  className="w-full"
                  size="lg"
                >
                  {applying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Apply for this Job
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Share Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share this Job</CardTitle>
              <CardDescription>
                Share this job posting with potential workers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/jobs/${job?.slug || jobId}`}
                  className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
                />
                <Button onClick={handleCopyLink} variant="outline">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Worker Signup Modal */}
      {job && (
        <WorkerSignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          jobId={job.$id}
          jobTitle={job.title}
          jobSlug={job.slug}
        />
      )}
    </div>
  );
}
