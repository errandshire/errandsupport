"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, Variants } from "framer-motion";
import { Search, MapPin, Clock, Star, Heart, Filter } from "lucide-react";
import Image from "next/image";

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

// Mock data for workers
const DUMMY_WORKERS = [
  {
    id: 1,
    name: "Sarah Johnson",
    avatar: "/avatars/sarah.jpg",
    rating: 4.9,
    reviews: 127,
    location: "Lagos",
    rate: "₦2,500/hr",
    description: "Professional cleaner with 5+ years experience in residential and commercial cleaning. Specialized in deep cleaning and organization.",
    services: ["Deep Cleaning", "Window Cleaning", "Carpet Cleaning"],
    responseTime: "15 min",
    jobsCompleted: 245,
    available: true,
    categories: ["Cleaning", "Home Services"]
  },
  {
    id: 2,
    name: "Michael Chen",
    avatar: "/avatars/michael.jpg",
    rating: 4.8,
    reviews: 93,
    location: "Lagos",
    rate: "₦3,000/hr",
    description: "Expert handyman with 8+ years of experience. Skilled in repairs, installations, and maintenance work.",
    services: ["Repairs", "Installation", "Maintenance"],
    responseTime: "20 min",
    jobsCompleted: 189,
    available: true,
    categories: ["Handyman", "Home Services"]
  },
  {
    id: 3,
    name: "Aisha Patel",
    avatar: "/avatars/aisha.jpg",
    rating: 4.7,
    reviews: 156,
    location: "Abuja",
    rate: "₦2,800/hr",
    description: "Professional organizer and personal assistant. Helping you manage your time and space efficiently.",
    services: ["Organization", "Personal Assistant", "Errands"],
    responseTime: "10 min",
    jobsCompleted: 312,
    available: false,
    categories: ["Personal Assistant", "Organization"]
  },
  {
    id: 4,
    name: "David Wilson",
    avatar: "/avatars/david.jpg",
    rating: 4.9,
    reviews: 208,
    location: "Lagos",
    rate: "₦3,500/hr",
    description: "Tech support specialist with expertise in computer repair, network setup, and smart home installation.",
    services: ["Tech Support", "Computer Repair", "Network Setup"],
    responseTime: "25 min",
    jobsCompleted: 278,
    available: true,
    categories: ["Tech Support", "Installation"]
  },
  {
    id: 5,
    name: "Grace Okonjo",
    avatar: "/avatars/grace.jpg",
    rating: 4.8,
    reviews: 167,
    location: "Port Harcourt",
    rate: "₦2,600/hr",
    description: "Experienced caregiver and companion. Providing compassionate care and assistance to seniors.",
    services: ["Caregiving", "Companionship", "Senior Care"],
    responseTime: "30 min",
    jobsCompleted: 198,
    available: true,
    categories: ["Caregiving", "Health Services"]
  },
  {
    id: 6,
    name: "James Thompson",
    avatar: "/avatars/james.jpg",
    rating: 4.6,
    reviews: 142,
    location: "Lagos",
    rate: "₦3,200/hr",
    description: "Professional mover and delivery expert. Specializing in safe and efficient moving and delivery services.",
    services: ["Moving", "Delivery", "Furniture Assembly"],
    responseTime: "20 min",
    jobsCompleted: 234,
    available: true,
    categories: ["Moving", "Delivery"]
  }
];

export default function WorkersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter workers based on search and location
  const filteredWorkers = useMemo(() => {
    return DUMMY_WORKERS.filter(worker => {
      const matchesSearch = searchQuery === "" || 
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.services.some(service => 
          service.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        worker.categories.some(category =>
          category.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        worker.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLocation = locationQuery === "" ||
        worker.location.toLowerCase().includes(locationQuery.toLowerCase());

      return matchesSearch && matchesLocation;
    });
  }, [searchQuery, locationQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already reactive through the useMemo above
  };

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
            {filteredWorkers.map((worker) => (
              <motion.div
                key={worker.id}
                variants={fadeIn}
                className="bg-white rounded-xl p-4 shadow-soft hover:shadow-medium transition-shadow duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden bg-gray-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600" />
                    <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-lg">
                      {worker.name.charAt(0)}
                    </div>
                    {worker.available && (
                      <div className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{worker.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {worker.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          {worker.rating}
                          <span className="text-gray-500">({worker.reviews})</span>
                        </div>
                        <p className="text-sm font-medium text-emerald-600">{worker.rate}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{worker.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {worker.services.slice(0, 3).map((service, index) => (
                        <Badge key={index} variant="secondary" className="bg-gray-100">
                          {service}
                        </Badge>
                      ))}
                      {worker.services.length > 3 && (
                        <Badge variant="secondary" className="bg-gray-100">
                          +{worker.services.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Responds in {worker.responseTime}
                      </div>
                      <div>{worker.jobsCompleted} jobs</div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-10">View Profile</Button>
                      <Button className="h-10 bg-emerald-500 hover:bg-emerald-600">Book Now</Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
} 