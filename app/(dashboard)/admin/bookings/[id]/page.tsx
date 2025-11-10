"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Calendar, DollarSign, MapPin, User, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = React.useState<any>(null);
  const [worker, setWorker] = React.useState<any>(null);
  const [client, setClient] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);

      // Get booking
      const bookingData = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );
      setBooking(bookingData);

      // Get worker details
      if (bookingData.workerId) {
        const workerData = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          bookingData.workerId
        );
        setWorker(workerData);
      }

      // Get client details
      if (bookingData.clientId) {
        const clientData = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          bookingData.clientId
        );
        setClient(clientData);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      toast.error('Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800',
      disputed: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      held: 'bg-blue-100 text-blue-800',
      released: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800',
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

  if (!booking) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Booking Not Found</AlertTitle>
          <AlertDescription>The booking you're looking for doesn't exist.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/bookings')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bookings
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button variant="ghost" onClick={() => router.push('/admin/bookings')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Bookings
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Booking #{booking.$id.slice(0, 8)}</h1>
          <Badge className={getStatusBadge(booking.status)}>
            {booking.status.replace('_', ' ')}
          </Badge>
          <Badge className={getPaymentStatusBadge(booking.paymentStatus)}>
            Payment: {booking.paymentStatus}
          </Badge>
        </div>
        <p className="text-gray-600">Created on {new Date(booking.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid gap-6">
        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Service</p>
              <p className="font-semibold text-lg">{booking.title}</p>
            </div>
            {booking.description && (
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-gray-900">{booking.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Scheduled Date</p>
                  <p className="font-semibold">{new Date(booking.scheduledDate).toLocaleDateString('en-NG')}</p>
                </div>
              </div>
              {booking.scheduledTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Scheduled Time</p>
                    <p className="font-semibold">{booking.scheduledTime}</p>
                  </div>
                </div>
              )}
            </div>
            {booking.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-semibold">{booking.location}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Budget Amount</span>
              <span className="font-semibold text-lg">₦{booking.budgetAmount?.toLocaleString()}</span>
            </div>
            {booking.platformFee && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Platform Fee</span>
                <span className="text-gray-900">₦{booking.platformFee?.toLocaleString()}</span>
              </div>
            )}
            {booking.totalAmount && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-xl">₦{booking.totalAmount?.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="pt-2">
              <p className="text-sm text-gray-600">Payment Status</p>
              <Badge className={getPaymentStatusBadge(booking.paymentStatus)}>
                {booking.paymentStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Client Info */}
        {client && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{client.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900">{client.phone}</p>
                </div>
              )}
              <Link href={`/admin/users/${client.$id}`}>
                <Button variant="outline" size="sm" className="mt-2">
                  View Client Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Worker Info */}
        {worker && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Worker Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{worker.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900">{worker.email}</p>
              </div>
              {worker.phone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900">{worker.phone}</p>
                </div>
              )}
              <Link href={`/admin/users/${worker.$id}`}>
                <Button variant="outline" size="sm" className="mt-2">
                  View Worker Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
              <div className="flex-1">
                <p className="font-semibold">Booking Created</p>
                <p className="text-sm text-gray-600">{new Date(booking.createdAt).toLocaleString('en-NG')}</p>
              </div>
            </div>
            {booking.acceptedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-semibold">Accepted by Worker</p>
                  <p className="text-sm text-gray-600">{new Date(booking.acceptedAt).toLocaleString('en-NG')}</p>
                </div>
              </div>
            )}
            {booking.completedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-semibold">Completed</p>
                  <p className="text-sm text-gray-600">{new Date(booking.completedAt).toLocaleString('en-NG')}</p>
                </div>
              </div>
            )}
            {booking.cancelledAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-semibold">Cancelled</p>
                  <p className="text-sm text-gray-600">{new Date(booking.cancelledAt).toLocaleString('en-NG')}</p>
                  {booking.cancellationReason && (
                    <p className="text-sm text-gray-600 mt-1">Reason: {booking.cancellationReason}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Alert */}
        {booking.status === 'disputed' && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Disputed</AlertTitle>
            <AlertDescription className="text-orange-800">
              This booking has an active dispute.
              <Link href="/admin/disputes" className="ml-2 underline font-semibold">
                View Disputes
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {booking.status === 'completed' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Completed</AlertTitle>
            <AlertDescription className="text-green-800">
              This booking was successfully completed.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
