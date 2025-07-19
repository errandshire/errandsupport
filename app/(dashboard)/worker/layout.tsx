"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { WorkerHeader } from "@/components/layout/worker-header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useWorkerStore } from "@/store/worker-store";

export default function WorkerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const { fetchWorkerData, isLoading: workerLoading } = useWorkerStore();

  // Handle authentication and loading
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker");
      return;
    }

    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }

    // If worker is not onboarded, redirect to onboarding
    if (!user.isOnboarded) {
      router.replace("/onboarding");
      return;
    }

    // Fetch worker data when authenticated
    fetchWorkerData(user.$id);
  }, [loading, isAuthenticated, user, router, fetchWorkerData]);

  // Handle responsive sidebar behavior
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading state
  if (loading || !user || workerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Ensure user is a worker
  if (user.role !== "worker") {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <WorkerHeader
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
      />
      <div className="flex flex-1">
        {/* Sidebar */}
        <WorkerSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
} 