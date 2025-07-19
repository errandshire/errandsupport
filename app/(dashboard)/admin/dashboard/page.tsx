"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Users,
  Settings,
  Shield,
  AlertTriangle,
  Activity,
  FileText,
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-neutral-600">
          Manage users, monitor platform activity, and maintain system health.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">2,451</div>
              <Users className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Active Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">847</div>
              <Shield className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Pending Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">23</div>
              <AlertTriangle className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">98%</div>
              <Activity className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>Latest user sign-ups requiring review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sample entries - replace with real data */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-neutral-200 hover:border-red-300 transition-colors">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900">John Smith</h4>
                      <p className="text-sm text-neutral-600">Worker - Cleaning Services</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Pending Review
                        </Badge>
                        <span className="text-xs text-neutral-500">2 hours ago</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 sm:mt-0 ml-13 sm:ml-0">
                    <Button variant="ghost" size="sm" className="flex-1 sm:flex-initial">
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                    <Button size="sm" className="flex-1 sm:flex-initial">
                      Approve
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-neutral-200 hover:border-red-300 transition-colors">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900">Sarah Johnson</h4>
                      <p className="text-sm text-neutral-600">Worker - Personal Assistant</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Pending Review
                        </Badge>
                        <span className="text-xs text-neutral-500">4 hours ago</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 sm:mt-0 ml-13 sm:ml-0">
                    <Button variant="ghost" size="sm" className="flex-1 sm:flex-initial">
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                    <Button size="sm" className="flex-1 sm:flex-initial">
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* System Alerts */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Recent notifications and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Database Backup Complete</p>
                    <p className="text-xs text-neutral-500">Daily backup completed successfully</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Failed Login Attempts</p>
                    <p className="text-xs text-neutral-500">Multiple failed attempts from IP 192.168.1.1</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="outlined">
            <CardHeader>
              <CardTitle className="text-lg">🚀 Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/users">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/reports">
                  <FileText className="h-4 w-4 mr-2" />
                  View Reports
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 