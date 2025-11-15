"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function DashboardContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/dashboard");
      return;
    }

    // Redirect to role-specific dashboard
    const dest = `/${user.role}`; // will be /admin, /client, or /worker
    router.replace(dest);
  }, [loading, isAuthenticated, user, router]);

  // Show loading state while checking auth or redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
} 