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
    <>
    <Header />
    <div className="container relative flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <Suspense fallback={<div>Loading...</div>}>
        
          <LoginContent />
        </Suspense>
      </div>
    </div>
    <Footer />
    </>
  );
} 