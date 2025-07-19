"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  return (
    <LoginForm 
      callbackUrl={callbackUrl || "/dashboard"} 
    />
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-12">
        <div className="w-full max-w-sm mx-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
            </div>
          }>
            <LoginContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
} 