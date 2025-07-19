"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClientHeader } from "@/components/layout/client-header";
import { Footer } from "@/components/layout/footer";
import { ClientSidebar } from "@/components/layout/client-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Loading component
const LayoutLoading = React.memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-50">
    <Card className="p-6">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="mt-2 text-sm text-gray-600">Loading client dashboard...</p>
      </div>
    </Card>
  </div>
));

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false); // Start closed on mobile
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Handle authentication and loading with debounce
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      setIsRedirecting(true);
      router.replace("/login?callbackUrl=/client");
      return;
    }

    if (user.role !== "client") {
      setIsRedirecting(true);
      router.replace(`/${user.role}`);
      return;
    }

    setIsRedirecting(false);
  }, [loading, isAuthenticated, user, router]);

  // Handle responsive sidebar behavior with throttling
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (window.innerWidth >= 1024) {
          setSidebarOpen(true); // Open on desktop
        } else {
          setSidebarOpen(false); // Closed on mobile/tablet
        }
      }, 100); // Throttle resize events
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Memoized sidebar toggle handler
  const handleSidebarToggle = React.useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Show loading state
  if (loading || !user || isRedirecting) {
    return <LayoutLoading />;
  }

  // Ensure user is a client
  if (user.role !== "client") {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <ClientHeader
        sidebarOpen={sidebarOpen}
        onSidebarToggle={handleSidebarToggle}
      />
      <div className="flex flex-1 relative">
        {/* Sidebar */}
        <ClientSidebar
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
} 