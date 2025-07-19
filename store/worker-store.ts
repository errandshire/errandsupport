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

        // Get current date for filtering
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        try {
          // Fetch available bookings (no worker assigned)
          const availableBookingsResponse = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.BOOKINGS,
            [
              Query.isNull('workerId'),
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
              $id: doc.$id,
              id: doc.$id,
              clientId: doc.clientId,
              workerId: doc.workerId,
              title: doc.title,
              description: doc.description,
              locationAddress: doc.locationAddress,
              scheduledDate: doc.scheduledDate,
              estimatedDuration: doc.estimatedDuration,
              budgetAmount: doc.budgetAmount,
              budgetCurrency: doc.budgetCurrency || 'NGN',
              status: doc.status || 'pending',
              paymentStatus: doc.paymentStatus,
              paymentAmount: doc.paymentAmount,
              urgency: doc.urgency || 'medium',
              clientName: clientMap[doc.clientId]?.name || 'Unknown Client',
              clientEmail: clientMap[doc.clientId]?.email
            }));

          // Process accepted bookings
          const processedAcceptedBookings = acceptedBookingsResponse.documents
            .filter((doc: any) => doc.scheduledDate && doc.budgetAmount)
            .map((doc: any) => ({
              $id: doc.$id,
              id: doc.$id,
              clientId: doc.clientId,
              workerId: doc.workerId,
              title: doc.title,
              description: doc.description,
              locationAddress: doc.locationAddress,
              scheduledDate: doc.scheduledDate,
              estimatedDuration: doc.estimatedDuration,
              budgetAmount: doc.budgetAmount,
              budgetCurrency: doc.budgetCurrency || 'NGN',
              status: doc.status,
              paymentStatus: doc.paymentStatus,
              paymentAmount: doc.paymentAmount,
              urgency: doc.urgency || 'medium',
              clientName: clientMap[doc.clientId]?.name || 'Unknown Client',
              clientEmail: clientMap[doc.clientId]?.email
            }));

          set({
            availableBookings: processedAvailableBookings,
            acceptedBookings: processedAcceptedBookings
          });

        } catch (error) {
          console.error('Error fetching bookings:', error);
          set({ error: 'Failed to fetch bookings' });
        }
      } else {
        set({ error: 'Worker profile not found' });
      }
    } catch (error) {
      console.error('Error fetching worker data:', error);
      set({ error: 'Failed to fetch worker data' });
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