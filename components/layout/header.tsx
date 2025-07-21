"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Bell, User, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { notificationService } from '@/lib/notification-service';
import type { Notification } from '@/lib/types';
import { useRouter } from "next/navigation";
import { realtimeNotificationService } from '@/lib/realtime-notification-service';

interface HeaderProps {
  className?: string;
  children?: React.ReactNode;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/workers", label: "Find Workers" },
  { href: "/categories", label: "Categories" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
];

export const Header = React.memo(function Header({ className, children, sidebarOpen, onSidebarToggle }: HeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  
  const { user, isAuthenticated, logout } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Close menu when route changes
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, []);

  // Lock body scroll when menu is open
  React.useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  // Setup real-time notifications
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;

    let unsubscribe: (() => void) | null = null;

    const setupNotifications = async () => {
      try {
        // Initialize real-time notification service
        await realtimeNotificationService.initialize(user.$id);
        
        // Get existing notifications
        const userNotifications = realtimeNotificationService.getUserNotifications(user.$id);
        setNotifications(userNotifications);
        setUnreadCount(realtimeNotificationService.getUnreadCount(user.$id));
        
        // Subscribe to real-time updates
        unsubscribe = realtimeNotificationService.subscribe(user.$id, (update) => {
          setNotifications(realtimeNotificationService.getUserNotifications(user.$id));
          setUnreadCount(update.unreadCount);
        });
        
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    setupNotifications();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, user]);

  const handleLogout = React.useCallback(() => {
    logout();
  }, [logout]);

  const handleMenuToggle = React.useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const handleSearchToggle = React.useCallback(() => {
    setIsSearchOpen(prev => !prev);
  }, []);

  const closeMenu = React.useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!user) return;
    
    // Mark notification as read
    const success = await realtimeNotificationService.markAsRead(notification.$id, user.$id);
    
    if (success) {
      // Use actionUrl if available, otherwise handle specific notification types
      if ((notification as any).actionUrl) {
        // Convert full URLs to relative paths for internal navigation
        const actionPath = (notification as any).actionUrl.startsWith('http') 
          ? new URL((notification as any).actionUrl).pathname + new URL((notification as any).actionUrl).search
          : (notification as any).actionUrl;
        
        router.push(actionPath);
      } else if (notification.title === 'New Message') {
        // Navigate based on user role for message notifications
        if (user?.role === 'worker') {
          router.push('/worker/messages');
        } else if (user?.role === 'client') {
          router.push('/client/messages');
        }
      } else {
        // Generic fallback based on user role
        if (user?.role === 'worker') {
          router.push('/worker/bookings');
        } else if (user?.role === 'client') {
          router.push('/client/bookings');
        }
      }
    }
  };

  // Helper to get user-specific links
  const getUserLinks = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return {
          dashboard: '/admin/dashboard',
         
        };
      case 'worker':
        return {
          dashboard: '/worker/dashboard',
          
        };
      case 'client':
        return {
          dashboard: '/client',
          
        };
      default:
        return {
          dashboard: '/',
         
        };
    }
  };
  const userLinks = getUserLinks(user?.role);

  // Memoize user display values
  const userDisplayName = React.useMemo(() => 
    user?.name || 'User', [user?.name]
  );

  const userInitials = React.useMemo(() => 
    user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U',
    [user?.name]
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60",
          className
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Sidebar Toggle (if provided) */}
            {children}
            
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-lg md:text-xl font-bold text-black">
                ErandWork
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  type="search"
                  placeholder="Search services, workers..."
                  className="pl-10 pr-4"
                />
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Search Button - Mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={handleSearchToggle}
              >
                <Search className="h-5 w-5" />
              </Button>

              {isAuthenticated && user ? (
                <>
                  {/* Notifications */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center"
                          >
                            {unreadCount}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <div className="p-3 border-b">
                        <h4 className="font-semibold text-sm">Notifications</h4>
                      </div>
                      {notifications.length === 0 ? (
                        <DropdownMenuItem>
                          <div className="text-sm text-neutral-500">No notifications</div>
                        </DropdownMenuItem>
                      ) : (
                        notifications.map((notif) => (
                          <DropdownMenuItem 
                            key={notif.$id}
                            onClick={() => handleNotificationClick(notif)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col space-y-1">
                              <p className="text-sm font-medium">{notif.title}</p>
                              <p className="text-xs text-neutral-500">{notif.message}</p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Link href="/notifications" className="w-full text-center text-sm">
                          View all notifications
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar || ""} alt={userDisplayName} />
                          <AvatarFallback>
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">{userDisplayName}</p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                      </div>
                      
                      <DropdownMenuItem asChild>
                        <Link href={userLinks.dashboard}>Dashboard</Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button - Only show when not signed in */}
              {!isAuthenticated && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={handleMenuToggle}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          {isSearchOpen && (
            <div className="lg:hidden border-t border-neutral-200 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  type="search"
                  placeholder="Search services, workers..."
                  className="pl-10 pr-4"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={closeMenu}
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-6 border-b border-neutral-200">
              <span className="text-lg font-medium">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMenu}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="py-6 px-6">
              <nav className="flex flex-col space-y-6">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-base font-medium text-neutral-700 hover:text-primary-600 transition-colors duration-200"
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <div className="pt-6 space-y-4 border-t border-neutral-200">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/login" onClick={closeMenu}>
                        Sign In
                      </Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link href="/register" onClick={closeMenu}>
                        Get Started
                      </Link>
                    </Button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}); 