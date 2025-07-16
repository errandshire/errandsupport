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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Worker Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
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
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{worker.displayName}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{worker.city}, {worker.state}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 mb-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="text-lg font-semibold text-gray-900">{worker.ratingAverage}</span>
                    <span className="text-gray-500">({worker.totalReviews} reviews)</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-600">
                    ₦{worker.hourlyRate.toLocaleString()}/hr
                  </p>
                </div>
              </div>
              
              {/* Verification Badges */}
              <div className="flex items-center space-x-2 mt-3">
                {worker.isVerified && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {worker.idVerified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    ID Verified
                  </Badge>
                )}
                {worker.backgroundCheckVerified && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Background Check
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* About Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
            <p className="text-gray-600 leading-relaxed">{worker.bio}</p>
          </div>

          {/* Skills & Categories */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills & Services</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {worker.categories.map((category, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-50">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Experience & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Experience</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Years of Experience</span>
                  <span className="font-medium">{worker.experienceYears} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed Jobs</span>
                  <span className="font-medium">{worker.completedJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-medium">{formatResponseTime(worker.responseTimeMinutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rehire Rate</span>
                  <span className="font-medium">{worker.rehireRatePercent}%</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Availability</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Working Days</span>
                  <span className="font-medium">{formatWorkingDays(worker.workingDays)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Working Hours</span>
                  <span className="font-medium">{formatWorkingHours(worker.workingHoursStart, worker.workingHoursEnd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Radius</span>
                  <span className="font-medium">{worker.maxRadiusKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Minute Jobs</span>
                  <span className="font-medium">{worker.acceptsLastMinute ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weekend Work</span>
                  <span className="font-medium">{worker.acceptsWeekends ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Languages */}
          {worker && worker.languages && worker.languages?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {worker.languages.map((language, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onMessageWorker(worker)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              onClick={() => onBookWorker(worker)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Book Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 