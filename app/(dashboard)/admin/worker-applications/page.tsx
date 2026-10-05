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
      const response = await fetch(`${API_BASE_URL}/api/worker-applications?status=pending`);
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
      const response = await fetch(`${API_BASE_URL}/api/worker-applications/${id}/approve`, {
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
      const response = await fetch(`${API_BASE_URL}/api/worker-applications/${id}/reject`, {
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
                <div><span className="font-medium">NIN:</span> {app.idNumber || "—"}</div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Documents:</p>
                {app.idDocument ? (
                  <a href={app.idDocument} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> View ID Document
                  </a>
                ) : (
                  <p className="text-sm text-neutral-500">No ID document uploaded</p>
                )}
                {app.selfieWithId ? (
                  <a href={app.selfieWithId} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> View Selfie with ID
                  </a>
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
