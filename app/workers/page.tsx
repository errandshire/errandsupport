"use client";

import * as React from "react";
import { Metadata } from "next";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSidebar } from "@/components/marketplace/filter-sidebar";
import { WorkerGrid } from "@/components/marketplace/worker-grid";
import { BookingModal } from "@/components/marketplace/booking-modal";
import { SearchFilters, WorkerProfile, BookingRequest } from "@/lib/types/marketplace";
import { mockWorkers, searchWorkers, getWorkersByCategory } from "@/lib/data/mock-workers";

export default function WorkersPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [locationQuery, setLocationQuery] = React.useState("");
  const [filters, setFilters] = React.useState<SearchFilters>({});
  const [workers, setWorkers] = React.useState<WorkerProfile[]>(mockWorkers);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasNextPage, setHasNextPage] = React.useState(true);
  const [selectedWorker, setSelectedWorker] = React.useState<WorkerProfile | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);

  // Simulate search and filtering
  React.useEffect(() => {
    setIsLoading(true);
    
    const timeoutId = setTimeout(() => {
      let filteredWorkers = mockWorkers;

      // Apply search
      if (searchQuery) {
        filteredWorkers = searchWorkers(searchQuery);
      }

      // Apply category filter
      if (filters.category) {
        filteredWorkers = getWorkersByCategory(filters.category);
      }

      // Apply location filter
      if (filters.location?.city) {
        filteredWorkers = filteredWorkers.filter(worker => 
          worker.location.city.toLowerCase().includes(filters.location!.city!.toLowerCase())
        );
      }

      // Apply price range filter
      if (filters.priceRange) {
        filteredWorkers = filteredWorkers.filter(worker => 
          worker.pricing.hourlyRate >= filters.priceRange!.min &&
          worker.pricing.hourlyRate <= filters.priceRange!.max
        );
      }

      // Apply rating filter
      if (filters.rating) {
        filteredWorkers = filteredWorkers.filter(worker => 
          worker.rating.average >= filters.rating!.min
        );
      }

      // Apply verification filter
      if (filters.verified) {
        filteredWorkers = filteredWorkers.filter(worker => 
          worker.verification.isVerified
        );
      }

      // Apply sorting
      if (filters.sortBy) {
        filteredWorkers.sort((a, b) => {
          let aValue: number, bValue: number;
          
          switch (filters.sortBy) {
            case 'rating':
              aValue = a.rating.average;
              bValue = b.rating.average;
              break;
            case 'price':
              aValue = a.pricing.hourlyRate;
              bValue = b.pricing.hourlyRate;
              break;
            case 'reviews':
              aValue = a.rating.totalReviews;
              bValue = b.rating.totalReviews;
              break;
            case 'response_time':
              aValue = a.stats.responseTime;
              bValue = b.stats.responseTime;
              break;
            default:
              aValue = a.rating.average;
              bValue = b.rating.average;
          }

          return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });
      }

      setWorkers(filteredWorkers);
      setIsLoading(false);
    }, 500); // Simulate API delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery, locationQuery, filters]);

  const handleSearch = () => {
    // Trigger search with current query
    setFilters(prev => ({ ...prev }));
  };

  const handleLoadMore = () => {
    setIsLoading(true);
    // Simulate loading more workers
    setTimeout(() => {
      setIsLoading(false);
      setHasNextPage(false); // For demo purposes
    }, 1000);
  };

  const handleWorkerSelect = (worker: WorkerProfile) => {
    setSelectedWorker(worker);
    // TODO: Navigate to worker profile page
    console.log('View worker profile:', worker.id);
  };

  const handleBookWorker = (worker: WorkerProfile) => {
    setSelectedWorker(worker);
    setIsBookingModalOpen(true);
  };

  const handleMessageWorker = (worker: WorkerProfile) => {
    // TODO: Open messaging interface
    console.log('Message worker:', worker.id);
  };

  const handleBookingSubmit = async (booking: Partial<BookingRequest>) => {
    // TODO: Submit booking to API
    console.log('Booking submitted:', booking);
    setIsBookingModalOpen(false);
    setSelectedWorker(null);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setLocationQuery("");
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Find Trusted Workers
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Connect with verified local professionals for all your daily tasks
              </p>
              
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search for services..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Location..."
                    className="pl-10"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button size="lg" onClick={handleSearch} className="sm:w-auto">
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Filter Sidebar */}
            <FilterSidebar
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={handleClearFilters}
            />

            {/* Results Section */}
            <div className="flex-1">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {workers.length} Workers Found
                  </h2>
                  <p className="text-sm text-gray-600">
                    Showing results for your search criteria
                  </p>
                </div>
                
                {/* Mobile Filter Toggle */}
                <div className="lg:hidden">
                  <FilterSidebar
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={handleClearFilters}
                  />
                </div>
              </div>

              {/* Worker Grid */}
              <WorkerGrid
                workers={workers}
                isLoading={isLoading}
                hasNextPage={hasNextPage}
                onLoadMore={handleLoadMore}
                onWorkerSelect={handleWorkerSelect}
                onBookWorker={handleBookWorker}
                onMessageWorker={handleMessageWorker}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedWorker(null);
        }}
        worker={selectedWorker}
        onBookingSubmit={handleBookingSubmit}
      />
    </>
  );
} 