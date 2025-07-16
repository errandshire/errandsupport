"use client";

import * as React from "react";
import { MessageCircle, MapPin, Clock, DollarSign, Calendar, User, Phone, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Booking } from "@/lib/types";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onOpenMessage: (clientId: string, clientName: string) => void;
}

export function BookingDetailModal({ isOpen, onClose, booking, onOpenMessage }: BookingDetailModalProps) {
  const { user } = useAuth();
  const [clientInfo, setClientInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  // Fetch client information when booking changes
  React.useEffect(() => {
    if (booking?.clientId) {
      fetchClientInfo(booking.clientId);
    }
  }, [booking?.clientId]);

  const fetchClientInfo = async (clientId: string) => {
    try {
      setLoading(true);
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        clientId
      );
      setClientInfo(response);
    } catch (error) {
      console.error('Error fetching client info:', error);
      toast.error("Failed to load client information");
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClient = () => {
    if (booking && clientInfo) {
      onOpenMessage(booking.clientId, clientInfo.name);
      onClose();
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Booking Details</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Status and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
              <Badge className={getUrgencyColor(booking.urgency)}>
                {booking.urgency.charAt(0).toUpperCase() + booking.urgency.slice(1)} Priority
              </Badge>
            </div>
            <Button
              onClick={handleMessageClient}
              disabled={loading || !clientInfo}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message Client
            </Button>
          </div>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Client Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                  <span>Loading client information...</span>
                </div>
              ) : clientInfo ? (
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={clientInfo.avatar} alt={clientInfo.name} />
                    <AvatarFallback>
                      {clientInfo.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{clientInfo.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      {clientInfo.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{clientInfo.email}</span>
                        </div>
                      )}
                      {clientInfo.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4" />
                          <span>{clientInfo.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Failed to load client information</p>
              )}
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>{booking.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{booking.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{booking.locationAddress}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{formatDate(booking.scheduledDate)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{booking.estimatedDuration} hour(s)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {formatCurrency(booking.budgetAmount)}
                    {booking.budgetIsHourly && ' /hour'}
                  </span>
                </div>
              </div>

              {booking.requirements && booking.requirements.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Requirements</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {booking.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created</span>
                  <span>{formatDate(booking.createdAt)}</span>
                </div>
                {booking.acceptedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Accepted</span>
                    <span>{formatDate(booking.acceptedAt)}</span>
                  </div>
                )}
                {booking.startedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Started</span>
                    <span>{formatDate(booking.startedAt)}</span>
                  </div>
                )}
                {booking.completedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Completed</span>
                    <span>{formatDate(booking.completedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Amount</span>
                  <p className="font-semibold">{formatCurrency(booking.budgetAmount)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Payment Status</span>
                  <p className="font-semibold">
                    {booking.paymentStatus ? 
                      booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1) : 
                      'Pending'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 