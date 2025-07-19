"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function ClientPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/client/dashboard");
      return;
    }

    if (user.role !== "client") {
      router.replace(`/${user.role}/dashboard`);
      return;
    }

    router.replace("/client/dashboard");
  }, [loading, isAuthenticated, user, router]);

  return null;
} 