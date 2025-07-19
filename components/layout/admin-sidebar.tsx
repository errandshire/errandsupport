"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home,
  Users,
  FileText,
  Settings,
  BarChart3,
  Shield,
  AlertTriangle,
  Activity,
  TrendingUp,
  DollarSign,
  Menu,
  X,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: Home,
    badge: null,
  },
  {
    title: "Manage Users",
    href: "/admin/users",
    icon: Users,
    badge: "23",
  },
  {
    title: "Transactions",
    href: "/admin/transactions",
    icon: DollarSign,
    badge: null,
  },
  {
    title: "Auto-Release",
    href: "/admin/auto-release",
    icon: Clock,
    badge: null,
  },
  {
    title: "Verifications",
    href: "/admin/verifications",
    icon: Shield,
    badge: "5",
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: FileText,
    badge: null,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    badge: null,
  },
  {
    title: "System Health",
    href: "/admin/system",
    icon: Activity,
    badge: null,
  },
  {
    title: "Commission Settings",
    href: "/admin/commission",
    icon: TrendingUp,
    badge: null,
  },
  {
    title: "System Alerts",
    href: "/admin/alerts",
    icon: AlertTriangle,
    badge: "2",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    badge: null,
  },
];

export function AdminSidebar({ isOpen, onToggle, className }: AdminSidebarProps) {
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
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AD</span>
              </div>
              <span className="font-semibold text-neutral-900">Admin Portal</span>
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
                          ? "bg-red-100 text-red-700 border border-red-200"
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
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <Shield className="text-white h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  Admin Access
                </p>
                <p className="text-xs text-neutral-500">
                  Full system control
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