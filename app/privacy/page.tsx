"use client";

import * as React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-2xl md:text-3xl font-serif font-bold mb-6">Privacy Policy</h1>
        
        <div className="prose prose-neutral max-w-3xl space-y-6">
          <p className="text-neutral-700 leading-relaxed">
            We respect your privacy. This page outlines how we collect, use, and protect your information.
            We only use your data to provide and improve our services, communicate with you, and comply with legal obligations.
            For any questions about this policy, please contact support@erandwork.com.
          </p>

          <section>
            <h2 className="text-xl font-bold mb-3">Location Data Collection</h2>
            <p className="text-neutral-700 leading-relaxed">
              We collect your precise location (GPS coordinates) when you use the app as a worker. 
              We access your location in the background when you have an active job to share your live location with clients.
              Location data is used to match workers with nearby jobs and to track job progress.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How Location Data is Used</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>To display jobs near your current location</li>
              <li>To share your live location with clients during active jobs</li>
              <li>To calculate distances between workers and job locations</li>
              <li>To improve job matching algorithms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Location Data Sharing</h2>
            <p className="text-neutral-700 leading-relaxed">
              Your location is shared with clients only when you have an active job.
              Location data is not sold to third parties.
              Location data is stored securely on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Location Data Retention</h2>
            <p className="text-neutral-700 leading-relaxed">
              Location data is retained for the duration of the job plus 30 days for dispute resolution.
              After the retention period, location data is permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Other Data We Collect</h2>
            <p className="text-neutral-700 leading-relaxed">
              We may collect additional personal information including your name, email address, phone number, 
              profile information, and payment details as necessary to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data Security</h2>
            <p className="text-neutral-700 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal data 
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Contact Us</h2>
            <p className="text-neutral-700 leading-relaxed">
              For any questions about this policy or your personal data, please contact us at support@erandwork.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
