"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Edit3, 
  Save, 
  X, 
  Check, 
  MapPin,
  User,
  Mail,
  Phone,
  Settings,
  FileText,
  Globe,
  Bell,
  CreditCard,
  Shield,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { z } from "zod";

// Add this interface after the imports and before clientProfileSchema
interface ClientProfile {
  $id: string;
  name: string;
  email: string;
  bio?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  paymentPreferences?: {
    defaultPaymentMethod: string;
    autoReplenishWallet: boolean;
    minimumWalletBalance: number;
  };
}

// Validation schema for client profile
const clientProfileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  bio: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  notificationPreferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean()
  }),
  paymentPreferences: z.object({
    defaultPaymentMethod: z.string(),
    autoReplenishWallet: z.boolean(),
    minimumWalletBalance: z.number()
  })
});

type ClientProfileFormData = z.infer<typeof clientProfileSchema>;

interface EditableFieldProps {
  label: string;
  value: string | number | boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'email' | 'tel';
  options?: { value: string; label: string }[];
  icon?: React.ReactNode;
  suffix?: string;
  placeholder?: string;
}

function EditableField({
  label,
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  type = 'text',
  options = [],
  icon,
  suffix,
  placeholder
}: EditableFieldProps) {
  const [tempValue, setTempValue] = React.useState(value);

  React.useEffect(() => {
    setTempValue(value);
  }, [value, isEditing]);

  const handleSave = () => {
    onSave(tempValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 transition-colors">
      <div className="flex items-center space-x-3">
        {icon && <div className="text-neutral-500">{icon}</div>}
        <div>
          <p className="text-sm font-medium text-neutral-700">{label}</p>
          {isEditing ? (
            <div className="mt-1">
              {type === 'textarea' ? (
                <Textarea
                  value={tempValue as string}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-w-[300px]"
                  rows={3}
                  placeholder={placeholder}
                />
              ) : type === 'select' ? (
                <Select value={tempValue as string} onValueChange={setTempValue}>
                  <SelectTrigger className="min-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : type === 'boolean' ? (
                <Switch
                  checked={tempValue as boolean}
                  onCheckedChange={setTempValue}
                />
              ) : (
                <Input
                  type={type}
                  value={tempValue as string | number}
                  onChange={(e) => setTempValue(type === 'number' ? Number(e.target.value) : e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-w-[200px]"
                  placeholder={placeholder}
                />
              )}
            </div>
          ) : (
            <p className="text-neutral-900 mt-1">
              {type === 'boolean' 
                ? (value ? 'Yes' : 'No')
                : `${value || 'Not set'}${suffix || ''}`
              }
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {isEditing ? (
          <>
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ClientProfilePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [clientProfile, setClientProfile] = React.useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingFields, setEditingFields] = React.useState<Set<string>>(new Set());
  const [formData, setFormData] = React.useState<Partial<ClientProfileFormData>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Handle authentication and loading
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/client/profile");
      return;
    }

    if (user.role !== "client") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch client profile
  React.useEffect(() => {
    async function fetchClientProfile() {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
        const { Query } = await import('appwrite');
        
        const response = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          user.$id
        );
        
        setClientProfile(response as unknown as ClientProfile);
        setFormData({
          displayName: response.name || user.name,
          bio: response.bio || '',
          email: response.email,
          phone: response.phone || '',
          address: response.address || '',
          city: response.city || '',
          state: response.state || '',
          notificationPreferences: response.notificationPreferences || {
            email: true,
            push: true,
            sms: false
          },
          paymentPreferences: response.paymentPreferences || {
            defaultPaymentMethod: 'wallet',
            autoReplenishWallet: false,
            minimumWalletBalance: 1000
          }
        });
      } catch (error) {
        console.error('Error fetching client profile:', error);
        toast.error("Failed to load your profile");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (!loading && isAuthenticated && user) {
      fetchClientProfile();
    }
  }, [user, loading, isAuthenticated]);

  const handleFieldEdit = (fieldName: string) => {
    setEditingFields(prev => new Set([...prev, fieldName]));
  };

  const handleFieldSave = (fieldName: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value };
      return newData;
    });
    
    setEditingFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
    
    setHasChanges(true);
  };

  const handleFieldCancel = (fieldName: string) => {
    setEditingFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
  };

  const handleSaveAllChanges = async () => {
    if (!clientProfile || !hasChanges) return;

    try {
      setIsSaving(true);
      
      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
      
      // Prepare update data
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      // Save to backend database
      const result = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        user!.$id,
        updateData
      );

      // Update local state
      setClientProfile(prev => {
        if (!prev) return null;
        return { ...prev, ...updateData } as ClientProfile;
      });
      setHasChanges(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (loading || isLoading || !user || !clientProfile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 mb-2">
          Profile Settings
        </h1>
        <p className="text-neutral-600">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">
                  {(formData.displayName || user.name)?.charAt(0)}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-1">
                {formData.displayName || user.name}
              </h3>
              <p className="text-neutral-600 mb-4">Client</p>
              <div className="flex items-center justify-center space-x-4 text-sm text-neutral-500">
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-yellow-500" />
                  {clientProfile.rating || 'N/A'}
                </div>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Verified Account
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Display Name"
                value={formData.displayName || ''}
                isEditing={editingFields.has('displayName')}
                onEdit={() => handleFieldEdit('displayName')}
                onSave={(value) => handleFieldSave('displayName', value)}
                onCancel={() => handleFieldCancel('displayName')}
                icon={<User className="h-4 w-4" />}
                placeholder="Your display name"
              />
              <EditableField
                label="Email"
                value={formData.email || ''}
                isEditing={editingFields.has('email')}
                onEdit={() => handleFieldEdit('email')}
                onSave={(value) => handleFieldSave('email', value)}
                onCancel={() => handleFieldCancel('email')}
                type="email"
                icon={<Mail className="h-4 w-4" />}
                placeholder="your.email@example.com"
              />
              <EditableField
                label="Phone"
                value={formData.phone || ''}
                isEditing={editingFields.has('phone')}
                onEdit={() => handleFieldEdit('phone')}
                onSave={(value) => handleFieldSave('phone', value)}
                onCancel={() => handleFieldCancel('phone')}
                type="tel"
                icon={<Phone className="h-4 w-4" />}
                placeholder="+234..."
              />
              <EditableField
                label="Bio"
                value={formData.bio || ''}
                isEditing={editingFields.has('bio')}
                onEdit={() => handleFieldEdit('bio')}
                onSave={(value) => handleFieldSave('bio', value)}
                onCancel={() => handleFieldCancel('bio')}
                type="textarea"
                icon={<FileText className="h-4 w-4" />}
                placeholder="Tell us a bit about yourself..."
              />
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Address"
                value={formData.address || ''}
                isEditing={editingFields.has('address')}
                onEdit={() => handleFieldEdit('address')}
                onSave={(value) => handleFieldSave('address', value)}
                onCancel={() => handleFieldCancel('address')}
                icon={<MapPin className="h-4 w-4" />}
                placeholder="Your street address"
              />
              <EditableField
                label="City"
                value={formData.city || ''}
                isEditing={editingFields.has('city')}
                onEdit={() => handleFieldEdit('city')}
                onSave={(value) => handleFieldSave('city', value)}
                onCancel={() => handleFieldCancel('city')}
                icon={<Globe className="h-4 w-4" />}
                placeholder="Your city"
              />
              <EditableField
                label="State"
                value={formData.state || ''}
                isEditing={editingFields.has('state')}
                onEdit={() => handleFieldEdit('state')}
                onSave={(value) => handleFieldSave('state', value)}
                onCancel={() => handleFieldCancel('state')}
                icon={<Globe className="h-4 w-4" />}
                placeholder="Your state"
              />
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Email Notifications"
                value={formData.notificationPreferences?.email ?? true}
                isEditing={editingFields.has('notificationPreferences.email')}
                onEdit={() => handleFieldEdit('notificationPreferences.email')}
                onSave={(value) => handleFieldSave('notificationPreferences.email', value)}
                onCancel={() => handleFieldCancel('notificationPreferences.email')}
                type="boolean"
                icon={<Mail className="h-4 w-4" />}
              />
              <EditableField
                label="Push Notifications"
                value={formData.notificationPreferences?.push ?? true}
                isEditing={editingFields.has('notificationPreferences.push')}
                onEdit={() => handleFieldEdit('notificationPreferences.push')}
                onSave={(value) => handleFieldSave('notificationPreferences.push', value)}
                onCancel={() => handleFieldCancel('notificationPreferences.push')}
                type="boolean"
                icon={<Bell className="h-4 w-4" />}
              />
              <EditableField
                label="SMS Notifications"
                value={formData.notificationPreferences?.sms ?? false}
                isEditing={editingFields.has('notificationPreferences.sms')}
                onEdit={() => handleFieldEdit('notificationPreferences.sms')}
                onSave={(value) => handleFieldSave('notificationPreferences.sms', value)}
                onCancel={() => handleFieldCancel('notificationPreferences.sms')}
                type="boolean"
                icon={<Phone className="h-4 w-4" />}
              />
            </CardContent>
          </Card>

          {/* Payment Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Default Payment Method"
                value={formData.paymentPreferences?.defaultPaymentMethod || 'wallet'}
                isEditing={editingFields.has('paymentPreferences.defaultPaymentMethod')}
                onEdit={() => handleFieldEdit('paymentPreferences.defaultPaymentMethod')}
                onSave={(value) => handleFieldSave('paymentPreferences.defaultPaymentMethod', value)}
                onCancel={() => handleFieldCancel('paymentPreferences.defaultPaymentMethod')}
                type="select"
                options={[
                  { value: 'wallet', label: 'Wallet' },
                  { value: 'card', label: 'Card' },
                  { value: 'bank', label: 'Bank Transfer' }
                ]}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <EditableField
                label="Auto-Replenish Wallet"
                value={formData.paymentPreferences?.autoReplenishWallet ?? false}
                isEditing={editingFields.has('paymentPreferences.autoReplenishWallet')}
                onEdit={() => handleFieldEdit('paymentPreferences.autoReplenishWallet')}
                onSave={(value) => handleFieldSave('paymentPreferences.autoReplenishWallet', value)}
                onCancel={() => handleFieldCancel('paymentPreferences.autoReplenishWallet')}
                type="boolean"
                icon={<Settings className="h-4 w-4" />}
              />
              <EditableField
                label="Minimum Wallet Balance"
                value={formData.paymentPreferences?.minimumWalletBalance || 1000}
                isEditing={editingFields.has('paymentPreferences.minimumWalletBalance')}
                onEdit={() => handleFieldEdit('paymentPreferences.minimumWalletBalance')}
                onSave={(value) => handleFieldSave('paymentPreferences.minimumWalletBalance', value)}
                onCancel={() => handleFieldCancel('paymentPreferences.minimumWalletBalance')}
                type="number"
                suffix=" ₦"
                icon={<CreditCard className="h-4 w-4" />}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Changes Button */}
      <div className="flex justify-end sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
        <Button
          onClick={handleSaveAllChanges}
          disabled={!hasChanges || isSaving}
          size="lg"
          className={`${hasChanges ? 'bg-[#16a34a] hover:bg-[#15803d]' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
