"use client";

import * as React from "react";
import { MessageCircle, MapPin, Clock, DollarSign, Calendar, User, Phone, Mail, X, Check, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { BookingNotificationService } from "@/lib/booking-notification-service";

// Updated interface to handle both old and new booking structures
interface FlattenedBooking {
  $id?: string;
  id?: string; // legacy field
  clientId?: string;
  client?: string; // legacy field
  workerId?: string;
  categoryId?: string;
  title?: string;
  service?: string; // legacy field
  description?: string;
  // Flattened location fields
  locationAddress?: string;
  location?: string; // legacy field
  locationLat?: number;
  locationLng?: number;
  scheduledDate?: string;
  date?: string; // legacy field
  estimatedDuration?: number;
  duration?: string | number; // legacy field
  // Flattened budget fields
  budgetAmount?: number;
  price?: string | number; // legacy field
  budgetCurrency?: string;
  budgetIsHourly?: boolean;
  urgency?: string;
  status?: string;
  paymentStatus?: string;
  requirements?: string[];
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  clientConfirmedAt?: string;
  clientRating?: number;
  clientReview?: string;
  clientTip?: number;
}

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: (FlattenedBooking & {
    clientName: string;
    clientEmail?: string;
  }) | null;
  onOpenMessage?: (booking: any) => void;
  onRefresh?: () => void;
}

export function BookingDetailModal({ 
  isOpen, 
  onClose, 
  booking, 
  onOpenMessage,
  onRefresh 
}: BookingDetailModalProps) {
  const { user } = useAuth();
  const [clientInfo, setClientInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  
  // Local booking state for immediate UI updates
  const [localBooking, setLocalBooking] = React.useState<any>(null);

  // Initialize local booking state when booking prop changes
  React.useEffect(() => {
    if (booking) {
      setLocalBooking(booking);
    }
  }, [booking]);

  // Debug logging
  React.useEffect(() => {
    if (booking) {
    }
  }, [booking]);

  const fetchClientInfo = async (clientId: string) => {
    if (!clientId) {
      console.error('No client ID provided:', { booking });
      toast.error("Missing client information");
      return;
    }

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
      setClientInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch client information when booking changes
  React.useEffect(() => {
    if (booking?.clientId) {
      fetchClientInfo(booking.clientId);
    } else {
      setClientInfo(null);
      console.warn('No client ID available in booking:', booking);
    }
  }, [booking?.clientId]);

  // Helper functions for data access with fallbacks
  const getBookingTitle = () => (booking as FlattenedBooking)?.title || (booking as FlattenedBooking)?.service || 'Untitled Booking';
  const getBookingDescription = () => booking?.description || 'No description provided';
  const getBookingLocation = () => (booking as FlattenedBooking)?.locationAddress || (booking as FlattenedBooking)?.location || 'Location not specified';
  const getBookingDate = () => (booking as FlattenedBooking)?.scheduledDate || (booking as FlattenedBooking)?.date || '';
  const getBookingDuration = () => {
    const b = booking as FlattenedBooking;
    if (b?.estimatedDuration) return b.estimatedDuration;
    if (b?.duration) {
      const duration = typeof b.duration === 'string' 
        ? parseInt(b.duration) 
        : b.duration;
      return isNaN(duration) ? 1 : duration;
    }
    return 1;
  };
  const getBookingAmount = () => {
    const b = booking as FlattenedBooking;
    if (b?.budgetAmount) return b.budgetAmount;
    if (b?.price) {
      const price = typeof b.price === 'string'
        ? parseFloat(b.price.replace('₦', '').replace(',', ''))
        : b.price;
      return isNaN(price) ? 0 : price;
    }
    return 0;
  };
  const getBookingCurrency = () => booking?.budgetCurrency || 'NGN';
  const getBookingPaymentStatus = () => {
    return booking?.paymentStatus || (booking?.status === 'confirmed' ? 'paid' : 'pending');
  };

  // Helper functions for formatted display
  const getFormattedDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getFormattedAmount = (amount: number, currency: string) => {
    if (!amount || amount === 0) return '₦0';
    try {
      const symbol = currency === 'NGN' ? '₦' : currency;
      return `${symbol}${amount.toLocaleString()}`;
    } catch {
      return '₦0';
    }
  };

  const getPaymentStatusDisplay = (paymentStatus: string) => {
    switch (paymentStatus?.toLowerCase()) {
      case 'paid':
        return { text: 'Paid', color: 'bg-green-100 text-green-800' };
      case 'pending':
        return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
      case 'failed':
        return { text: 'Failed', color: 'bg-red-100 text-red-800' };
      case 'refunded':
        return { text: 'Refunded', color: 'bg-gray-100 text-gray-800' };
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-600' };
    }
  };

  const getBookingStatusDisplay = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { text: 'Payment Confirmed', color: 'bg-blue-100 text-blue-800' };
      case 'accepted':
        return { text: 'Accepted', color: 'bg-emerald-100 text-emerald-800' };
      case 'in_progress':
        return { text: 'In Progress', color: 'bg-purple-100 text-purple-800' };
      case 'worker_completed':
        return { text: 'Awaiting Client Confirmation', color: 'bg-orange-100 text-orange-800' };
      case 'completed':
        return { text: 'Completed', color: 'bg-green-100 text-green-800' };
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-800' };
      default:
        return { text: status || 'Unknown', color: 'bg-gray-100 text-gray-600' };
    }
  };

  const handleMessageClient = () => {
    if (!booking) {
      toast.error("No booking information available");
      return;
    }

    if (onOpenMessage) {
      onOpenMessage(booking);
      onClose();
    } else {
      console.warn("onOpenMessage callback not provided");
      toast.error("Message functionality not available");
    }
  };

  // Handle booking status updates
  const handleAcceptBooking = async () => {
    if (!booking || !user) {
      toast.error("Missing booking or user information");
      return;
    }
    
    const b = booking as FlattenedBooking;
    
    // More detailed validation with specific error messages
    const bookingId = b.$id || b.id;
    const clientId = b.clientId || b.client;
    const workerId = b.workerId || user.$id; // Fallback to current user
    
    
    
    if (!bookingId) {
      console.error('Missing booking ID:', { booking: b });
      toast.error("Invalid booking: Missing booking ID");
      return;
    }
    
    if (!clientId) {
      console.error('Missing client ID:', { booking: b });
      toast.error("Invalid booking: Missing client information");
      return;
    }
    
    if (!workerId) {
      console.error('Missing worker ID:', { booking: b, currentUser: user });
      toast.error("Invalid booking: Missing worker information");
      return;
    }

    try {
      setIsUpdating(true);

      // Use the new BookingActionService
      const { BookingActionService } = await import('@/lib/booking-action-service');
      
      const result = await BookingActionService.acceptBooking({
        bookingId,
        userId: user.$id,
        userRole: 'worker',
        action: 'accept'
      });

      if (result.success) {
        // Update local booking state immediately for instant UI feedback
        setLocalBooking((prev: any) => ({
          ...prev,
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        toast.success(result.message);
        onRefresh?.(); // Update parent component data
        // Don't close modal - let user see the immediate change
      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error("Failed to accept booking. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectBooking = async () => {
    if (!booking || !user) {
      toast.error("Missing booking or user information");
      return;
    }
    
    const b = booking as FlattenedBooking;
    
    // More detailed validation with specific error messages
    const bookingId = b.$id || b.id;
    const clientId = b.clientId || b.client;
    const workerId = b.workerId || user.$id; // Fallback to current user
    
   
    
    if (!bookingId) {
      console.error('Missing booking ID:', { booking: b });
      toast.error("Invalid booking: Missing booking ID");
      return;
    }
    
    if (!clientId) {
      console.error('Missing client ID:', { booking: b });
      toast.error("Invalid booking: Missing client information");
      return;
    }
    
    if (!workerId) {
      console.error('Missing worker ID:', { booking: b, currentUser: user });
      toast.error("Invalid booking: Missing worker information");
      return;
    }

    try {
      setIsUpdating(true);

      // Use the new BookingActionService
      const { BookingActionService } = await import('@/lib/booking-action-service');
      
      const result = await BookingActionService.rejectBooking({
        bookingId,
        userId: user.$id,
        userRole: 'worker',
        action: 'reject',
        reason: 'Worker declined booking'
      });

      if (result.success) {
        toast.success(result.message);
        onRefresh?.();
        onClose();
      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error("Failed to reject booking. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartWork = async () => {
    if (!booking || !user) {
      toast.error("Missing booking or user information");
      return;
    }
    
    const b = booking as FlattenedBooking;
    
    // More detailed validation with specific error messages
    const bookingId = b.$id || b.id;
    const clientId = b.clientId || b.client;
    const workerId = b.workerId || user.$id; // Fallback to current user
    
    
    
    if (!bookingId) {
      console.error('Missing booking ID:', { booking: b });
      toast.error("Invalid booking: Missing booking ID");
      return;
    }

    try {
      setIsUpdating(true);

      // Use the new BookingActionService
      const { BookingActionService } = await import('@/lib/booking-action-service');
      
      const result = await BookingActionService.startWork({
        bookingId,
        userId: user.$id,
        userRole: 'worker',
        action: 'start_work'
      });

      if (result.success) {
        // Update local booking state immediately for instant UI feedback
        setLocalBooking((prev: any) => ({
          ...prev,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        toast.success(result.message);
        onRefresh?.(); // Update parent component data
        // Don't close modal - let user see the immediate change
      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error('Error starting work:', error);
      toast.error("Failed to start work. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!booking || !user) {
      toast.error("Missing booking or user information");
      return;
    }
    
    const b = booking as FlattenedBooking;
    
    // More detailed validation with specific error messages
    const bookingId = b.$id || b.id;
    const clientId = b.clientId || b.client;
    const workerId = b.workerId || user.$id; // Fallback to current user
    
   
    
    if (!bookingId) {
      console.error('Missing booking ID:', { booking: b });
      toast.error("Invalid booking: Missing booking ID");
      return;
    }

    try {
      setIsUpdating(true);

      // Use the new BookingActionService
      const { BookingActionService } = await import('@/lib/booking-action-service');
      
      const result = await BookingActionService.markCompleted({
        bookingId,
        userId: user.$id,
        userRole: 'worker',
        action: 'mark_completed'
      });

      if (result.success) {
        // Update local booking state immediately for instant UI feedback
        setLocalBooking((prev: any) => ({
          ...prev,
          status: 'worker_completed',
          workerCompletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        toast.success(result.message);
        onRefresh?.(); // Update parent component data
        // Don't close modal - let user see the immediate change
      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error('Error marking completed:', error);
      toast.error("Failed to mark as completed. Please try again.");
    } finally {
      setIsUpdating(false);
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
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-emerald-100 text-emerald-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'worker_completed': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Payment Confirmed';
      case 'accepted': return 'Accepted';
      case 'in_progress': return 'In Progress';
      case 'worker_completed': return 'Awaiting Client Confirmation';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '₦0';
    }
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date') {
      return 'Not specified';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Not specified';
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Not specified';
    }
  };

  // Use localBooking for immediate UI updates
  const currentBooking = localBooking || booking;
  const canAccept = currentBooking?.status === 'confirmed';
  const canStart = currentBooking?.status === 'accepted';
  const canComplete = currentBooking?.status === 'in_progress';
  const isCompleted = currentBooking?.status === 'completed' || currentBooking?.status === 'worker_completed';

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] w-[95vw] sm:w-full overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-between text-lg sm:text-xl">
            <span>Booking Details</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 sm:h-10 sm:w-10">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Booking Status and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getBookingStatusDisplay(currentBooking?.status || '').color}>
                {getBookingStatusDisplay(currentBooking?.status || '').text}
              </Badge>
                              <Badge className={getUrgencyColor(currentBooking?.urgency || '')}>
                  {(currentBooking?.urgency || 'Normal').charAt(0).toUpperCase() + (currentBooking?.urgency || 'normal').slice(1)} Priority
                </Badge>
            </div>
            <Button
              onClick={handleMessageClient}
              disabled={loading || !clientInfo}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message Client
            </Button>
          </div>

          {/* Status-based Action Buttons */}
          {(canAccept || canStart || canComplete) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                  <span className="block text-sm sm:text-base">
                    {canAccept && "Ready to accept this booking?"}
                    {canStart && "Ready to start work?"}
                    {canComplete && "Work completed? Mark as done for client confirmation."}
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {canAccept && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={handleRejectBooking}
                          disabled={isUpdating}
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleAcceptBooking}
                          disabled={isUpdating}
                          className="bg-emerald-500 hover:bg-emerald-600 w-full sm:w-auto"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                      </>
                    )}
                    {canStart && (
                      <Button 
                        size="sm" 
                        onClick={handleStartWork}
                        disabled={isUpdating}
                        className="bg-blue-500 hover:bg-blue-600 w-full sm:w-auto"
                      >
                        Start Work
                      </Button>
                    )}
                    {canComplete && (
                      <Button 
                        size="sm" 
                        onClick={handleMarkCompleted}
                        disabled={isUpdating}
                        className="bg-purple-500 hover:bg-purple-600 w-full sm:w-auto"
                      >
                        Mark Completed
                      </Button>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Client Information */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Client Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary-500" />
                  <span className="text-sm sm:text-base">Loading client information...</span>
                </div>
              ) : clientInfo ? (
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarImage src={clientInfo.avatar || clientInfo.profileImage} alt={clientInfo.name || clientInfo.displayName} />
                    <AvatarFallback>
                      {(clientInfo.name || clientInfo.displayName || 'C').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{clientInfo.name || clientInfo.displayName || 'Client'}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-600 mt-1 space-y-1 sm:space-y-0">
                      {clientInfo.email && (
                        <div className="flex items-center space-x-1 min-w-0">
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{clientInfo.email}</span>
                        </div>
                      )}
                      {clientInfo.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{clientInfo.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2 text-sm sm:text-base">Failed to load client information</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const b = booking as FlattenedBooking;
                      if (!b?.clientId) {
                        console.error('No client ID available:', { booking: b });
                        toast.error("Missing client information");
                        return;
                      }
                      fetchClientInfo(b.clientId);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Booking */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">{getBookingTitle()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Description</h4>
                <p className="text-gray-600 text-sm sm:text-base">
                  {getBookingDescription()}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm sm:text-base">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{getBookingLocation()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm sm:text-base">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{getFormattedDate(getBookingDate())}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm sm:text-base">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{getBookingDuration()} hour(s)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm sm:text-base">
                  <DollarSign className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{getFormattedAmount(getBookingAmount(), getBookingCurrency())}</span>
                </div>
              </div>

              {(booking as FlattenedBooking)?.requirements?.length && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Requirements</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm sm:text-base">
                    {(booking as FlattenedBooking).requirements!.map((req: string, index: number) => (
                      <li key={index} className="break-words">{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Timeline */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Booking Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-gray-600 text-sm sm:text-base">Created</span>
                  <span className="font-medium text-sm sm:text-base">
                    {getFormattedDate(booking.createdAt || '')}
                  </span>
                </div>
                
                {booking.acceptedAt && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">Accepted</span>
                    <span className="font-medium text-sm sm:text-base">
                      {getFormattedDate(booking.acceptedAt || '')}
                    </span>
                  </div>
                )}
                
                {booking.startedAt && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">Started</span>
                    <span className="font-medium text-sm sm:text-base">
                      {getFormattedDate(booking.startedAt || '')}
                    </span>
                  </div>
                )}
                
                {booking.completedAt && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">Completed</span>
                    <span className="font-medium text-sm sm:text-base">
                      {getFormattedDate(booking.completedAt || '')}
                    </span>
                  </div>
                )}
                
                {booking.clientConfirmedAt && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">Client Confirmed</span>
                    <span className="font-medium text-sm sm:text-base">
                      {getFormattedDate(booking.clientConfirmedAt || '')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
                <div>
                  <span className="text-gray-600 block">Amount</span>
                  <p className="font-semibold">{getFormattedAmount(getBookingAmount(), getBookingCurrency())}</p>
                </div>
                <div>
                  <span className="text-gray-600 block">Payment Status</span>
                  <div className="mt-1">
                    <Badge className={getPaymentStatusDisplay(getBookingPaymentStatus()).color}>
                      {getPaymentStatusDisplay(getBookingPaymentStatus()).text}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 block">Currency</span>
                  <p className="font-semibold">{getBookingCurrency()}</p>
                </div>
                <div>
                  <span className="text-gray-600 block">Rate Type</span>
                  <p className="font-semibold">{booking?.budgetIsHourly ? 'Hourly' : 'Fixed'}</p>
                </div>
              </div>
              
              {booking?.status === 'worker_completed' && (
                <Alert className="mt-4 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 text-sm sm:text-base">
                    <strong>Payment Release:</strong> Payment will be released once the client confirms work completion.
                  </AlertDescription>
                </Alert>
              )}

              {getBookingPaymentStatus() === 'paid' && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-sm sm:text-base">
                    <strong>Secure Payment:</strong> Payment has been securely held in escrow and will be released upon completion.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 