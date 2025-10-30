"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DisputeService } from "@/lib/dispute.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function WorkerDisputeResponsePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [dispute, setDispute] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [response, setResponse] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    loadDispute();
  }, [user, params.id]);

  const loadDispute = async () => {
    try {
      setLoading(true);
      const data = await DisputeService.getDispute(params.id as string);
      setDispute(data);
    } catch (error) {
      console.error('Error loading dispute:', error);
      toast.error('Failed to load dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      toast.error('Please provide your response');
      return;
    }

    try {
      setSubmitting(true);
      const result = await DisputeService.addWorkerResponse(
        params.id as string,
        user!.$id,
        response
      );

      if (result.success) {
        toast.success(result.message);
        loadDispute();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
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
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Dispute not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800',
      worker_responded: 'bg-blue-100 text-blue-800',
      under_review: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dispute Response</h1>
            <p className="text-gray-600 mt-2">Booking #{dispute.bookingId}</p>
          </div>
          <Badge className={getStatusBadge(dispute.status)}>
            {dispute.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Alert */}
      <Alert className="mb-6 border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Dispute Raised:</strong> The client has raised a dispute about this booking.
          Please provide your side of the story below. An admin will review both statements and make a decision.
        </AlertDescription>
      </Alert>

      {/* Dispute Details */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dispute Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="font-medium capitalize">{dispute.category.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount in Dispute</p>
              <p className="font-medium text-lg">₦{dispute.amount?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium">{new Date(dispute.createdAt).toLocaleString('en-NG')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Client's Statement */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Client's Statement</CardTitle>
            </div>
            <CardDescription>What the client reported</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">{dispute.clientStatement}</p>
            </div>
          </CardContent>
        </Card>

        {/* Worker's Response */}
        {dispute.workerResponse ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <CardTitle>Your Response</CardTitle>
              </div>
              <CardDescription>Your statement has been submitted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-gray-900 whitespace-pre-wrap">{dispute.workerResponse}</p>
              </div>
              <Alert className="mt-4">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Your response has been submitted. An admin will review this dispute and make a decision.
                  You may be contacted for additional information.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Provide Your Response</CardTitle>
              <CardDescription>Explain your side of the story</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Provide a detailed explanation of what happened from your perspective. Include any relevant details that support your case."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/worker/bookings')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitResponse}
                  disabled={submitting || !response.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Response'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Notes (if resolved) */}
        {dispute.resolution && dispute.adminNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Decision</CardTitle>
              <CardDescription>
                Resolution: <Badge>{dispute.resolution.replace('_', ' ')}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-gray-900 whitespace-pre-wrap">{dispute.adminNotes}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
