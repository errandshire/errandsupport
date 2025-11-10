"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { DisputeService } from "@/lib/dispute.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, AlertTriangle, MessageSquare, CheckCircle, XCircle, ArrowRightLeft, User, Calendar, DollarSign, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminDisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [dispute, setDispute] = React.useState<any>(null);
  const [client, setClient] = React.useState<any>(null);
  const [worker, setWorker] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [resolving, setResolving] = React.useState(false);
  const [resolution, setResolution] = React.useState("");
  const [adminNotes, setAdminNotes] = React.useState("");

  React.useEffect(() => {
    loadDispute();
  }, [disputeId]);

  const loadDispute = async () => {
    try {
      setLoading(true);
      const data = await DisputeService.getDispute(disputeId);
      setDispute(data);

      // Load client and worker details
      const { databases, COLLECTIONS } = await import('@/lib/appwrite');

      if (data.clientId) {
        const clientData = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          data.clientId
        );
        setClient(clientData);
      }

      if (data.workerId) {
        const workerData = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          data.workerId
        );
        setWorker(workerData);
      }
    } catch (error) {
      console.error('Error loading dispute:', error);
      toast.error('Failed to load dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolution) {
      toast.error('Please select a resolution');
      return;
    }

    try {
      setResolving(true);

      const result = await DisputeService.resolveDispute({
        disputeId,
        resolution: resolution as any,
        adminNotes: adminNotes.trim() || undefined
      });

      if (result.success) {
        toast.success(result.message);
        router.push('/admin/disputes');
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

  if (!dispute) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dispute Not Found</AlertTitle>
          <AlertDescription>The dispute you're looking for doesn't exist.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/disputes')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Disputes
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button variant="ghost" onClick={() => router.push('/admin/disputes')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Disputes
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Dispute #{dispute.$id.slice(0, 8)}</h1>
          <Badge className={getStatusBadge(dispute.status)}>
            {dispute.status.replace('_', ' ')}
          </Badge>
          {dispute.resolution && (
            <Badge variant="outline">
              {dispute.resolution.replace('_', ' ')}
            </Badge>
          )}
        </div>
        <p className="text-gray-600">Raised on {new Date(dispute.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid gap-6">
        {/* Quick Info */}
        <Card>
          <CardHeader>
            <CardTitle>Dispute Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-semibold">₦{dispute.amount?.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-semibold capitalize">{dispute.category.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Booking ID</p>
                <Link href={`/admin/bookings/${dispute.bookingId}`} className="font-semibold text-blue-600 hover:underline">
                  #{dispute.bookingId.slice(0, 8)}
                </Link>
              </div>
            </div>
            {dispute.resolvedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="font-semibold">{new Date(dispute.resolvedAt).toLocaleDateString('en-NG')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parties Involved */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Details */}
          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{client.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-gray-900">{client.email}</p>
                  </div>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-gray-900">{client.phone}</p>
                    </div>
                  </div>
                )}
                <Link href={`/admin/messages?userId=${dispute.clientId}`} className="block mt-4">
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with Client
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Worker Details */}
          {worker && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Worker Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{worker.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-gray-900">{worker.email}</p>
                  </div>
                </div>
                {worker.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-gray-900">{worker.phone}</p>
                    </div>
                  </div>
                )}
                <Link href={`/admin/messages?userId=${dispute.workerId}`} className="block mt-4">
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with Worker
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Client Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Client Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900 whitespace-pre-wrap">{dispute.clientStatement}</p>
            {dispute.evidence && dispute.evidence.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Evidence:</p>
                <div className="flex flex-wrap gap-2">
                  {dispute.evidence.map((url: string, idx: number) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                      Evidence {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worker Response */}
        {dispute.workerResponse ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Worker Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 whitespace-pre-wrap">{dispute.workerResponse}</p>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Awaiting Worker Response</AlertTitle>
            <AlertDescription>The worker has not yet responded to this dispute.</AlertDescription>
          </Alert>
        )}

        {/* Admin Notes */}
        {dispute.adminNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 whitespace-pre-wrap">{dispute.adminNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Resolution Section */}
        {dispute.status !== 'resolved' && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Resolve Dispute</CardTitle>
              <CardDescription>Choose how to resolve this dispute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Alert>
                  <AlertDescription>
                    {resolution === 'approve_worker' && (
                      <span><strong>Action:</strong> Payment (₦{dispute.amount?.toLocaleString()}) will be released to worker's wallet.</span>
                    )}
                    {resolution === 'refund_client' && (
                      <span><strong>Action:</strong> Money (₦{dispute.amount?.toLocaleString()}) will be refunded to client's wallet.</span>
                    )}
                    {resolution === 'resolve_themselves' && (
                      <span><strong>Action:</strong> No automatic payment action. Both parties will be notified to resolve directly.</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleResolve} disabled={resolving || !resolution} className="w-full" size="lg">
                {resolving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  'Confirm Resolution'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {dispute.status === 'resolved' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Dispute Resolved</AlertTitle>
            <AlertDescription className="text-green-800">
              This dispute was resolved on {new Date(dispute.resolvedAt).toLocaleDateString('en-NG')} with resolution: {dispute.resolution.replace('_', ' ')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
