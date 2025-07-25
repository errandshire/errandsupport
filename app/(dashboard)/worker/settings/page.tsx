"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  User, 
  Lock,
  Bell,
  CreditCard,
  Shield,
  Smartphone,
  Mail,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";

export default function WorkerSettingsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/settings");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
       

      <div className="flex-1 flex flex-col lg:ml-0">
         
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                Settings
              </h1>
              <p className="text-neutral-600">
                Manage your account settings and preferences
              </p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="privacy">Privacy</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first-name">First Name</Label>
                        <Input id="first-name" defaultValue={user.name?.split(' ')[0] || ''} />
                      </div>
                      <div>
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input id="last-name" defaultValue={user.name?.split(' ')[1] || ''} />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" defaultValue={user.email} />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" defaultValue={user.phone || ''} />
                    </div>
                    
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Input id="bio" placeholder="Tell clients about yourself" />
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" placeholder="City, State" />
                    </div>
                    
                    <Button>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>Update your account password</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter current password"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <Button>Update Password</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Two-Factor Authentication</CardTitle>
                      <CardDescription>Add an extra layer of security</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Enable 2FA</p>
                          <p className="text-sm text-neutral-600">
                            Secure your account with SMS or authenticator app
                          </p>
                        </div>
                        <Switch />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose how you want to be notified</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>New Booking Requests</Label>
                          <p className="text-sm text-neutral-600">Get notified when clients request your services</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Messages</Label>
                          <p className="text-sm text-neutral-600">Receive notifications for new messages</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Payment Updates</Label>
                          <p className="text-sm text-neutral-600">Get notified about payments and earnings</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Reviews</Label>
                          <p className="text-sm text-neutral-600">Know when clients leave reviews</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Marketing Updates</Label>
                          <p className="text-sm text-neutral-600">Receive tips and platform updates</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label>Notification Method</Label>
                      <Select defaultValue="both">
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="sms">SMS Only</SelectItem>
                          <SelectItem value="both">Email & SMS</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Methods</CardTitle>
                      <CardDescription>Manage how you receive payments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">Zenith Bank</p>
                              <p className="text-sm text-neutral-600">**** **** **** 1234</p>
                            </div>
                          </div>
                          <Badge>Primary</Badge>
                        </div>
                        
                        <Button variant="outline" className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Payment Method
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Payout Settings</CardTitle>
                      <CardDescription>Configure your payout preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Payout Frequency</Label>
                        <Select defaultValue="weekly">
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Minimum Payout Amount</Label>
                        <Input type="number" defaultValue="5000" className="mt-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Privacy Settings</CardTitle>
                      <CardDescription>Control your privacy and data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Profile Visibility</Label>
                          <p className="text-sm text-neutral-600">Make your profile visible to clients</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Contact Info</Label>
                          <p className="text-sm text-neutral-600">Display your contact information</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Activity Status</Label>
                          <p className="text-sm text-neutral-600">Show when you're online</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Data Analytics</Label>
                          <p className="text-sm text-neutral-600">Help improve the platform</p>
                        </div>
                        <Switch />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Account Actions</CardTitle>
                      <CardDescription>Manage your account</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          These actions are permanent and cannot be undone.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          Export My Data
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          Deactivate Account
                        </Button>
                        <Button variant="destructive" className="w-full justify-start">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
      </div>
    </div>
  );
} 