"use client";

import * as React from "react";
import { Star, MapPin, Clock, Shield, CheckCircle, Calendar, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { WorkerProfile } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";
import { ReviewService, type ReviewWithDetails } from "@/lib/review-service";
import { useState, useEffect } from "react";

interface WorkerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  onBookWorker: (worker: WorkerProfile) => void;
  onMessageWorker: (worker: WorkerProfile) => void;
}

export function WorkerProfileModal({ 
  isOpen, 
  onClose, 
  worker, 
  onBookWorker, 
  onMessageWorker 
}: WorkerProfileModalProps) {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Fetch reviews when modal opens
  useEffect(() => {
    if (isOpen && worker?.$id) {
      fetchReviews();
    }
  }, [isOpen, worker?.$id]);

  const fetchReviews = async () => {
    if (!worker?.$id) return;
    
    try {
      setIsLoadingReviews(true);
      const reviewsData = await ReviewService.getWorkerReviews(worker.$id, 3); // Show only 3 recent reviews
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  };
  if (!worker) return null;

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatWorkingHours = (start: string, end: string) => {
    return `${start} - ${end}`;
  };

  const formatWorkingDays = (days: string[]) => {
    const dayMap: { [key: string]: string } = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };
    return days.map(day => dayMap[day] || day).join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Worker Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="relative mx-auto sm:mx-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                <AvatarImage src={worker.profileImage} alt={worker.displayName} />
                <AvatarFallback className="text-xl">
                  {worker.displayName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {worker.isActive && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 w-full text-center sm:text-left">
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{worker.displayName}</h2>
                  <div className="flex items-center justify-center sm:justify-start gap-1 mb-2">
                    <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{worker.city}, {worker.state}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current" />
                    <span className="text-base sm:text-lg font-semibold text-gray-900">{worker.ratingAverage}</span>
                    <span className="text-xs sm:text-sm text-gray-500">({worker.totalReviews} reviews)</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-emerald-600">
                    ₦{worker.hourlyRate.toLocaleString()}/hr
                  </p>
                </div>

                {/* Verification Badges */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {worker.isVerified && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {worker.idVerified && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      ID Verified
                    </Badge>
                  )}
                  {worker.backgroundCheckVerified && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Background Check
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* About Section */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">About</h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{worker.bio}</p>
          </div>

          {/* Skills & Categories */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Skills & Services</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {worker.categories.map((category, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-50 text-xs sm:text-sm">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              {worker.skills && worker.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {worker.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs sm:text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Experience & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Experience</h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Years of Experience</span>
                  <span className="font-medium">{worker.experienceYears} years</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Completed Jobs</span>
                  <span className="font-medium">{worker.completedJobs}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-medium">{formatResponseTime(worker.responseTimeMinutes)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Rehire Rate</span>
                  <span className="font-medium">{worker.rehireRatePercent}%</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Availability</h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Working Days</span>
                  <span className="font-medium text-right">{formatWorkingDays(worker.workingDays)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Working Hours</span>
                  <span className="font-medium text-right">{formatWorkingHours(worker.workingHoursStart, worker.workingHoursEnd)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Service Radius</span>
                  <span className="font-medium">{worker.maxRadiusKm} km</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Last Minute Jobs</span>
                  <span className="font-medium">{worker.acceptsLastMinute ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Weekend Work</span>
                  <span className="font-medium">{worker.acceptsWeekends ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Languages */}
          {worker && worker.languages && worker.languages?.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {worker.languages.map((language, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 text-xs sm:text-sm">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reviews */}
          {worker.totalReviews > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Recent Reviews</h3>
              {isLoadingReviews ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.$id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {review.clientName?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-900">
                            {review.clientName || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {review.comment}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {review.jobTitle || 'Service Request'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No reviews available</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
            <Button
              className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600"
              onClick={() => onBookWorker(worker)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Book Now
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => onMessageWorker(worker)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 