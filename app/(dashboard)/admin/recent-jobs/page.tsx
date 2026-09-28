"use client";

import * as React from "react";
import { databases, COLLECTIONS, DATABASE_ID, Query } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Search, Trash2, Eye, Calendar, DollarSign, MapPin, User, Clock, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

type JobDoc = {
  $id: string;
  clientId: string;
  workerId?: string;
  title: string;
  description: string;
  category: string;
  budgetAmount: number;
  totalAmount?: number;
  location: string;
  state: string;
  city: string;
  address: string;
  status: 'open' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
};

export default function RecentJobsPage() {
  const [jobs, setJobs] = React.useState<JobDoc[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(50);
  
  // Job detail modal
  const [selectedJob, setSelectedJob] = React.useState<JobDoc | null>(null);
  const [jobDetailOpen, setJobDetailOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState<Partial<JobDoc>>({});

  const fetchJobs = React.useCallback(async (page: number = 1, searchQuery: string = "", status: string = "all") => {
    try {
      setIsLoading(true);

      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(itemsPerPage),
        Query.offset((page - 1) * itemsPerPage)
      ];

      // Add status filter
      if (status !== "all") {
        queries.unshift(Query.equal('status', status));
      }

      // Add search if provided
      if (searchQuery.trim()) {
        queries.splice(1, 2);
        queries.push(Query.limit(5000));
      }

      const res = await databases.listDocuments(
        DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        queries
      );

      setTotalCount(res.total);

      // Fetch client details for each job
      const jobsWithClientInfo = await Promise.all(
        res.documents.map(async (job: any) => {
          try {
            const client = await databases.getDocument(
              DATABASE_ID!,
              COLLECTIONS.USERS,
              job.clientId
            );
            return {
              ...job,
              clientName: client.name || client.email,
              clientEmail: client.email,
              clientPhone: client.phone
            };
          } catch {
            return { ...job, clientName: 'Unknown', clientEmail: '', clientPhone: '' };
          }
        })
      );

      let filteredJobs = jobsWithClientInfo;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filteredJobs = jobsWithClientInfo.filter((j: any) => 
          `${j.title} ${j.category} ${j.description} ${j.clientName} ${j.clientPhone}`.toLowerCase().includes(q)
        );
      }

      setJobs(filteredJobs as unknown as JobDoc[]);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage]);

  React.useEffect(() => {
    fetchJobs(currentPage, search, statusFilter);
  }, [currentPage, search, statusFilter, itemsPerPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, statusFilter]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-100 text-green-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const deleteJob = async (job: JobDoc) => {
    if (!confirm(`Delete "${job.title}"?`)) return;
    try {
      await databases.deleteDocument(DATABASE_ID!, COLLECTIONS.BOOKINGS, job.$id);
      toast.success("Job deleted");
      fetchJobs(currentPage, search, statusFilter);
      setJobDetailOpen(false);
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const renewJob = async (job: JobDoc) => {
    if (!confirm(`Renew "${job.title}"? This will reopen it for workers.`)) return;
    try {
      await databases.updateDocument(DATABASE_ID!, COLLECTIONS.BOOKINGS, job.$id, {
        status: 'open',
        workerId: null,
        acceptedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        updatedAt: new Date().toISOString()
      });
      toast.success("Job renewed");
      fetchJobs(currentPage, search, statusFilter);
      setJobDetailOpen(false);
    } catch {
      toast.error("Failed to renew job");
    }
  };

  const updateJob = async () => {
    if (!selectedJob) return;
    try {
      await databases.updateDocument(DATABASE_ID!, COLLECTIONS.BOOKINGS, selectedJob.$id, {
        ...editForm,
        updatedAt: new Date().toISOString()
      });
      toast.success("Job updated successfully");
      setIsEditing(false);
      fetchJobs(currentPage, search, statusFilter);
      setJobDetailOpen(false);
    } catch {
      toast.error("Failed to update job");
    }
  };

  const openJobDetail = (job: JobDoc) => {
    setSelectedJob(job);
    setEditForm(job);
    setIsEditing(false);
    setJobDetailOpen(true);
  };

  const totalPages = search.trim() 
    ? Math.ceil(jobs.length / itemsPerPage)
    : Math.ceil(totalCount / itemsPerPage);

  const displayedJobs = search.trim()
    ? jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : jobs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-serif font-bold">Recent Jobs</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => fetchJobs(currentPage, search, statusFilter)} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jobs ({search.trim() ? jobs.length : totalCount})</CardTitle>
          {!search.trim() && (
            <p className="text-sm text-neutral-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} jobs
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-neutral-500">Loading...</div>
          ) : displayedJobs.length === 0 ? (
            <div className="text-sm text-neutral-500">No jobs found.</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Client</th>
                      <th className="py-2 pr-4">Phone</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Budget</th>
                      <th className="py-2 pr-4">Location</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedJobs.map(job => (
                      <tr key={job.$id} className="border-b align-top">
                        <td className="py-3 pr-4 font-medium">{job.title || "—"}</td>
                        <td className="py-3 pr-4">{job.clientName || "—"}</td>
                        <td className="py-3 pr-4">{job.clientPhone || "—"}</td>
                        <td className="py-3 pr-4">{job.category || "—"}</td>
                        <td className="py-3 pr-4">₦{(job.budgetAmount || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4">{[job.city, job.state].filter(Boolean).join(", ") || "—"}</td>
                        <td className="py-3 pr-4"><Badge className={getStatusBadge(job.status)}>{job.status}</Badge></td>
                        <td className="py-3 pr-4">{job.createdAt ? new Date(job.createdAt).toLocaleString() : "—"}</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => openJobDetail(job)}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            {(job.status === 'cancelled' || job.status === 'completed' || job.status === 'rejected') && (
                              <Button size="sm" variant="outline" onClick={() => renewJob(job)}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Renew
                              </Button>
                            )}
                            {job.status === 'open' && (
                              <Button size="sm" variant="destructive" onClick={() => deleteJob(job)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {displayedJobs.map(job => (
                  <Card key={job.$id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{job.title || "—"}</h3>
                          <p className="text-xs text-neutral-500 truncate">{job.category}</p>
                        </div>
                        <Badge className={getStatusBadge(job.status)}>{job.status}</Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div><span className="text-neutral-500">Client:</span> {job.clientName || "—"}</div>
                        <div><span className="text-neutral-500">Phone:</span> {job.clientPhone || "—"}</div>
                        <div><span className="text-neutral-500">Budget:</span> ₦{(job.budgetAmount || 0).toLocaleString()}</div>
                        <div><span className="text-neutral-500">Location:</span> {[job.city, job.state].filter(Boolean).join(", ") || "—"}</div>
                        <div><span className="text-neutral-500">Created:</span> {job.createdAt ? new Date(job.createdAt).toLocaleString() : "—"}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openJobDetail(job)} className="flex-1">
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        {(job.status === 'cancelled' || job.status === 'completed' || job.status === 'rejected') && (
                          <Button size="sm" variant="outline" onClick={() => renewJob(job)} className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-1" /> Renew
                          </Button>
                        )}
                        {job.status === 'open' && (
                          <Button size="sm" variant="destructive" onClick={() => deleteJob(job)} className="flex-1">
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600">Page {currentPage} of {totalPages}</span>
                <Input type="number" min={1} max={totalPages} value={currentPage} onChange={(e) => { const p = parseInt(e.target.value); if (p >= 1 && p <= totalPages) setCurrentPage(p); }} className="w-20 text-center" />
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => { if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) { return <PaginationItem key={page}><PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">{page}</PaginationLink></PaginationItem>; } else if (page === currentPage - 2 || page === currentPage + 2) { return <PaginationItem key={page}><PaginationEllipsis /></PaginationItem>; } return null; })}
                  <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Detail Dialog */}
      <Dialog open={jobDetailOpen} onOpenChange={setJobDetailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>
          {selectedJob ? (
            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input value={editForm.title || ""} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea value={editForm.description || ""} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="min-h-[100px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Input value={editForm.category || ""} onChange={(e) => setEditForm({...editForm, category: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Budget</label>
                      <Input type="number" value={editForm.budgetAmount || 0} onChange={(e) => setEditForm({...editForm, budgetAmount: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <Input value={editForm.city || ""} onChange={(e) => setEditForm({...editForm, city: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">State</label>
                      <Input value={editForm.state || ""} onChange={(e) => setEditForm({...editForm, state: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={updateJob}>Save Changes</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Title:</span> {selectedJob.title || "—"}</div>
                    <div><span className="font-medium">Category:</span> {selectedJob.category || "—"}</div>
                    <div><span className="font-medium">Budget:</span> ₦{(selectedJob.budgetAmount || 0).toLocaleString()}</div>
                    <div><span className="font-medium">Status:</span> <Badge className={getStatusBadge(selectedJob.status)}>{selectedJob.status}</Badge></div>
                    <div><span className="font-medium">Location:</span> {selectedJob.location || "—"}</div>
                    <div><span className="font-medium">State:</span> {selectedJob.state || "—"}</div>
                    <div><span className="font-medium">City:</span> {selectedJob.city || "—"}</div>
                    <div><span className="font-medium">Created:</span> {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleString() : "—"}</div>
                  </div>
                  {selectedJob.description && (
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Description</p>
                      <p className="text-sm">{selectedJob.description}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    {(selectedJob.status === 'cancelled' || selectedJob.status === 'completed' || selectedJob.status === 'rejected') && (
                      <Button size="sm" variant="outline" onClick={() => renewJob(selectedJob)}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Renew
                      </Button>
                    )}
                    {selectedJob.status === 'open' && (
                      <Button size="sm" variant="destructive" onClick={() => deleteJob(selectedJob)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-sm text-neutral-500">No job selected</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
