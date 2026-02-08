"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MessageModal } from "@/components/marketplace/message-modal";
import { WorkerProfileModal } from "@/components/marketplace/worker-profile-modal";
import { BookingModal } from "@/components/marketplace/booking-modal";
import { motion, Variants } from "framer-motion";
import { Search, MapPin, Clock, Star, Heart, Filter, MessageCircle, Loader2 } from "lucide-react";
import { databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import type { WorkerProfile, BookingRequest } from "@/lib/types/marketplace";
import { trackBookingInitiated, trackPurchase } from "@/lib/meta-pixel-events";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.645, 0.045, 0.355, 1] }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

function WorkersPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Booking modal state
  const [bookingModal, setBookingModal] = useState({
    isOpen: false,
    selectedWorker: null as WorkerProfile | null
  });
  
  // Message modal state
  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    selectedWorker: null as WorkerProfile | null
  });
  
  // Profile modal state
  const [profileModal, setProfileModal] = useState({
    isOpen: false,
    selectedWorker: null as WorkerProfile | null
  });
  
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Fetch workers from Appwrite
  useEffect(() => {
    async function fetchWorkers() {
      try {
        setLoading(true);
        setError(null);

        // Only fetch approved and active workers for public display
        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WORKERS,
          [
            Query.equal('isVerified', true), // Only show approved workers
            Query.equal('isActive', true), // Only show active workers
            Query.orderDesc('$createdAt'), // Order by creation date instead since ratingAverage might not exist
            Query.limit(500) // Increased to show all workers (currently 178 verified/active)
          ]
        );

        if (response.documents.length === 0) {
        }

        setWorkers(response.documents as unknown as WorkerProfile[]);
      } catch (err) {
        console.error('Error fetching workers:', err);
        setError('Failed to load workers. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchWorkers();
  }, []);

  // Fetch wallet balance for clients
  useEffect(() => {
    async function fetchWalletBalance() {
      if (!user || user.role !== 'client') {
        return;
      }


      try {
        const { WalletService } = await import('@/lib/wallet.service');
        const wallet = await WalletService.getOrCreateWallet(user.$id);
        setWalletBalance(wallet.balance);
      } catch (error) {
        console.error('[Wallet Balance] Error:', error);
      }
    }

    fetchWalletBalance();
  }, [user]);

  // Handle booking submission
  const handleBookingSubmit = async (bookingData: Partial<BookingRequest>) => {
    if (!user || !bookingModal.selectedWorker) {
      toast.error("Please log in to book a service");
      return;
    }

    try {
      const { ID } = await import('appwrite');
      const { WalletService } = await import('@/lib/wallet.service');

      // Use existing booking ID from payment flow or generate new one
      const bookingId = bookingData.id || ID.unique();

      const amount = bookingData.budget?.amount || 0;

      if (amount <= 0) {
        toast.error("Invalid booking amount");
        return;
      }

      // Pre-check wallet balance to give better UX
      if (walletBalance !== null && walletBalance < amount) {
        toast.error(
          `Insufficient balance. You have ₦${walletBalance.toLocaleString()}, need ₦${amount.toLocaleString()}. Please top up your wallet.`,
          {
            action: {
              label: 'Top Up',
              onClick: () => router.push('/client/wallet')
            }
          }
        );
        return;
      }

      // Track booking initiation
      trackBookingInitiated(
        bookingId,
        bookingData.title || `${bookingModal.selectedWorker.displayName} Service`,
        amount
      );

      // STEP 1: Hold funds in escrow (wallet payment)
      const paymentResult = await WalletService.holdFundsForBooking({
        clientId: user.$id,
        bookingId,
        amountInNaira: amount
      });

      if (!paymentResult.success) {
        toast.error(paymentResult.message);
        return;
      }

      // Track successful purchase/payment
      trackPurchase(bookingId, amount, bookingData.title || `${bookingModal.selectedWorker.displayName} Service`);

      // STEP 2: Create booking
      const flattenedBookingRequest = {
        id: bookingId,
        clientId: user.$id,
        workerId: bookingModal.selectedWorker.userId || bookingModal.selectedWorker.$id,
        categoryId: bookingModal.selectedWorker.categories[0],
        title: bookingData.title || '',
        description: bookingData.description || '',
        locationAddress: bookingData.location?.address || '',
        locationLat: bookingData.location?.coordinates?.lat,
        locationLng: bookingData.location?.coordinates?.lng,
        scheduledDate: bookingData.scheduledDate || '',
        estimatedDuration: bookingData.estimatedDuration || 1,
        budgetAmount: amount,
        budgetCurrency: 'NGN',
        budgetIsHourly: bookingData.budget?.isHourly || false,
        urgency: bookingData.urgency || 'medium',
        status: 'confirmed', // Payment confirmed, waiting for worker to accept
        paymentStatus: 'held', // Money held in escrow
        requirements: bookingData.requirements || [],
        attachments: bookingData.attachments || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        flattenedBookingRequest.id,
        flattenedBookingRequest
      );

      // STEP 3: Notify worker (in-app + SMS)
      try {
        const { notificationService } = await import('@/lib/notification-service');

        // In-app notification
        await notificationService.createNotification({
          userId: flattenedBookingRequest.workerId,
          title: 'New Booking Request! 🎉',
          message: `You have a new booking request for "${flattenedBookingRequest.title}". Payment secured in escrow.`,
          type: 'success',
          bookingId: flattenedBookingRequest.id,
          actionUrl: `/worker/bookings?id=${flattenedBookingRequest.id}`,
          idempotencyKey: `new_booking_${flattenedBookingRequest.id}_${flattenedBookingRequest.workerId}`
        });

        // SMS notification (via Termii server-side API)
        try {
          const workerUser = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.USERS,
            flattenedBookingRequest.workerId
          );

          if (workerUser.phone) {
            const message = `ErrandWork: New booking for ${flattenedBookingRequest.title} on ${new Date(
              flattenedBookingRequest.scheduledDate
            ).toLocaleDateString()}. Check your dashboard.`;

            const response = await fetch('/api/sms/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                to: workerUser.phone,
                message
              })
            });

            const smsResult = await response.json();
            console.log('📱 Booking SMS result:', smsResult);
          }
        } catch (smsError) {
          console.error('Failed to send SMS:', smsError);
        }

      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      toast.success("Booking created! Payment held securely.");

      // Refresh wallet balance
      const wallet = await WalletService.getOrCreateWallet(user.$id);
      setWalletBalance(wallet.balance);

      // Close the booking modal
      setBookingModal({ isOpen: false, selectedWorker: null });

    } catch (error) {
      console.error('Error submitting booking:', error);
      toast.error("Failed to submit booking. Please try again.");
      throw error;
    }
  };

  // Handle worker selection for booking
  const handleBookWorker = (worker: WorkerProfile) => {
    if (!isAuthenticated) {
      toast.error("Please log in to book a service");
      router.push('/login?callbackUrl=/workers');
      return;
    }

    if (user?.role !== 'client') {
      toast.error("Only clients can book services");
      return;
    }

    // Check wallet balance before opening booking modal
    const estimatedCost = worker.hourlyRate || 5000; // Use hourly rate or default

   

    // If wallet balance hasn't loaded yet, show loading message
    if (walletBalance === null || walletBalance === undefined) {
      toast.error(
        "Please wait while we load your wallet balance, then try again.",
        {
          duration: 3000
        }
      );
      return; // Don't allow booking until balance loads
    }

    // BLOCK if insufficient balance
    if (walletBalance < estimatedCost) {
      toast.error(
        `Low balance! You have ₦${walletBalance.toLocaleString()}. This worker charges ₦${estimatedCost.toLocaleString()}/hr. Top up your wallet first.`,
        {
          duration: 6000,
          action: {
            label: 'Top Up Now',
            onClick: () => router.push('/client/wallet')
          }
        }
      );
      return; // Don't open modal
    }

    // WARN if balance is low (less than 2x hourly rate)
    if (walletBalance < estimatedCost * 2) {
      toast.warning(
        `Your balance is ₦${walletBalance.toLocaleString()}. Consider topping up for longer bookings.`,
        {
          duration: 4000,
          action: {
            label: 'Top Up',
            onClick: () => router.push('/client/wallet')
          }
        }
      );
    }

    // Open booking modal
    setBookingModal({
      isOpen: true,
      selectedWorker: worker
    });
  };

  // Handle worker messaging
  const handleMessageWorker = (worker: WorkerProfile) => {
    if (!isAuthenticated) {
      toast.error("Please log in to message workers");
      router.push('/login?callbackUrl=/workers');
      return;
    }
    
    if (user?.role !== 'client') {
      toast.error("Only clients can message workers");
      return;
    }
    
    setMessageModal({
      isOpen: true,
      selectedWorker: worker
    });
  };

  // Handle view worker profile (placeholder for now)
  const handleViewProfile = (worker: WorkerProfile) => {
    setProfileModal({
      isOpen: true,
      selectedWorker: worker
    });
  };

  // Close booking modal
  const handleCloseBookingModal = () => {
    setBookingModal({ isOpen: false, selectedWorker: null });
  };

  // Close message modal
  const handleCloseMessageModal = () => {
    setMessageModal({ isOpen: false, selectedWorker: null });
  };

  // Close profile modal
  const handleCloseProfileModal = () => {
    setProfileModal({ isOpen: false, selectedWorker: null });
  };

  // Filter workers based on search and location
  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      const name = (worker.name || worker.displayName || '').toLowerCase();
      const bio = (worker.bio || '').toLowerCase();
      const categories = Array.isArray(worker.categories) ? worker.categories : [];
      const city = (worker.city || '').toLowerCase();
      const state = (worker.state || '').toLowerCase();
      const q = (searchQuery || '').toLowerCase();
      const lq = (locationQuery || '').toLowerCase();

      const matchesSearch = q === '' || 
        name.includes(q) ||
        categories.some(category => (category || '').toLowerCase().includes(q)) ||
        bio.includes(q);

      const matchesLocation = lq === '' ||
        city.includes(lq) ||
        state.includes(lq);

      return matchesSearch && matchesLocation;
    });
  }, [workers, searchQuery, locationQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already reactive through the useMemo above
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6 md:py-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6 md:py-10">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-red-500 mb-4">⚠️</div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">Oops! Something went wrong</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6 md:py-10">
        {/* Wallet Balance for Clients */}
        {user && user.role === 'client' && walletBalance !== null && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-md flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Wallet Balance</p>
              <p className="text-2xl font-bold">₦{(walletBalance ?? 0).toLocaleString()}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/client/wallet')}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Top Up
            </Button>
          </div>
        )}

        {/* Search Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-2xl mx-auto space-y-4"
        >
          <motion.h1 
            variants={fadeIn}
            className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-2"
          >
            Find Trusted Workers
          </motion.h1>
          <motion.p 
            variants={fadeIn}
            className="text-center text-gray-600 mb-6"
          >
            {user?.role === 'client' 
              ? 'Book services instantly with your wallet balance'
              : 'Connect with verified local professionals for all your daily tasks'
            }
          </motion.p>

          <motion.form 
            variants={fadeIn} 
            className="space-y-3"
            onSubmit={handleSearch}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                type="text"
                placeholder="Search for services..."
                className="pl-10 h-12 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                type="text"
                placeholder="Location..."
                className="pl-10 h-12 bg-white"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Search
            </Button>
          </motion.form>
        </motion.div>

        {/* Results Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <p className="text-sm text-gray-600">
                <span className="font-medium">{filteredWorkers.length}</span> Workers Found
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
            {filteredWorkers.map((worker, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="bg-white rounded-xl p-4 shadow-soft hover:shadow-medium transition-shadow duration-300 w-full max-w-none"
              >
                <div className="flex flex-col space-y-3">
                  {/* Header with Avatar and Basic Info */}
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                      {worker.profileImage ? (
                        <img 
                          src={worker.profileImage} 
                          alt={worker.displayName || 'Worker'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center text-white font-medium text-lg">
                          {(worker.displayName || 'W').charAt(0)}
                        </div>
                      )}
                      {worker.isActive && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 truncate">{worker.displayName || 'Worker'}</h3>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{worker.city}, {worker.state}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                            <Star className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />
                            <span className="whitespace-nowrap">{worker.ratingAverage || 'New'}</span>
                            {worker.totalReviews ? <span className="text-gray-500 whitespace-nowrap">({worker.totalReviews})</span> : null}
                          </div>
                          <p className="text-sm font-medium text-emerald-600 whitespace-nowrap">
                            ₦{worker.hourlyRate}/hr
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2">{worker.bio}</p>
                  
                  {/* Categories */}
                  <div className="flex flex-wrap gap-1.5">
                    {worker.categories?.slice(0, 3).map((category, index) => (
                      <Badge key={index} variant="secondary" className="bg-gray-100 text-xs">
                        {category}
                      </Badge>
                    ))}
                    {(worker.categories?.length || 0) > 3 && (
                      <Badge variant="secondary" className="bg-gray-100 text-xs">
                        +{worker.categories!.length - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1 min-w-0">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{worker.responseTimeMinutes ? `Responds in ${worker.responseTimeMinutes}m` : 'Response time N/A'}</span>
                    </div>
                    <div className="flex-shrink-0 ml-2">{worker.completedJobs || 0} jobs</div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-9 text-xs"
                      onClick={() => handleViewProfile(worker)}
                    >
                      <span className="hidden sm:inline">View Profile</span>
                      <span className="sm:hidden">Profile</span>
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => handleMessageWorker(worker)}
                    >
                      <MessageCircle className="h-3 w-3 sm:mr-1 flex-shrink-0" />
                      <span className="hidden sm:inline ml-1">Message</span>
                    </Button>
                    <Button 
                      className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-xs"
                      onClick={() => handleBookWorker(worker)}
                    >
                      <span className="hidden sm:inline">Book Now</span>
                      <span className="sm:hidden">Book</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
      <Footer />

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={handleCloseBookingModal}
        worker={bookingModal.selectedWorker}
        onBookingSubmit={handleBookingSubmit}
      />

      {/* Message Modal */}
      <MessageModal
        isOpen={messageModal.isOpen}
        onClose={handleCloseMessageModal}
        worker={messageModal.selectedWorker}
        recipientId={messageModal.selectedWorker?.userId || messageModal.selectedWorker?.$id}
        recipientName={messageModal.selectedWorker?.name}
        recipientEmail={messageModal.selectedWorker?.email}
      />

      {/* Worker Profile Modal */}
      <WorkerProfileModal
        isOpen={profileModal.isOpen}
        onClose={handleCloseProfileModal}
        worker={profileModal.selectedWorker}
        onBookWorker={handleBookWorker}
        onMessageWorker={handleMessageWorker}
      />
    </div>
  );
}

export default function WorkersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6 md:py-10">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="p-6">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                <p className="mt-2 text-sm text-gray-600">Loading available workers...</p>
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <WorkersPageContent />
    </Suspense>
  );
} 