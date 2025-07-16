import { create } from 'zustand';
import type { WorkerProfile } from '@/lib/types/marketplace';

interface Booking {
  $id: string;
  id: string;
  clientId: string;
  workerId: string | null;
  title: string;
  description: string;
  locationAddress: string;
  scheduledDate: string;
  estimatedDuration: number;
  budgetAmount: number;
  budgetCurrency: string;
  status: string | null;
  paymentStatus: string | null;
  paymentAmount: number | null;
  urgency: string;
}

interface ProcessedBooking {
  id: string;
  service: string;
  client: string;
  date: string;
  location: string;
  price: string;
  duration: string;
  status: string;
  urgency: string;
  canAccept: boolean;
}

interface WorkerState {
  // Data
  workerProfile: WorkerProfile | null;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Bookings
  availableBookings: ProcessedBooking[];
  acceptedBookings: ProcessedBooking[];
  
  // Stats and extras
  stats: any[] | null;
  workerExtras: {
    profileViews?: number;
    activeChats?: number;
    completionRate?: number;
  };

  // Actions
  setWorkerProfile: (profile: WorkerProfile | null) => void;
  setIsAvailable: (status: boolean) => void;
  setIsLoading: (status: boolean) => void;
  setError: (error: string | null) => void;
  setStats: (stats: any[] | null) => void;
  setAvailableBookings: (bookings: ProcessedBooking[]) => void;
  setAcceptedBookings: (bookings: ProcessedBooking[]) => void;
  setWorkerExtras: (extras: any) => void;
  
  // Fetch functions
  fetchWorkerData: (userId: string) => Promise<void>;
  updateAvailability: (newStatus: boolean) => Promise<void>;
  acceptBooking: (bookingId: string) => Promise<void>;
  reset: () => void;
}

export const useWorkerStore = create<WorkerState>((set, get) => ({
  // Initial state
  workerProfile: null,
  isAvailable: false,
  isLoading: false,
  error: null,
  stats: null,
  availableBookings: [],
  acceptedBookings: [],
  workerExtras: {},

  // Basic setters
  setWorkerProfile: (profile) => set({ workerProfile: profile }),
  setIsAvailable: (status) => set({ isAvailable: status }),
  setIsLoading: (status) => set({ isLoading: status }),
  setError: (error) => set({ error }),
  setStats: (stats) => set({ stats }),
  setAvailableBookings: (bookings) => set({ availableBookings: bookings }),
  setAcceptedBookings: (bookings) => set({ acceptedBookings: bookings }),
  setWorkerExtras: (extras) => set({ workerExtras: extras }),

  // Reset store
  reset: () => set({
    workerProfile: null,
    isAvailable: false,
    isLoading: false,
    error: null,
    stats: null,
    availableBookings: [],
    acceptedBookings: [],
    workerExtras: {},
  }),

  // Fetch worker data
  fetchWorkerData: async (userId: string) => {
    const state = get();
    if (state.isLoading) return;

    try {
      set({ isLoading: true, error: null });
      
      const { databases, COLLECTIONS } = await import('@/lib/appwrite');
      const { Query } = await import('appwrite');
      
      // Fetch worker profile
      const workersResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', userId)]
      );
      
      if (workersResponse.documents.length > 0) {
        const profile = workersResponse.documents[0] as unknown as WorkerProfile;
        set({ workerProfile: profile, isAvailable: profile.isActive });
        
        // Set mock data for demo (replace with real data later)
        set({
          workerExtras: {
            profileViews: 156,
            activeChats: 3,
            completionRate: 94
          }
        });

        // Get current date for filtering
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        try {
          // Fetch available bookings (no worker assigned)
          const availableBookingsResponse = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.BOOKINGS,
            [
              Query.isNull('workerId'), // Fix: Use isNull instead of equal(null)
              Query.greaterThan('scheduledDate', startOfToday.toISOString()),
              Query.orderAsc('scheduledDate'),
              Query.limit(10)
            ]
          );

          // Fetch accepted bookings (assigned to this worker)
          const acceptedBookingsResponse = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.BOOKINGS,
            [
              Query.equal('workerId', profile.$id),
              Query.orderAsc('scheduledDate'),
              Query.limit(10)
            ]
          );

          // Combine all bookings to fetch client profiles in bulk
          const allBookings = [...availableBookingsResponse.documents, ...acceptedBookingsResponse.documents];
          const clientIds = [...new Set(allBookings.map(booking => booking.clientId))].filter(Boolean);
          const clientMap: Record<string, any> = {};
          
          if (clientIds.length > 0) {
            try {
              const clientsResponse = await databases.listDocuments(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                COLLECTIONS.USERS,
                [Query.equal('$id', clientIds)]
              );

              clientsResponse.documents.forEach(client => {
                clientMap[client.$id] = client;
              });
            } catch (error) {
              console.error('Error fetching client profiles:', error);
            }
          }

          // Process available bookings
          const processedAvailableBookings = availableBookingsResponse.documents
            .filter((doc: any) => doc.scheduledDate && doc.budgetAmount)
            .map((doc: any) => ({
              id: doc.$id,
              service: doc.title,
              client: clientMap[doc.clientId]?.name || 'Client',
              date: new Date(doc.scheduledDate).toLocaleString(),
              location: doc.locationAddress,
              price: `₦${doc.budgetAmount.toFixed(2)}`,
              duration: `${doc.estimatedDuration} hours`,
              status: doc.status || 'pending',
              urgency: doc.urgency,
              canAccept: true
            }));

          // Process accepted bookings
          const processedAcceptedBookings = acceptedBookingsResponse.documents
            .filter((doc: any) => doc.scheduledDate && doc.budgetAmount)
            .map((doc: any) => ({
              id: doc.$id,
              service: doc.title,
              client: clientMap[doc.clientId]?.name || 'Client',
              date: new Date(doc.scheduledDate).toLocaleString(),
              location: doc.locationAddress,
              price: `₦${doc.budgetAmount.toFixed(2)}`,
              duration: `${doc.estimatedDuration} hours`,
              status: doc.status || 'accepted',
              urgency: doc.urgency,
              canAccept: false
            }));

          set({
            availableBookings: processedAvailableBookings,
            acceptedBookings: processedAcceptedBookings
          });

          // Calculate stats
          const totalEarnings = processedAcceptedBookings.reduce((sum, booking) => {
            return sum + (parseFloat(booking.price.replace('₦', '')) || 0);
          }, 0);

          const completedBookings = processedAcceptedBookings.filter(b => b.status === 'completed');
          const completionRate = completedBookings.length > 0 
            ? (completedBookings.length / processedAcceptedBookings.length * 100).toFixed(0)
            : 0;

          set({
            stats: [
              {
                label: "This Month's Earnings",
                value: `₦${totalEarnings.toFixed(2)}`,
                change: `From ${processedAcceptedBookings.length} jobs`,
                icon: 'DollarSign',
                color: "text-green-600",
                bgColor: "bg-green-100",
              },
              {
                label: "Available Jobs",
                value: processedAvailableBookings.length.toString(),
                change: "Ready to accept",
                icon: 'CheckCircle',
                color: "text-blue-600",
                bgColor: "bg-blue-100",
              },
              {
                label: "Average Rating",
                value: profile.ratingAverage?.toFixed(1) || "N/A",
                change: `Based on ${profile.totalReviews || 0} reviews`,
                icon: 'Star',
                color: "text-yellow-600",
                bgColor: "bg-yellow-100",
              },
              {
                label: "Completion Rate",
                value: `${completionRate}%`,
                change: `${completedBookings.length} completed jobs`,
                icon: 'Clock',
                color: "text-primary-600",
                bgColor: "bg-primary-100",
              },
            ],
            workerExtras: {
              ...get().workerExtras,
              completionRate: Number(completionRate)
            }
          });
        } catch (error) {
          console.error('Error fetching bookings:', error);
          set({ error: 'Failed to load bookings' });
        }
      } else {
        set({ error: 'Worker profile not found' });
      }
    } catch (error) {
      console.error('Error fetching worker data:', error);
      set({ error: 'Failed to load worker data' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Update availability
  updateAvailability: async (newStatus: boolean) => {
    const state = get();
    if (!state.workerProfile) return;

    try {
      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
      
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        state.workerProfile.$id,
        {
          isActive: newStatus,
          updatedAt: new Date().toISOString()
        }
      );
      
      set({ isAvailable: newStatus });
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  },

  // Accept booking
  acceptBooking: async (bookingId: string) => {
    const state = get();
    if (!state.workerProfile) return;

    try {
      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
      
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          workerId: state.workerProfile.$id,
          status: 'accepted',
          updatedAt: new Date().toISOString()
        }
      );

      // Refresh worker data to update bookings lists
      await get().fetchWorkerData(state.workerProfile.userId);
    } catch (error) {
      console.error('Error accepting booking:', error);
      throw error;
    }
  }
})); 