"use client";

import * as React from "react";
import { Star, MapPin, Clock, Shield, Heart, MessageCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkerProfile, SearchFilters } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

interface WorkerCardProps {
  worker: WorkerProfile;
  onViewProfile: (worker: WorkerProfile) => void;
  onBookNow: (worker: WorkerProfile) => void;
  onMessage: (worker: WorkerProfile) => void;
}

interface WorkerGridProps {
  workers: WorkerProfile[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onWorkerSelect: (worker: WorkerProfile) => void;
  onBookWorker: (worker: WorkerProfile) => void;
  onMessageWorker: (worker: WorkerProfile) => void;
  className?: string;
}

function WorkerCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      
      <Skeleton className="h-16 w-full" />
      
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
      
      <Skeleton className="h-3 w-full" />
      
      <div className="flex space-x-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </div>
  );
}

function WorkerCard({ worker, onViewProfile, onBookNow, onMessage }: WorkerCardProps) {
  const [isFavorited, setIsFavorited] = React.useState(false);

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h`;
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-200 transition-all duration-200 relative">
      {/* Favorite Button */}
      <button
        onClick={() => setIsFavorited(!isFavorited)}
        className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Heart 
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorited ? "text-red-500 fill-current" : "text-gray-400"
          )} 
        />
      </button>

      {/* Worker Header */}
      <div className="flex items-start justify-between mb-4 pr-8">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={worker.profileImage} alt={worker.displayName} />
              <AvatarFallback>
                {worker.displayName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            {worker.verification.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                <Shield className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                {worker.displayName}
              </h3>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <MapPin className="h-3 w-3" />
              <span>{worker.location.city}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="font-medium text-gray-900">{worker.rating.average}</span>
            <span className="text-sm text-gray-600">({worker.rating.totalReviews})</span>
          </div>
          <p className="text-lg font-bold text-green-600 mt-1">
            {formatPrice(worker.pricing.hourlyRate, worker.pricing.currency)}/hr
          </p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-gray-700 mb-4 line-clamp-3">
        {worker.bio}
      </p>

      {/* Skills */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {worker.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {worker.skills.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{worker.skills.length - 3} more
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>Responds in {formatResponseTime(worker.stats.responseTime)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4" />
          <span>{worker.stats.completedJobs} jobs</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => onViewProfile(worker)}
        >
          View Profile
        </Button>
        <Button 
          className="flex-1"
          onClick={() => onBookNow(worker)}
        >
          Book Now
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMessage(worker)}
          className="text-gray-500 hover:text-green-600"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Availability Indicator */}
      {worker.isActive && (
        <div className="absolute top-2 left-2">
          <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span>Available</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <MapPin className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No workers found</h3>
      <p className="text-gray-600 mb-4 max-w-md">
        We couldn't find any workers matching your criteria. Try adjusting your filters or search in a different area.
      </p>
      <Button variant="outline">
        Clear Filters
      </Button>
    </div>
  );
}

export function WorkerGrid({ 
  workers, 
  isLoading = false, 
  hasNextPage = false, 
  onLoadMore, 
  onWorkerSelect, 
  onBookWorker, 
  onMessageWorker,
  className 
}: WorkerGridProps) {
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Infinite scroll implementation
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoading && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasNextPage, isLoading, onLoadMore]);

  if (!isLoading && workers.length === 0) {
    return (
      <div className={cn("grid grid-cols-1", className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            onViewProfile={onWorkerSelect}
            onBookNow={onBookWorker}
            onMessage={onMessageWorker}
          />
        ))}
        
        {/* Skeleton loaders while loading */}
        {isLoading && (
          <>
            {[...Array(6)].map((_, i) => (
              <WorkerCardSkeleton key={`skeleton-${i}`} />
            ))}
          </>
        )}
      </div>

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Load More Button (fallback for infinite scroll) */}
      {hasNextPage && !isLoading && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            className="min-w-32"
          >
            Load More Workers
          </Button>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && workers.length > 0 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading more workers...</span>
          </div>
        </div>
      )}
    </div>
  );
} 