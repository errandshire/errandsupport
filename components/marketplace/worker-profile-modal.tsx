"use client";

import * as React from "react";
import { Star, MapPin, Shield, CheckCircle, Calendar, MessageCircle, Briefcase, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PublicWorkerProfile } from "@/lib/sanitize-worker";
import { ReviewService, type ReviewWithDetails } from "@/lib/review-service";
import { useState, useEffect } from "react";

interface WorkerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: PublicWorkerProfile | null;
  onBookWorker: (worker: PublicWorkerProfile) => void;
  onMessageWorker: (worker: PublicWorkerProfile) => void;
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

  useEffect(() => {
    if (isOpen && worker?.$id) {
      fetchReviews();
    }
  }, [isOpen, worker?.$id]);

  const fetchReviews = async () => {
    if (!worker?.$id) return;
    try {
      setIsLoadingReviews(true);
      const reviewsData = await ReviewService.getWorkerReviews(worker.$id, 3);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  if (!worker) return null;

  const formatWorkingHours = (start?: string, end?: string) => {
    if (!start || !end) return '--';
    return `${start} - ${end}`;
  };

  const formatWorkingDays = (days?: string[]) => {
    if (!days || days.length === 0) return '--';
    const dayMap: Record<string, string> = {
      monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
      thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
    };
    return days.map(day => dayMap[day] || day).join(', ');
  };

  const initials = (worker.displayName || 'W')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[95vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Worker Profile</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="px-5 sm:px-8 pt-8 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative flex-shrink-0">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-gray-100">
                <AvatarImage src={worker.profileImage || undefined} alt={worker.displayName} />
                <AvatarFallback className="bg-emerald-500 text-white text-2xl sm:text-3xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {worker.isActive && (
                <div className="absolute bottom-1 right-1 h-6 w-6 bg-emerald-500 rounded-full border-[3px] border-white flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-gray-950 mb-1">
                {worker.displayName}
              </h2>
              {(worker.city || worker.state) && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-500 mb-4">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    {[worker.city, worker.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-bold">{worker.ratingAverage || 'New'}</span>
                  {worker.totalReviews ? (
                    <span className="text-xs text-amber-500">({worker.totalReviews})</span>
                  ) : null}
                </div>
                <span className="text-xl font-bold text-gray-950">
                  ₦{worker.hourlyRate?.toLocaleString()}<span className="text-sm font-medium text-gray-400">/hr</span>
                </span>
              </div>

              {/* Verification Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {worker.isVerified && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                    <Shield className="h-3 w-3" /> Verified
                  </span>
                )}
                {worker.idVerified && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                    <CheckCircle className="h-3 w-3" /> ID Verified
                  </span>
                )}
                {worker.backgroundCheckVerified && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                    <Shield className="h-3 w-3" /> Background Check
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Body */}
        <div className="px-5 sm:px-8 py-6 space-y-6">

          {/* About */}
          {worker.bio && (
            <div>
              <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wider mb-2">About</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{worker.bio}</p>
            </div>
          )}

          {/* Categories + Skills */}
          <div>
            <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wider mb-3">Services</h3>
            <div className="flex flex-wrap gap-2">
              {worker.categories.map((category, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium border border-gray-100"
                >
                  {category}
                </span>
              ))}
              {worker.skills && worker.skills.map((skill, index) => (
                <span
                  key={`skill-${index}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-medium border border-emerald-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Briefcase className="h-5 w-5 text-gray-400 mx-auto mb-1.5" />
              <p className="text-lg font-bold text-gray-950">{worker.experienceYears || 0}</p>
              <p className="text-xs text-gray-500">Years exp.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <CheckCircle className="h-5 w-5 text-gray-400 mx-auto mb-1.5" />
              <p className="text-lg font-bold text-gray-950">{worker.completedJobs || 0}</p>
              <p className="text-xs text-gray-500">Jobs done</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Star className="h-5 w-5 text-gray-400 mx-auto mb-1.5" />
              <p className="text-lg font-bold text-gray-950">{worker.rehireRatePercent || 0}%</p>
              <p className="text-xs text-gray-500">Rehire rate</p>
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wider mb-3">Availability</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Working Days</span>
                <span className="font-medium text-gray-900 text-right">{formatWorkingDays(worker.workingDays)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Hours</span>
                <span className="font-medium text-gray-900 text-right">{formatWorkingHours(worker.workingHoursStart, worker.workingHoursEnd)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Service Radius</span>
                <span className="font-medium text-gray-900">{worker.maxRadiusKm ? `${worker.maxRadiusKm} km` : '--'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Last Minute</span>
                <span className="font-medium text-gray-900">{worker.acceptsLastMinute ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Weekends</span>
                <span className="font-medium text-gray-900">{worker.acceptsWeekends ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Languages */}
          {worker.languages && worker.languages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wider mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {worker.languages.map((language, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs sm:text-sm font-medium border border-blue-100"
                  >
                    <Globe className="h-3 w-3" />
                    {language}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {worker.totalReviews && worker.totalReviews > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wider mb-3">Reviews</h3>
              {isLoadingReviews ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                        <div className="h-4 bg-gray-200 rounded w-24" />
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.$id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                              {review.clientName?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold text-gray-900">
                            {review.clientName || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= review.rating
                                  ? 'text-amber-400 fill-current'
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                          {review.comment}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2.5 text-xs text-gray-400">
                        <span>{review.jobTitle || 'Service Request'}</span>
                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No reviews yet</p>
              )}
            </div>
          )}
        </div>

        {/* Sticky Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 sm:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 h-12 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => onBookWorker(worker)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Book Now
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl font-medium text-sm border-gray-200 hover:bg-gray-50"
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
