"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardLanding() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      console.log('Not authenticated, redirecting to login');
      router.replace("/login?callbackUrl=/dashboard");
      return;
    }

    // Redirect to role-specific dashboard
    const dest = `/${user.role}`; // will be /admin, /client, or /worker
    console.log('Redirecting to role-specific dashboard:', dest);
    router.replace(dest);
  }, [loading, isAuthenticated, user, router]);

  // Show loading state while checking auth or redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );
} 