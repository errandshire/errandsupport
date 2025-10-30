"use client";

import * as React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function TermsPage() {
  const pdfPath = encodeURI("/ErandWork Legal Compliance Pack - Reviewed.pdf");
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-2xl md:text-3xl font-serif font-bold mb-4">Terms of Service</h1>
        <p className="text-neutral-600 mb-6">
          Please read these Terms carefully. By creating an account, you agree to be bound by these Terms of Service.
        </p>
        <div className="mb-4">
          <a href={pdfPath} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
            View the full Terms (PDF)
          </a>
        </div>
        <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
          <iframe src={pdfPath} className="w-full h-full" title="Terms of Service" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
