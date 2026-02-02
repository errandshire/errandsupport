"use client";

import * as React from "react";
import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}



const socialLinks = [
  { name: "Facebook", href: "https://facebook.com/erandwork", icon: Facebook },
  { name: "Twitter", href: "https://x.com/erandwork", icon: Twitter },
  { name: "Instagram", href: "https://instagram.com/erandwork", icon: Instagram },
  { name: "TikTok", href: "https://www.tiktok.com/@erandwork", icon: Linkedin }, // Note: Using Linkedin icon temporarily for TikTok
];

export function Footer({ className }: FooterProps) {
  const [email, setEmail] = React.useState("");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    setEmail("");
  };

  return (
    <footer className={cn("bg-neutral-900 text-white", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter Section */}
        <div className="border-b border-neutral-800 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-serif font-bold mb-4">
              Stay Updated
            </h3>
            <p className="text-neutral-400 mb-6">
              Get the latest updates on new services, features, and exclusive offers.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400"
                required
              />
              <Button type="submit" className="bg-primary-500 hover:bg-primary-600">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start">
            {/* Brand */}
            <div>
              <Link href="/" className="flex items-center space-x-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white font-bold text-lg">
                  E
                </div>
                <span className="text-xl font-serif font-bold">
                  Errand Support
                </span>
              </Link>
              
            </div>

            {/* About blurb (center) */}
            <div className="text-neutral-400">
              <p className="max-w-md">
                Premium web-based marketplace connecting clients with local errand-support workers. Making everyday tasks easier and more convenient.
              </p>
            </div>

            {/* Contact Info (right) */}
            <div className="space-y-3 text-sm text-neutral-300">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>support@erandwork.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+2349163213366" className="hover:text-white transition-colors">
                  +234 916 321 3366
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Lagos, Nigeria</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-neutral-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <p className="text-neutral-400 text-sm">
              © {new Date().getFullYear()} Errand Support Platform. All rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  className="text-neutral-400 hover:text-white transition-colors duration-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="h-5 w-5" />
                  <span className="sr-only">{social.name}</span>
                </Link>
              ))}
            </div>

            {/* Language/Region Selector */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-neutral-400">🇺🇸 English (US)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 