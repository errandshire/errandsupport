"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClientHeader } from "@/components/layout/client-header";
import { Footer } from "@/components/layout/footer";
import { ClientSidebar } from "@/components/layout/client-sidebar";
import { useAuth } from "@/hooks/use-auth";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Handle authentication and loading
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/client");
      return;
    }

    if (user.role !== "client") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

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
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Ensure user is a client
  if (user.role !== "client") {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <ClientHeader
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
      />
      <div className="flex flex-1">
        {/* Sidebar */}
        <ClientSidebar
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