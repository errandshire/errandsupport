"use client";

import * as React from "react";
import { Calendar, Clock, MapPin, Star, MessageCircle, MoreVertical, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BookingCardProps {
  booking: {
    id: string;
    title: string;
    description: string;
    status: string;
    scheduledDate: string;
    estimatedDuration: number;
    locationAddress: string;
    budgetAmount: number;
    budgetCurrency: string;
    clientId: string;
    workerId: string;
    createdAt: string;
  };
  userProfile: {
    id: string;
    name: string;
    profileImage?: string;
    rating?: number;
  };
  userRole: 'client' | 'worker';
  onMessage?: (booking: any) => void;
  onAccept?: (booking: any) => void;
  onDecline?: (booking: any) => void;
  onCancel?: (booking: any) => void;
  onComplete?: (booking: any) => void;
  onViewDetails?: (booking: any) => void;
}

export function BookingCard({
  booking,
  userProfile,
  userRole,
  onMessage,
  onAccept,
  onDecline,
  onCancel,
  onComplete,
  onViewDetails
}: BookingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'declined':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'declined':
        return 'Declined';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canAccept = userRole === 'worker' && booking.status === 'pending';
  const canDecline = userRole === 'worker' && booking.status === 'pending';
  const canCancel = booking.status === 'pending' || booking.status === 'accepted';
  const canComplete = userRole === 'worker' && booking.status === 'in_progress';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile.profileImage} alt={userProfile.name} />
              <AvatarFallback>
                {userProfile.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{booking.title}</h3>
              <p className="text-sm text-gray-600">
                {userRole === 'client' ? 'Worker' : 'Client'}: {userProfile.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={cn("text-xs", getStatusColor(booking.status))}>
              {getStatusText(booking.status)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem onClick={() => onViewDetails(booking)}>
                    View Details
                  </DropdownMenuItem>
                )}
                {onMessage && (
                  <DropdownMenuItem onClick={() => onMessage(booking)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </DropdownMenuItem>
                )}
                {canAccept && onAccept && (
                  <DropdownMenuItem onClick={() => onAccept(booking)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept
                  </DropdownMenuItem>
                )}
                {canDecline && onDecline && (
                  <DropdownMenuItem onClick={() => onDecline(booking)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </DropdownMenuItem>
                )}
                {canCancel && onCancel && (
                  <DropdownMenuItem onClick={() => onCancel(booking)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </DropdownMenuItem>
                )}
                {canComplete && onComplete && (
                  <DropdownMenuItem onClick={() => onComplete(booking)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{booking.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(booking.scheduledDate)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{formatTime(booking.scheduledDate)} ({booking.estimatedDuration}h)</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{booking.locationAddress}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">
              {booking.budgetCurrency === 'NGN' ? '₦' : booking.budgetCurrency}
              {booking.budgetAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {userProfile.rating && (
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span>{userProfile.rating}</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 mt-4">
          {canAccept && onAccept && (
            <Button size="sm" onClick={() => onAccept(booking)} className="flex-1">
              Accept
            </Button>
          )}
          {canDecline && onDecline && (
            <Button size="sm" variant="outline" onClick={() => onDecline(booking)} className="flex-1">
              Decline
            </Button>
          )}
          {canComplete && onComplete && (
            <Button size="sm" onClick={() => onComplete(booking)} className="flex-1">
              Mark Complete
            </Button>
          )}
          {onMessage && (
            <Button size="sm" variant="outline" onClick={() => onMessage(booking)}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 