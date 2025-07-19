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
  Menu,
  X
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
    href: "/client",
    icon: Home,
  },
  {
    title: "My Bookings",
    href: "/client/bookings",
    icon: Calendar,
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
  {
    title: "Settings",
    href: "/client/settings",
    icon: Settings,
  },
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
        initial="open"
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-white border-r border-neutral-200 shadow-lg lg:sticky lg:z-auto lg:shadow-none overflow-y-auto",
          className
        )}
      >
        <div className="flex min-h-full flex-col">
          {/* Header */}
          <div className="p-4">
            <h1 className="text-xl font-semibold">Client Portal</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4">
            <ul className="space-y-1">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center px-4 py-3 text-sm rounded-lg transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-900 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          onToggle();
                        }
                      }}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
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