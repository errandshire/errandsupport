"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, FileText } from "lucide-react";

interface WorkerApplication {
  $id: string;
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  lga?: string;
  idNumber?: string;
  idDocument?: string;
  selfieWithId?: string;
  verificationStatus: string;
  rejectionReason?: string;
  submittedAt?: string;
  user_name?: string;
}

export default function WorkerApplicationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Call VPS API to fetch pending worker applications
      const response = await fetch(`${API_BASE_URL}/worker-applications?status=pending`);
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      const data = await response.json();
      setApplications(data);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error(error.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessing(id);
      
      // Call the VPS API endpoint to approve the worker
      // This will update both the workers and users tables in PostgreSQL
      const response = await fetch(`${API_BASE_URL}/worker-applications/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve application');
      }
      
      toast.success("Worker application approved");
      fetchApplications();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast.error(error.message || "Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = rejectionReasons[id]?.trim();
    if (!reason) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      setProcessing(id);
      
      // Call the VPS API endpoint to reject the worker
      const response = await fetch(`${API_BASE_URL}/worker-applications/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject application');
      }
      
      toast.success("Worker application rejected");
      setRejectionReasons((prev) => ({ ...prev, [id]: "" }));
      fetchApplications();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast.error(error.message || "Failed to reject");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Worker Applications</h1>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending worker applications.
          </CardContent>
        </Card>
      ) : (
        applications.map((app) => (
          <Card key={app.$id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{app.name || app.user_name || app.email}</CardTitle>
                <Badge variant={app.verificationStatus === "pending" ? "secondary" : "outline"}>
                  {app.verificationStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Phone:</span> {app.phone || "—"}</div>
                <div><span className="font-medium">Email:</span> {app.email || "—"}</div>
                <div><span className="font-medium">Address:</span> {app.address || "—"}</div>
                <div><span className="font-medium">State:</span> {app.state || "—"}</div>
                <div><span className="font-medium">LGA:</span> {app.lga || "—"}</div>
                <div><span className="font-medium">NIN:</span> {app.nin || app.idNumber || "—"}</div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Documents:</p>
                {app.documentUrl || app.idDocument ? (
                  <div className="space-y-2">
                    <img 
                      src={app.documentUrl || app.idDocument} 
                      alt="ID Document" 
                      className="w-full h-auto max-h-48 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const link = document.createElement('a');
                        link.href = app.documentUrl || app.idDocument;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.className = 'text-blue-600 text-sm flex items-center gap-2';
                        link.innerHTML = '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> View ID Document';
                        e.currentTarget.parentElement?.replaceChild(link, e.currentTarget);
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">No ID document uploaded</p>
                )}
                {app.selfieUrl || app.selfieWithId ? (
                  <div className="space-y-2">
                    <img 
                      src={app.selfieUrl || app.selfieWithId} 
                      alt="Selfie with ID" 
                      className="w-full h-auto max-h-48 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const link = document.createElement('a');
                        link.href = app.selfieUrl || app.selfieWithId;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.className = 'text-blue-600 text-sm flex items-center gap-2';
                        link.innerHTML = '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> View Selfie with ID';
                        e.currentTarget.parentElement?.replaceChild(link, e.currentTarget);
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">No selfie with ID uploaded</p>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!!processing}
                  onClick={() => handleReject(app.$id)}
                >
                  {processing === app.$id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={!!processing}
                  onClick={() => handleApprove(app.$id)}
                >
                  {processing === app.$id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              </div>

              <Input
                placeholder="Rejection reason (required if rejecting)"
                value={rejectionReasons[app.$id] || ""}
                onChange={(e) => setRejectionReasons((prev) => ({ ...prev, [app.$id]: e.target.value }))}
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
