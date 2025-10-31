"use client";

import * as React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-2xl md:text-3xl font-serif font-bold mb-4">Privacy Policy</h1>
        <p className="text-neutral-700 leading-relaxed max-w-3xl">
          We respect your privacy. This page outlines how we collect, use, and protect your information.
          We only use your data to provide and improve our services, communicate with you, and comply with legal obligations.
          For any questions about this policy, please contact support@erandwork.com.
        </p>
      </main>
      <Footer />
    </div>
  );
}
