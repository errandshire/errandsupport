"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Briefcase,
  Calendar,
  CheckCircle2,
  MapPin,
  Clock,
  User,
  Award,
  X
} from "lucide-react";
import { databases, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { toast } from "sonner";

interface Worker {
  $id: string;
  userId: string;
  displayName?: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
  bio?: string;
  ratingAverage: number;
  totalReviews: number;
  experienceYears?: number;
  completedJobs: number;
  skills: string[];
  categories: string[];
  isVerified: boolean;
  isActive: boolean;
}

interface Review {
  $id: string;
  rating: number;
  comment: string;
  createdAt: string;
  clientName: string;
  jobTitle: string;
}

interface PastJob {
  $id: string;
  title: string;
  category: string;
  completedAt: string;
  location: string;
  amount: number;
}

interface WorkerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  onSelectWorker?: () => void;
}

export function WorkerProfileModal({
  isOpen,
  onClose,
  worker,
  onSelectWorker
}: WorkerProfileModalProps) {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [pastJobs, setPastJobs] = React.useState<PastJob[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && worker) {
      fetchWorkerDetails();
    }
  }, [isOpen, worker?.$id]);

  const fetchWorkerDetails = async () => {
    if (!worker) return;

    setIsLoading(true);
    try {
      // Fetch reviews
      const reviewsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.REVIEWS,
        [
          Query.equal('workerId', worker.userId),
          Query.equal('isPublic', true),
          Query.orderDesc('createdAt'),
          Query.limit(10)
        ]
      );

      // Enrich reviews with client and job info
      const enrichedReviews = await Promise.all(
        reviewsResponse.documents.map(async (review: any) => {
          try {
            const [client, booking] = await Promise.all([
              databases.getDocument(DATABASE_ID, COLLECTIONS.USERS, review.clientId),
              databases.getDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, review.bookingId)
            ]);

            return {
              $id: review.$id,
              rating: review.rating,
              comment: review.comment || '',
              createdAt: review.createdAt,
              clientName: client.name || 'Client',
              jobTitle: booking.title || 'Service'
            };
          } catch (error) {
            console.error('Error enriching review:', error);
            return {
              $id: review.$id,
              rating: review.rating,
              comment: review.comment || '',
              createdAt: review.createdAt,
              clientName: 'Client',
              jobTitle: 'Service'
            };
          }
        })
      );

      setReviews(enrichedReviews);

      // Fetch past completed jobs
      const bookingsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('workerId', worker.userId),
          Query.equal('status', 'completed'),
          Query.orderDesc('completedAt'),
          Query.limit(10)
        ]
      );

      // Map past jobs
      const jobs = bookingsResponse.documents.map((booking: any) => ({
        $id: booking.$id,
        title: booking.title || 'Service',
        category: booking.categoryName || 'General',
        completedAt: booking.completedAt || booking.$createdAt,
        location: booking.locationAddress || 'Location not specified',
        amount: booking.totalAmount || booking.budgetAmount || 0
      }));

      setPastJobs(jobs);

    } catch (error) {
      console.error('Error fetching worker details:', error);
      toast.error('Failed to load worker details');
    } finally {
      setIsLoading(false);
    }
  };

  if (!worker) return null;

  const workerName = worker.displayName || worker.name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Worker Profile</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Worker Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={worker.profileImage} alt={workerName} />
              <AvatarFallback className="text-2xl">
                {workerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold">{workerName}</h3>
                {worker.isVerified && (
                  <CheckCircle2 className="h-6 w-6 text-blue-500" title="Verified Worker" />
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 mt-2">
                {worker.ratingAverage > 0 ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-lg">
                        {worker.ratingAverage.toFixed(1)}
                      </span>
                    </div>
                    {worker.totalReviews > 0 && (
                      <span className="text-gray-600">
                        ({worker.totalReviews} {worker.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-yellow-600">
                      <Star className="h-3 w-3 mr-1" />
                      New Worker
                    </Badge>
                    <span className="text-sm text-gray-500">No reviews yet</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Briefcase className="h-4 w-4" />
                  <span>{pastJobs.length > 0 ? pastJobs.length : worker.completedJobs} jobs completed</span>
                </div>
                {worker.experienceYears && worker.experienceYears > 0 && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{worker.experienceYears} years experience</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {worker.bio && worker.bio.trim() !== '' && (
            <div>
              <h4 className="font-semibold mb-2">About</h4>
              <p className="text-gray-700 whitespace-pre-wrap break-words">{worker.bio.trim()}</p>
            </div>
          )}

          {/* Skills */}
          {worker.skills && worker.skills.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {worker.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Past Jobs */}
          <div>
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Past Jobs ({pastJobs.length})
            </h4>

            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : pastJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No completed jobs yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {pastJobs.map((job) => (
                  <Card key={job.$id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h5 className="font-medium">{job.title}</h5>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {job.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(job.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            ₦{job.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Reviews */}
          <div>
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Star className="h-5 w-5" />
              Reviews ({reviews.length})
            </h4>

            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {reviews.map((review) => (
                  <Card key={review.$id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{review.clientName}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{review.jobTitle}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{review.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 text-sm mt-2">"{review.comment}"</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          {onSelectWorker && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={onSelectWorker}>
                  Select This Worker
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
