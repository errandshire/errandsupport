"use client";

import * as React from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Job } from "@/lib/types";
import { JobPostingModal } from "@/components/client/job-posting-modal";
import { JobCard } from "@/components/client/job-card";
import { JobPostingService } from "@/lib/job-posting.service";
import { useAuth } from "@/hooks/use-auth";

export default function ClientJobsPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('all');

  const fetchJobs = React.useCallback(async () => {
    if (!user?.$id) return;

    setIsLoading(true);
    try {
      const fetchedJobs = await JobPostingService.getClientJobs(user.$id);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = React.useMemo(() => {
    if (activeTab === 'all') return jobs;
    return jobs.filter(job => job.status === activeTab);
  }, [jobs, activeTab]);

  const handleViewDetails = (job: Job) => {
    // TODO: Open job details modal
    toast.info(`Viewing job: ${job.title}`);
  };

  const stats = React.useMemo(() => ({
    open: jobs.filter(j => j.status === 'open').length,
    assigned: jobs.filter(j => j.status === 'assigned').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  }), [jobs]);

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Posted Jobs</h1>
          <p className="text-gray-600 mt-1">Manage your job postings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          <div className="text-sm text-gray-600">Open Jobs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.assigned}</div>
          <div className="text-sm text-gray-600">Assigned Jobs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed Jobs</div>
        </Card>
      </div>

      {/* Jobs List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({stats.open})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned ({stats.assigned})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500 mb-4">
                {activeTab === 'all' ? 'No jobs posted yet' : `No ${activeTab} jobs`}
              </p>
              {activeTab === 'all' && (
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Your First Job
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map(job => (
                <JobCard key={job.$id} job={job} onViewDetails={handleViewDetails} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Job Posting Modal */}
      <JobPostingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientId={user.$id}
        onJobCreated={fetchJobs}
      />
    </div>
  );
}
