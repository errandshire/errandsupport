"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Bell, User, Menu, X } from "lucide-react";
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

interface WorkerHeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export const WorkerHeader: React.FC<WorkerHeaderProps> = ({ sidebarOpen, onSidebarToggle }) => {
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
    await notificationService.markAsRead(notification.id);
    
    // Use actionUrl if available, otherwise handle specific notification types
    if (notification.actionUrl) {
      // Convert full URLs to relative paths for internal navigation
      const actionPath = notification.actionUrl.startsWith('http') 
        ? new URL(notification.actionUrl).pathname + new URL(notification.actionUrl).search
        : notification.actionUrl;
      
      router.push(actionPath);
    } else if (notification.title?.includes('message') || notification.title?.includes('Message')) {
      // Fallback for message notifications without actionUrl
      router.push('/worker/messages');
    } else {
      // Generic fallback - show a helpful message
      toast.info("Please check your bookings page for more details");
      router.push('/worker/bookings');
    }
    
    // Refresh notifications
    if (user) {
      const updatedNotifs = await notificationService.getUserNotifications(user.$id, 5);
      setNotifications(updatedNotifs as Notification[]);
      setUnreadCount(updatedNotifs.filter(n => !n.isRead).length);
    }
  };

  // Worker links
  const userLinks = {
    dashboard: '/worker/dashboard',
    profile: '/worker/profile',
    settings: '/worker/settings',
    bookings: '/worker/bookings',
  };

  const userDisplayName = user?.name || 'Worker';
  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'W';

  return (
    <header className={cn("sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60")}> 
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Sidebar Toggle - Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onSidebarToggle}
            aria-label="Open menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {/* Logo */}
          <Link href="/worker/dashboard" className="flex items-center space-x-2">
            <img
              src="/errandworklogo.png"
              alt="ErandWork"
              className="h-8 w-auto"
            />
            <span className="text-sm md:text-base font-medium text-neutral-600">
              Worker Portal
            </span>
          </Link>
          {/* Spacer */}
          <div className="flex-1" />
          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
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
                <div className="max-h-[50vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <DropdownMenuItem>
                    <div className="text-sm text-neutral-500">No notifications</div>
                  </DropdownMenuItem>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
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
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
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
                    <AvatarImage src={user?.avatar || ""} alt={userDisplayName} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">{userDisplayName}</p>
                  <p className="text-xs text-neutral-500">{user?.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href={userLinks.profile}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={userLinks.dashboard}>Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={userLinks.bookings}>My Bookings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={userLinks.settings}>Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
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