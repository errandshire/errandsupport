"use client";

import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookingModal } from "@/components/marketplace/booking-modal";
import { MessageModal } from "@/components/marketplace/message-modal";
import { WorkerProfileModal } from "@/components/marketplace/worker-profile-modal";
import { motion, Variants } from "framer-motion";
import { Search, MapPin, Clock, Star, Heart, Filter, MessageCircle } from "lucide-react";
import { databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import type { WorkerProfile, BookingRequest } from "@/lib/types/marketplace";

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

export default function WorkersPage() {
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

  // Fetch workers from Appwrite
  useEffect(() => {
    async function fetchWorkers() {
      try {
        setLoading(true);
        setError(null);

        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WORKERS,
          [
            Query.equal('isActive', true),
            Query.orderDesc('ratingAverage'), // Updated to use flat structure
            Query.limit(100)
          ]
        );

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

  // Handle booking submission
  const handleBookingSubmit = async (bookingData: Partial<BookingRequest>) => {
    if (!user || !bookingModal.selectedWorker) {
      toast.error("Please log in to book a service");
      return;
    }

    try {
      const { ID } = await import('appwrite');
      
      // Use existing booking ID from payment flow or generate new one
      const bookingId = bookingData.id || ID.unique();
      
      // Flatten the booking data for Appwrite storage
      const flattenedBookingRequest = {
        id: bookingId,
        clientId: user.$id,
        workerId: bookingModal.selectedWorker.id,
        categoryId: bookingModal.selectedWorker.categories[0],
        title: bookingData.title || '',
        description: bookingData.description || '',
        // Flatten location
        locationAddress: bookingData.location?.address || '',
        locationLat: bookingData.location?.coordinates?.lat,
        locationLng: bookingData.location?.coordinates?.lng,
        scheduledDate: bookingData.scheduledDate || '',
        estimatedDuration: bookingData.estimatedDuration || 1,
        // Flatten budget
        budgetAmount: bookingData.budget?.amount || 0,
        budgetCurrency: bookingData.budget?.currency || 'NGN',
        budgetIsHourly: bookingData.budget?.isHourly || false,
        urgency: bookingData.urgency || 'medium',
        status: 'pending',
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

      // Don't redirect or show success message here since payment flow will handle it
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast.error("Failed to submit booking request. Please try again.");
      throw error; // Rethrow so payment flow knows it failed
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

    setBookingModal({
      isOpen: true,
      selectedWorker: worker
    });
  };

  // Handle worker messaging (placeholder for now)
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
      const matchesSearch = searchQuery === "" || 
        worker.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.skills.some(skill => 
          skill.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        worker.categories.some(category =>
          category.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        worker.bio.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLocation = locationQuery === "" ||
        worker.city.toLowerCase().includes(locationQuery.toLowerCase()) || // Updated to use flat structure
        worker.state.toLowerCase().includes(locationQuery.toLowerCase()); // Updated to use flat structure

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
            Connect with verified local professionals for all your daily tasks
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkers.map((worker, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="bg-white rounded-xl p-4 shadow-soft hover:shadow-medium transition-shadow duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden bg-gray-200">
                    {worker.profileImage ? (
                      <img 
                        src={worker.profileImage} 
                        alt={worker.displayName || 'Worker'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-medium text-lg">
                        {(worker.displayName || 'W').charAt(0)}
                      </div>
                    )}
                    {worker.isActive && (
                      <div className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{worker.displayName || 'Worker'}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {worker.city}, {worker.state} {/* Updated to use flat structure */}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          {worker.ratingAverage} {/* Updated to use flat structure */}
                          <span className="text-gray-500">({worker.totalReviews})</span> {/* Updated to use flat structure */}
                        </div>
                        <p className="text-sm font-medium text-emerald-600">
                          ₦{worker.hourlyRate}/hr {/* Updated to use flat structure */}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{worker.bio}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {worker.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="bg-gray-100">
                          {skill}
                        </Badge>
                      ))}
                      {worker.skills.length > 3 && (
                        <Badge variant="secondary" className="bg-gray-100">
                          +{worker.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Responds in {worker.responseTimeMinutes}m {/* Updated to use flat structure */}
                      </div>
                      <div>{worker.completedJobs} jobs</div> {/* Updated to use flat structure */}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button 
                        variant="outline" 
                        className="h-10 text-xs"
                        onClick={() => handleViewProfile(worker)}
                      >
                        View Profile
                      </Button>
                      <Button 
                        variant="outline"
                        className="h-10 text-xs"
                        onClick={() => handleMessageWorker(worker)}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                      <Button 
                        className="h-10 bg-emerald-500 hover:bg-emerald-600 text-xs"
                        onClick={() => handleBookWorker(worker)}
                      >
                        Book Now
                      </Button>
                    </div>
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