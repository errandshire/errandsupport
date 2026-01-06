"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Briefcase, Calendar, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface Applicant {
  $id: string;
  workerId: string;
  message: string;
  appliedAt: string;
  status: string;
  worker: {
    $id: string;
    userId: string;
    displayName?: string;
    name: string;
    email: string;
    phone: string;
    profileImage?: string;
    bio?: string;
    ratingAverage: number;
    totalReviews: number;
    experienceYears?: number;
    completedJobs: number;
    skills: string[];
    categories: string[];
    isVerified: boolean;
    isActive: boolean;
  };
}

interface ApplicantListProps {
  jobId: string;
  onWorkerSelected: () => void;
}

export function ApplicantList({ jobId, onWorkerSelected }: ApplicantListProps) {
  const { user } = useAuth();
  const [applicants, setApplicants] = React.useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectingWorkerId, setSelectingWorkerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchApplicants();
  }, [jobId]);

  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      const { databases, COLLECTIONS, DATABASE_ID } = await import('@/lib/appwrite');
      const { Query } = await import('appwrite');

      // Fetch applications for this job
      const applications = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('jobId', jobId),
          Query.equal('status', 'pending'),
          Query.orderDesc('appliedAt'),
          Query.limit(50)
        ]
      );

      // Fetch worker details for each application
      const applicantsWithWorkers = await Promise.all(
        applications.documents.map(async (app: any) => {
          try {
            const worker = await databases.getDocument(
              DATABASE_ID,
              COLLECTIONS.WORKERS,
              app.workerId
            );

            return {
              ...app,
              worker,
            };
          } catch (error) {
            console.error(`Failed to fetch worker ${app.workerId}:`, error);
            return null;
          }
        })
      );

      // Filter out null values (failed worker fetches)
      setApplicants(applicantsWithWorkers.filter(Boolean) as Applicant[]);
    } catch (error) {
      console.error('Failed to fetch applicants:', error);
      toast.error('Failed to load applicants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWorker = async (applicationId: string, workerId: string) => {
    if (!user?.$id) {
      toast.error('Please log in to select a worker');
      return;
    }

    try {
      setSelectingWorkerId(workerId);

      const response = await fetch('/api/jobs/select-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          applicationId,
          clientId: user.$id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || 'Failed to select worker');
        return;
      }

      toast.success('Worker selected successfully! Payment is held in escrow.');
      onWorkerSelected();
    } catch (error) {
      console.error('Failed to select worker:', error);
      toast.error('Failed to select worker. Please try again.');
    } finally {
      setSelectingWorkerId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading applicants...</p>
      </div>
    );
  }

  if (applicants.length === 0) {
    return (
      <Card className="p-8 text-center">
        <User className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500 mb-1">No applicants yet</p>
        <p className="text-sm text-gray-400">Workers will see your job and can apply</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {applicants.length} {applicants.length === 1 ? 'worker has' : 'workers have'} applied for this job
      </p>
      {applicants.map((applicant) => {
        const worker = applicant.worker;
        const workerName = worker.displayName || worker.name;

        return (
          <Card key={applicant.$id} className="p-4">
            <div className="flex items-start gap-4">
              {/* Worker Avatar */}
              <Avatar className="h-16 w-16">
                <AvatarImage src={worker.profileImage} alt={workerName} />
                <AvatarFallback className="text-lg">
                  {workerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Worker Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{workerName}</h4>
                      {worker.isVerified && (
                        <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {worker.ratingAverage > 0 ? worker.ratingAverage.toFixed(1) : 'New'}
                        </span>
                      </div>
                      {worker.totalReviews > 0 && (
                        <span className="text-sm text-gray-500">
                          ({worker.totalReviews} {worker.totalReviews === 1 ? 'review' : 'reviews'})
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{worker.completedJobs} jobs completed</span>
                      </div>
                      {worker.experienceYears && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{worker.experienceYears} years experience</span>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    {worker.bio && (
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{worker.bio}</p>
                    )}

                    {/* Skills */}
                    {worker.skills && worker.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {worker.skills.slice(0, 5).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {worker.skills.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{worker.skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Application Message */}
                    {applicant.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 italic">"{applicant.message}"</p>
                      </div>
                    )}

                    {/* Applied At */}
                    <p className="text-xs text-gray-500 mt-2">
                      Applied {new Date(applicant.appliedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                  <Button
                    onClick={() => handleSelectWorker(applicant.$id, worker.$id)}
                    disabled={selectingWorkerId !== null}
                    className="w-full sm:w-auto"
                  >
                    {selectingWorkerId === worker.$id ? 'Selecting...' : 'Select Worker'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
