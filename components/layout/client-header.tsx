"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Bell, User, Menu, X, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import type { Notification } from '@/lib/notification-service';
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ClientHeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({ sidebarOpen, onSidebarToggle }) => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      notificationService.getUserNotifications(user.$id, 5).then((notifs) => {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.isRead).length);
      });
    }
  }, [isAuthenticated, user]);

  const handleLogout = React.useCallback(() => {
    logout();
  }, [logout]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark notification as read
    await notificationService.markAsRead(notification.$id);
    
    // Use actionUrl if available, otherwise handle specific notification types
    if (notification.actionUrl) {
      // Convert full URLs to relative paths for internal navigation
      const actionPath = notification.actionUrl.startsWith('http') 
        ? new URL(notification.actionUrl).pathname + new URL(notification.actionUrl).search
        : notification.actionUrl;
      
      router.push(actionPath);
    } else if (notification.title === 'New Message') {
      // Fallback for message notifications without actionUrl
      router.push('/client/messages');
    } else {
      // Generic fallback - show a helpful message
      toast.info("Please check your bookings page for more details");
      router.push('/client/bookings');
    }
    
    // Refresh notifications
    if (user) {
      const updatedNotifs = await notificationService.getUserNotifications(user.$id, 5);
      setNotifications(updatedNotifs as unknown as Notification[]);
      setUnreadCount(updatedNotifs.filter(n => !n.isRead).length);
    }
  };

  // Client links
  const userLinks = {
    dashboard: '/client',
    profile: '/client/profile',
    settings: '/client/settings',
    bookings: '/client/bookings',
    wallet: '/client/wallet',
  };

  const userDisplayName = user?.name || 'Client';
  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'C';

  return (
    <header className={cn("sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60")}> 
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Sidebar Toggle - Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10"
            onClick={onSidebarToggle}
            aria-label="Open menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <Link href="/client" className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center lg:hidden">
                <span className="text-white font-bold text-sm">EP</span>
              </div>
              <span className="text-lg lg:text-xl font-bold text-black">
                <span className="hidden sm:inline">Client Portal</span>
                <span className="sm:hidden">Portal</span>
              </span>
            </div>
          </Link>

          {/* Spacer for mobile */}
          <div className="flex-1 lg:hidden" />

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Wallet Button - Mobile Priority */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex h-9"
              asChild
            >
              <Link href="/client/wallet">
                <Wallet className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Wallet</span>
              </Link>
            </Button>

            {/* Quick Book Button */}
            <Button
              size="sm"
              className="bg-primary-500 hover:bg-primary-600 text-white h-9 px-3 sm:px-4"
              asChild
            >
              <Link href="/workers">
                <span className="hidden sm:inline">Book Service</span>
                <span className="sm:hidden">Book</span>
              </Link>
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 sm:w-72">
                <div className="p-3 border-b">
                  <h3 className="font-medium text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{unreadCount} unread</p>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="p-3 cursor-pointer"
                      >
                        <div className="flex items-start space-x-2 w-full">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/notifications" className="w-full text-center text-sm p-3 border-t">
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
                    <AvatarImage src={user?.avatar || ""} alt={userDisplayName} />
                    <AvatarFallback className="text-sm">{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium truncate">{userDisplayName}</p>
                  <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href={userLinks.dashboard} className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={userLinks.profile} className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={userLinks.bookings} className="w-full">
                    My Bookings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="sm:hidden">
                  <Link href={userLinks.wallet} className="w-full">
                    <Wallet className="mr-2 h-4 w-4" />
                    Wallet
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={userLinks.settings} className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}; 