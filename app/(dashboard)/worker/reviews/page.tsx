"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Star, 
  TrendingUp, 
  MessageSquare,
  Calendar,
  User,
  Filter,
  Search,
  MoreHorizontal,
  ThumbsUp,
  Flag,
  Reply
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ReviewService, type ReviewWithDetails, type WorkerReviewStats } from "@/lib/review-service";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { toast } from "sonner";

// Using ReviewWithDetails from review service


export default function WorkerReviewsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [reviews, setReviews] = React.useState<ReviewWithDetails[]>([]);
  const [reviewStats, setReviewStats] = React.useState<WorkerReviewStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [ratingFilter, setRatingFilter] = React.useState("all");
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");

  // Fetch reviews data
  const fetchReviews = React.useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get worker ID from user
      const workerResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', user.$id), Query.limit(1)]
      );

      if (workerResponse.documents.length === 0) {
        setReviews([]);
        setReviewStats(null);
        return;
      }

      const workerId = workerResponse.documents[0].$id;

      // Fetch reviews and stats in parallel
      const [reviewsData, statsData] = await Promise.all([
        ReviewService.getWorkerReviews(workerId),
        ReviewService.getWorkerReviewStats(workerId)
      ]);

      setReviews(reviewsData);
      setReviewStats(statsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
      setReviews([]);
      setReviewStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/reviews");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }

    // Fetch reviews when user is authenticated
    fetchReviews();
  }, [loading, isAuthenticated, user, router, fetchReviews]);

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = (review.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (review.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (review.comment || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = ratingFilter === "all" || review.rating.toString() === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const averageRating = reviewStats?.averageRating || 0;
  const totalReviews = reviewStats?.totalReviews || 0;
  const ratingDistribution = reviewStats?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  // Handle review response
  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;

    try {
      await ReviewService.addReviewResponse(reviewId, replyText);
      toast.success('Response added successfully');
      setReplyText('');
      setReplyingTo(null);
      // Refresh reviews to show the new response
      fetchReviews();
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error('Failed to add response');
    }
  };

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5"
    };
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-neutral-300"
            )}
          />
        ))}
      </div>
    );
  };

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    
    // Here you would normally send the reply to your backend
    console.log(`Reply to review ${reviewId}:`, replyText);
    
    setReplyingTo(null);
    setReplyText("");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
       

      <div className="flex-1 flex flex-col lg:ml-0">
         
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  Reviews & Ratings
                </h1>
                <p className="text-neutral-600">
                  Manage feedback from your clients
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Overall Rating */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-neutral-900 mb-2">
                      {averageRating.toFixed(1)}
                    </div>
                    <div className="flex justify-center mb-2">
                      {renderStars(Math.round(averageRating), "lg")}
                    </div>
                    <p className="text-sm text-neutral-600">
                      Based on {totalReviews} reviews
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Rating Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rating Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <span className="text-sm font-medium w-4">{rating}</span>
                        <Star className="h-3 w-3 text-yellow-400" />
                        <Progress 
                          value={(ratingDistribution[rating as keyof typeof ratingDistribution] / totalReviews) * 100} 
                          className="flex-1 h-2" 
                        />
                        <span className="text-sm text-neutral-600 w-8">
                          {ratingDistribution[rating as keyof typeof ratingDistribution]}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Response Rate</span>
                      <Badge variant="outline" className="text-green-600">
                        85%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Avg Response Time</span>
                      <Badge variant="outline">
                        2 hours
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Helpful Votes</span>
                      <Badge variant="outline">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        38
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">All Reviews</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="need-response">Need Response</TabsTrigger>
                </TabsList>
                
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="Search reviews..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="1">1 Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="all">
                <div className="space-y-4">
                  {isLoading ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-900 mb-2">
                          Loading reviews...
                        </h3>
                        <p className="text-neutral-600">
                          Please wait while we fetch your reviews
                        </p>
                      </CardContent>
                    </Card>
                  ) : filteredReviews.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-900 mb-2">
                          No reviews yet
                        </h3>
                        <p className="text-neutral-600">
                          {searchQuery || ratingFilter !== "all"
                            ? "No reviews match your search criteria"
                            : "You haven't received any reviews yet. Complete jobs to start receiving feedback from clients."}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredReviews.map((review) => (
                    <Card key={review.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={review.clientAvatar} />
                              <AvatarFallback>{review.clientName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-neutral-900">{review.clientName}</h3>
                                {review.verified && (
                                  <Badge variant="outline" className="text-green-600">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-neutral-600">{review.jobTitle}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                {renderStars(review.rating, "sm")}
                                <span className="text-sm text-neutral-500">
                                  {new Date(review.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <p className="text-neutral-700 mb-4">{review.comment}</p>
                        
                        {review.response && (
                          <div className="bg-neutral-50 p-3 rounded-lg mb-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">Your Response</Badge>
                            </div>
                            <p className="text-sm text-neutral-700">{review.response}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Helpful ({review.helpful})
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Flag className="h-4 w-4 mr-1" />
                              Report
                            </Button>
                          </div>
                          
                          {!review.response && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setReplyingTo(review.id)}
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Reply
                            </Button>
                          )}
                        </div>
                        
                        {replyingTo === review.id && (
                          <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                            <Textarea
                              placeholder="Write your response..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="mb-3"
                              rows={3}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleReplySubmit(review.id)}
                                disabled={!replyText.trim()}
                              >
                                Send Reply
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="recent">
                <div className="space-y-4">
                  {filteredReviews.slice(0, 5).map((review) => (
                    <Card key={review.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={review.clientAvatar} />
                              <AvatarFallback>{review.clientName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-neutral-900">{review.clientName}</h3>
                                {review.verified && (
                                  <Badge variant="outline" className="text-green-600">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-neutral-600">{review.jobTitle}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                {renderStars(review.rating, "sm")}
                                <span className="text-sm text-neutral-500">
                                  {new Date(review.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-neutral-700 mb-4">{review.comment}</p>
                        
                        {review.response && (
                          <div className="bg-neutral-50 p-3 rounded-lg mb-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">Your Response</Badge>
                            </div>
                            <p className="text-sm text-neutral-700">{review.response}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Helpful ({review.helpful})
                            </Button>
                          </div>
                          
                          {!review.response && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setReplyingTo(review.id)}
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Reply
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="need-response">
                <div className="space-y-4">
                  {filteredReviews.filter(review => !review.response).map((review) => (
                    <Card key={review.id} className="hover:shadow-md transition-shadow border-yellow-200">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={review.clientAvatar} />
                              <AvatarFallback>{review.clientName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-neutral-900">{review.clientName}</h3>
                                <Badge variant="outline" className="text-yellow-600">
                                  Needs Response
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral-600">{review.jobTitle}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                {renderStars(review.rating, "sm")}
                                <span className="text-sm text-neutral-500">
                                  {new Date(review.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-neutral-700 mb-4">{review.comment}</p>
                        
                        <div className="flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setReplyingTo(review.id)}
                          >
                            <Reply className="h-4 w-4 mr-1" />
                            Reply
                          </Button>
                        </div>
                        
                        {replyingTo === review.id && (
                          <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                            <Textarea
                              placeholder="Write your response..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="mb-3"
                              rows={3}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleReplySubmit(review.id)}
                                disabled={!replyText.trim()}
                              >
                                Send Reply
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
      </div>
    </div>
  );
} 