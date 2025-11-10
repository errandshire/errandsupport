"use client";

import * as React from "react";
import Link from "next/link";
import { DisputeService } from "@/lib/dispute.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, RefreshCw, Eye, MessageSquare, CheckCircle, XCircle, ArrowRightLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedDispute, setSelectedDispute] = React.useState<any>(null);
  const [showResolveModal, setShowResolveModal] = React.useState(false);
  const [resolution, setResolution] = React.useState<string>("");
  const [adminNotes, setAdminNotes] = React.useState("");
  const [resolving, setResolving] = React.useState(false);

  const loadDisputes = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await DisputeService.getAllDisputes(statusFilter);
      setDisputes(data);
    } catch (error) {
      console.error('Error loading disputes:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const stats = React.useMemo(() => {
    const all = disputes.length;
    const pending = disputes.filter(d => d.status === 'pending').length;
    const workerResponded = disputes.filter(d => d.status === 'worker_responded').length;
    const resolved = disputes.filter(d => d.status === 'resolved').length;

    return { all, pending, workerResponded, resolved };
  }, [disputes]);

  const handleResolve = (dispute: any) => {
    setSelectedDispute(dispute);
    setShowResolveModal(true);
    setResolution("");
    setAdminNotes("");
  };

  const handleSubmitResolution = async () => {
    if (!resolution) {
      toast.error('Please select a resolution');
      return;
    }

    try {
      setResolving(true);
      const result = await DisputeService.resolveDispute({
        disputeId: selectedDispute.$id,
        resolution: resolution as any,
        adminNotes: adminNotes.trim() || undefined
      });

      if (result.success) {
        toast.success(result.message);
        setShowResolveModal(false);
        loadDisputes();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error('Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800',
      worker_responded: 'bg-blue-100 text-blue-800',
      under_review: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Disputes</h1>
        <p className="text-gray-600 mt-2">Monitor and resolve disputes between clients and workers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Disputes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.all}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Response</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Worker Responded</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.workerResponded}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="worker_responded">Worker Responded</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadDisputes}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <Card>
        <CardHeader>
          <CardTitle>Dispute Cases ({disputes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Disputes Found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'No disputes have been raised yet.'
                  : `No disputes with status: ${statusFilter}`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((dispute) => (
                <div
                  key={dispute.$id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                      <h3 className="font-semibold text-lg">Dispute #{dispute.$id.slice(0, 8)}</h3>
                      <Badge className={getStatusBadge(dispute.status)}>
                        {dispute.status.replace('_', ' ')}
                      </Badge>
                      {dispute.resolution && (
                        <Badge variant="outline">
                          {dispute.resolution.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-600">Booking:</span>
                        <Link href={`/admin/bookings/${dispute.bookingId}`} className="ml-1 text-blue-600 hover:underline">
                          #{dispute.bookingId.slice(0, 8)}
                        </Link>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <span className="ml-1 font-semibold">₦{dispute.amount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Category:</span>
                        <span className="ml-1 capitalize">{dispute.category.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <span className="ml-1">{new Date(dispute.createdAt).toLocaleDateString('en-NG')}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-600">Client:</p>
                          <p className="text-gray-900 line-clamp-2">{dispute.clientStatement}</p>
                        </div>
                      </div>
                      {dispute.workerResponse && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-gray-600">Worker:</p>
                            <p className="text-gray-900 line-clamp-2">{dispute.workerResponse}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                    <Link href={`/admin/disputes/${dispute.$id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View Full
                      </Button>
                    </Link>
                    {dispute.status !== 'resolved' && dispute.workerResponse && (
                      <Button
                        size="sm"
                        onClick={() => handleResolve(dispute)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                    <Link href={`/admin/messages?userId=${dispute.clientId}`}>
                      <Button size="sm" variant="ghost" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat Client
                      </Button>
                    </Link>
                    <Link href={`/admin/messages?userId=${dispute.workerId}`}>
                      <Button size="sm" variant="ghost" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat Worker
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Choose how to resolve this dispute between client and worker
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Resolution Decision</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select resolution..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve_worker">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Approve Worker - Release Payment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="refund_client">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Refund Client - Return Money</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="resolve_themselves">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                      <span>Let Them Resolve It Themselves</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add notes about your decision. This will be visible to both parties."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>

            {resolution && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="text-blue-900">
                  {resolution === 'approve_worker' && (
                    <><strong>Action:</strong> Payment (₦{selectedDispute?.amount?.toLocaleString()}) will be released to worker's wallet.</>
                  )}
                  {resolution === 'refund_client' && (
                    <><strong>Action:</strong> Money (₦{selectedDispute?.amount?.toLocaleString()}) will be refunded to client's wallet.</>
                  )}
                  {resolution === 'resolve_themselves' && (
                    <><strong>Action:</strong> No automatic payment action. Both parties will be notified to resolve directly.</>
                  )}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResolution} disabled={resolving || !resolution}>
              {resolving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Confirm Resolution'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
