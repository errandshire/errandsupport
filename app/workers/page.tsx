"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageModal } from "@/components/marketplace/message-modal";
import { WorkerProfileModal } from "@/components/marketplace/worker-profile-modal";
import { BookingModal } from "@/components/marketplace/booking-modal";
import { Search, MapPin, Star, Filter, Loader2, ChevronLeft, ChevronRight, X, Shield } from "lucide-react";
import { databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/appwrite";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import type { BookingRequest } from "@/lib/types/marketplace";
import type { PublicWorkerProfile } from "@/lib/sanitize-worker";
import { trackBookingInitiated, trackPurchase } from "@/lib/meta-pixel-events";
import { workerProfileImageUrl } from "@/lib/avatar-display";

const CATEGORY_OPTIONS = [
  'Cleaning',
  'Plumbing',
  'Electrical',
  'Painting',
  'Carpentry',
  'Moving',
  'Gardening',
  'Laundry',
  'Cooking',
  'Delivery',
  'Tutoring',
  'Driving',
  'Errand Running',
  'Pet Care',
  'Beauty & Grooming',
  'Tech Support',
] as const;

function WorkersPageContent() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [workers, setWorkers] = useState<PublicWorkerProfile[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalWorkers, setTotalWorkers] = useState(0);
  const WORKERS_PER_PAGE = 20;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [bookingModal, setBookingModal] = useState({
    isOpen: false,
    selectedWorker: null as PublicWorkerProfile | null
  });
  
  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    selectedWorker: null as PublicWorkerProfile | null
  });
  
  const [profileModal, setProfileModal] = useState({
    isOpen: false,
    selectedWorker: null as PublicWorkerProfile | null
  });
  
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Debounce search input — waits 300ms after the user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchInput]);

  // Reset to page 1 when category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Fetch workers from server-side API with search & category params
  const hasFetchedOnce = useRef(false);
  useEffect(() => {
    async function fetchWorkers() {
      try {
        if (!hasFetchedOnce.current) {
          setInitialLoading(true);
        }
        setFetching(true);
        setError(null);

        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(WORKERS_PER_PAGE),
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedCategory) params.set('category', selectedCategory);

        const res = await fetch(`/api/workers?${params}`);
        if (!res.ok) throw new Error('Failed to fetch workers');

        const data = await res.json();
        setTotalWorkers(data.total);
        setWorkers(data.workers as PublicWorkerProfile[]);
        hasFetchedOnce.current = true;
      } catch (err) {
        console.error('Error fetching workers:', err);
        setError('Failed to load workers. Please try again later.');
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    }

    fetchWorkers();
  }, [currentPage, debouncedSearch, selectedCategory]);

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
    const selectedWorker = bookingModal.selectedWorker;
    if (!user || !selectedWorker) {
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
        bookingData.title || `${selectedWorker.displayName} Service`,
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
      trackPurchase(bookingId, amount, bookingData.title || `${selectedWorker.displayName} Service`);

      // STEP 2: Create booking
      const flattenedBookingRequest = {
        id: bookingId,
        clientId: user.$id,
        workerId: selectedWorker.userId || selectedWorker.$id,
        categoryId: selectedWorker.categories[0],
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
  const handleBookWorker = (worker: PublicWorkerProfile) => {
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
  const handleMessageWorker = (worker: PublicWorkerProfile) => {
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
  const handleViewProfile = (worker: PublicWorkerProfile) => {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const totalPages = Math.ceil(totalWorkers / WORKERS_PER_PAGE);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <p className="text-4xl mb-4">!</p>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-6 max-w-md">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-gray-900 hover:bg-gray-800 text-white">
              Try Again
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Wallet Balance */}
        {user && user.role === 'client' && walletBalance !== null && (
          <div className="mb-8 p-5 sm:p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Wallet Balance</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                ₦{(walletBalance ?? 0).toLocaleString()}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => router.push('/client/wallet')}
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold h-11 px-5"
            >
              Top Up
            </Button>
          </div>
        )}

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-950 text-center mb-3">
            Find Trusted Workers
          </h1>
          <p className="text-center text-gray-500 mb-8 text-base sm:text-lg">
            {user?.role === 'client'
              ? 'Book services instantly with your wallet balance'
              : 'Connect with verified local professionals for all your daily tasks'
            }
          </p>

          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, skill, category, or location..."
                className="pl-12 pr-10 h-14 sm:h-12 bg-gray-50 border-gray-200 rounded-xl text-base focus:bg-white focus:border-gray-300 transition-colors"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="h-10 rounded-lg font-medium"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {selectedCategory && (
                <span className="ml-1.5 bg-white/20 text-xs rounded-full px-1.5 py-0.5">1</span>
              )}
            </Button>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{totalWorkers}</span> workers
              {totalPages > 1 && (
                <span className="hidden sm:inline text-gray-400 ml-1">
                  &middot; page {currentPage} of {totalPages}
                </span>
              )}
            </p>
          </div>
          {(debouncedSearch || selectedCategory) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-gray-500 hover:text-gray-900"
              onClick={() => { setSearchInput(""); setSelectedCategory(""); }}
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Category Filters */}
        {showFilters && (
          <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-sm font-semibold text-gray-900 mb-3">Category</p>
            <div className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto pb-1 -mb-1">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-200 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Workers Grid */}
        <div className="relative min-h-[200px]">
          {fetching && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-start justify-center pt-24 rounded-2xl">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {workers.length === 0 && !fetching ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No workers found</h3>
              <p className="text-gray-500 mb-5 max-w-sm">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => { setSearchInput(""); setSelectedCategory(""); }}
                className="rounded-lg"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {workers.map((worker) => (
                <div
                  key={worker.$id}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 flex flex-col gap-4 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-16 w-16 ring-2 ring-gray-100">
                        <AvatarImage
                          src={workerProfileImageUrl(worker)}
                          alt={worker.displayName || 'Worker'}
                        />
                        <AvatarFallback className="bg-emerald-500 text-white text-lg font-semibold">
                          {(worker.displayName || 'W').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {worker.isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-emerald-500 rounded-full border-[2.5px] border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-950 truncate text-base leading-tight">
                            {worker.displayName || 'Worker'}
                          </h3>
                          {(worker.city || worker.state) && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {[worker.city, worker.state].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-gray-950 leading-tight">
                            ₦{worker.hourlyRate?.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400 font-medium">per hour</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rating + Verified */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-xs font-semibold">
                        {worker.ratingAverage || 'New'}
                      </span>
                      {worker.totalReviews ? (
                        <span className="text-xs text-amber-500">({worker.totalReviews})</span>
                      ) : null}
                    </div>
                    {worker.isVerified && (
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                        <Shield className="h-3 w-3" />
                        <span className="text-xs font-semibold">Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{worker.bio}</p>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1.5">
                    {worker.categories?.slice(0, 3).map((category, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium border border-gray-100"
                      >
                        {category}
                      </span>
                    ))}
                    {(worker.categories?.length || 0) > 3 && (
                      <span className="px-2.5 py-1 rounded-md bg-gray-50 text-gray-400 text-xs font-medium border border-gray-100">
                        +{worker.categories!.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">Experience</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {worker.experienceYears ? `${worker.experienceYears}yr` : '--'}
                      </p>
                    </div>
                    <div className="text-center border-l border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">Jobs</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {worker.completedJobs || 0}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-auto pt-1">
                    <Button
                      variant="outline"
                      className="flex-1 h-11 rounded-xl font-medium text-sm border-gray-200 hover:bg-gray-50"
                      onClick={() => handleViewProfile(worker)}
                    >
                      View Profile
                    </Button>
                    <Button
                      className="flex-1 h-11 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => handleBookWorker(worker)}
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-10 pb-4">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              className="h-10 px-3 rounded-lg text-gray-600 hover:text-gray-900"
              onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <Button
                  key={page}
                  variant="ghost"
                  size="sm"
                  className={`w-10 h-10 rounded-lg font-medium ${
                    currentPage === page
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              className="h-10 px-3 rounded-lg text-gray-600 hover:text-gray-900"
              onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </main>
      <Footer />

      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={handleCloseBookingModal}
        worker={bookingModal.selectedWorker}
        onBookingSubmit={handleBookingSubmit}
      />

      <MessageModal
        isOpen={messageModal.isOpen}
        onClose={handleCloseMessageModal}
        worker={messageModal.selectedWorker}
        recipientId={messageModal.selectedWorker?.userId || messageModal.selectedWorker?.$id}
        recipientName={messageModal.selectedWorker?.name}
      />

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
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </main>
        <Footer />
      </div>
    }>
      <WorkersPageContent />
    </Suspense>
  );
} 