"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Eye, 
  MessageCircle,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Star,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  client: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  price: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  description: string;
  category: string;
  urgency: "low" | "medium" | "high";
}

const mockJobs: Job[] = [
  {
    id: "1",
    title: "House Cleaning Service",
    client: "Sarah Johnson",
    date: "2024-01-15",
    time: "10:00 AM",
    duration: 3,
    location: "123 Main Street, Lagos",
    price: 15000,
    status: "confirmed",
    description: "Deep cleaning of 3-bedroom apartment",
    category: "Cleaning",
    urgency: "medium"
  },
  {
    id: "2",
    title: "Plumbing Repair",
    client: "David Wilson",
    date: "2024-01-16",
    time: "2:00 PM",
    duration: 2,
    location: "456 Oak Avenue, Abuja",
    price: 8000,
    status: "pending",
    description: "Fix leaky faucet in kitchen",
    category: "Plumbing",
    urgency: "high"
  },
  {
    id: "3",
    title: "Garden Maintenance",
    client: "Maria Garcia",
    date: "2024-01-14",
    time: "8:00 AM",
    duration: 4,
    location: "789 Pine Road, Port Harcourt",
    price: 12000,
    status: "completed",
    description: "Lawn mowing and hedge trimming",
    category: "Gardening",
    urgency: "low"
  }
];

export default function WorkerJobsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [jobs, setJobs] = React.useState<Job[]>(mockJobs);

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/jobs");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const jobCounts = {
    all: jobs.length,
    pending: jobs.filter(j => j.status === "pending").length,
    confirmed: jobs.filter(j => j.status === "confirmed").length,
    in_progress: jobs.filter(j => j.status === "in_progress").length,
    completed: jobs.filter(j => j.status === "completed").length,
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
                  My Jobs
                </h1>
                <p className="text-neutral-600">
                  Manage your bookings and track your progress
                </p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Job Request
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search jobs, clients, or locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs ({jobCounts.all})</SelectItem>
                  <SelectItem value="pending">Pending ({jobCounts.pending})</SelectItem>
                  <SelectItem value="confirmed">Confirmed ({jobCounts.confirmed})</SelectItem>
                  <SelectItem value="in_progress">In Progress ({jobCounts.in_progress})</SelectItem>
                  <SelectItem value="completed">Completed ({jobCounts.completed})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({jobCounts.all})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({jobCounts.pending})</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed ({jobCounts.confirmed})</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress ({jobCounts.in_progress})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({jobCounts.completed})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="grid gap-4">
                  {filteredJobs.map((job) => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-neutral-900">{job.title}</h3>
                              <Badge className={getStatusColor(job.status)}>
                                {job.status.replace("_", " ")}
                              </Badge>
                              <Badge className={getUrgencyColor(job.urgency)}>
                                {job.urgency} priority
                              </Badge>
                            </div>
                            
                            <p className="text-neutral-600 mb-3">{job.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-neutral-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(job.date).toLocaleDateString()} at {job.time}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {job.duration} hours
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600 mb-2">
                              ₦{job.price.toLocaleString()}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Message
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Other tab contents would follow the same pattern */}
              <TabsContent value="pending">
                <div className="grid gap-4">
                  {filteredJobs.filter(job => job.status === "pending").map((job) => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-neutral-900">{job.title}</h3>
                              <Badge className={getStatusColor(job.status)}>
                                {job.status.replace("_", " ")}
                              </Badge>
                              <Badge className={getUrgencyColor(job.urgency)}>
                                {job.urgency} priority
                              </Badge>
                            </div>
                            
                            <p className="text-neutral-600 mb-3">{job.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-neutral-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(job.date).toLocaleDateString()} at {job.time}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {job.duration} hours
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600 mb-2">
                              ₦{job.price.toLocaleString()}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Accept
                              </Button>
                              <Button variant="outline" size="sm">
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Add other tab contents for confirmed, in_progress, completed */}
            </Tabs>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
} 