"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Calendar,
  Search,
  MessageCircle,
  Settings,
  User,
  Wallet,
  Menu,
  X,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ClientSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/client/dashboard",
    icon: Home,
  },
  {
    title: "My Jobs",
    href: "/client/jobs",
    icon: Briefcase,
  },
  {
    title: "My Bookings",
    href: "/client/bookings",
    icon: Calendar,
  },
  {
    title: "Wallet",
    href: "/client/wallet",
    icon: Wallet,
  },
  {
    title: "Messages",
    href: "/client/messages",
    icon: MessageCircle,
  },
  {
    title: "Find Services",
    href: "/workers",
    icon: Search,
  },
  {
    title: "Profile",
    href: "/client/profile",
    icon: User,
  },
  // {
  //   title: "Settings",
  //   href: "/client/settings",
  //   icon: Settings,
  // },
];

export function ClientSidebar({ isOpen, onToggle, className }: ClientSidebarProps) {
  const pathname = usePathname();

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const overlayVariants = {
    open: {
      opacity: 1,
      visibility: "visible" as const,
    },
    closed: {
      opacity: 0,
      visibility: "hidden" as const,
    },
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-72 sm:w-64 bg-white border-r border-neutral-200 shadow-lg lg:sticky lg:z-auto lg:shadow-none overflow-y-auto",
          className
        )}
      >
        <div className="flex min-h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <h1 className="text-lg font-semibold text-neutral-900">Client Portal</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href === "/client" && pathname === "/client/dashboard");
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                        "hover:bg-gray-50 active:scale-95",
                        isActive
                          ? "bg-primary-50 text-primary-700 border border-primary-200 shadow-sm"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      )}
                      onClick={() => {
                        // Close sidebar on mobile when navigating
                        if (window.innerWidth < 1024) {
                          onToggle();
                        }
                      }}
                    >
                      <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">●</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  Client Account
                </p>
                <p className="text-xs text-neutral-500">
                  Ready to book services
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

// Toggle Button Component for Mobile
export function ClientSidebarToggle({ onToggle, className }: { onToggle: () => void; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn("lg:hidden", className)}
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
} 