"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home,
  Calendar,
  DollarSign,
  Star,
  Settings,
  User,
  Clock,
  MessageCircle,
  FileText,
  BarChart3,
  ChevronLeft,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkerSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/worker",
    icon: Home,
    badge: null,
  },
  {
    title: "Jobs",
    href: "/worker/jobs",
    icon: Calendar,
    badge: "3",
  },
  {
    title: "Messages",
    href: "/worker/messages",
    icon: MessageCircle,
    badge: "5",
  },
  {
    title: "Earnings",
    href: "/worker/earnings",
    icon: DollarSign,
    badge: null,
  },
  {
    title: "Reviews",
    href: "/worker/reviews",
    icon: Star,
    badge: null,
  },
  {
    title: "Analytics",
    href: "/worker/analytics",
    icon: BarChart3,
    badge: null,
  },
  {
    title: "Availability",
    href: "/worker/availability",
    icon: Clock,
    badge: null,
  },
  {
    title: "Profile",
    href: "/worker/profile",
    icon: User,
    badge: null,
  },
  {
    title: "Documents",
    href: "/worker/documents",
    icon: FileText,
    badge: null,
  },
  {
    title: "Settings",
    href: "/worker/settings",
    icon: Settings,
    badge: null,
  },
];

export function WorkerSidebar({ isOpen, onToggle, className }: WorkerSidebarProps) {
  const pathname = usePathname();

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring",
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
          "fixed left-0 top-0 z-50 h-full w-64 bg-white border-r border-neutral-200 shadow-lg lg:relative lg:z-auto lg:shadow-none",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ES</span>
              </div>
              <span className="font-semibold text-neutral-900">Worker Portal</span>
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
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-primary-100 text-primary-700 border border-primary-200"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      )}
                      onClick={() => {
                        // Close sidebar on mobile when navigating
                        if (window.innerWidth < 1024) {
                          onToggle();
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className="h-5 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
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
                  Available
                </p>
                <p className="text-xs text-neutral-500">
                  Ready for work
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
export function SidebarToggle({ onToggle, className }: { onToggle: () => void; className?: string }) {
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