"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Edit3, 
  Save, 
  X, 
  Check, 
  MapPin, 
  DollarSign, 
  Clock, 
  Star,
  User,
  Briefcase,
  Settings,
  FileText,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { z } from "zod";
import type { WorkerProfile } from "@/lib/types/marketplace";
import { SERVICE_CATEGORIES, EXPERIENCE_LEVELS } from "@/lib/constants";

// Validation schema for worker profile
const workerProfileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  hourlyRate: z.number().min(5, "Hourly rate must be at least ₦5"),
  experienceYears: z.number().min(0, "Experience years cannot be negative"),
  maxRadiusKm: z.number().min(1, "Service radius must be at least 1km"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  workingHoursStart: z.string(),
  workingHoursEnd: z.string(),
  acceptsLastMinute: z.boolean(),
  acceptsWeekends: z.boolean(),
});

type WorkerProfileFormData = z.infer<typeof workerProfileSchema>;

interface EditableFieldProps {
  label: string;
  value: string | number | boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  icon?: React.ReactNode;
  suffix?: string;
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
  suffix
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
                />
              )}
            </div>
          ) : (
            <p className="text-neutral-900 mt-1">
              {type === 'boolean' 
                ? (value ? 'Yes' : 'No')
                : `${value}${suffix || ''}`
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

export default function WorkerProfilePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [workerProfile, setWorkerProfile] = React.useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingFields, setEditingFields] = React.useState<Set<string>>(new Set());
  const [formData, setFormData] = React.useState<Partial<WorkerProfileFormData>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Handle authentication and loading
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/profile");
      return;
    }

    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }

    if (!user.isOnboarded) {
      router.replace("/onboarding");
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch worker profile
  React.useEffect(() => {
    async function fetchWorkerProfile() {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
        const { Query } = await import('appwrite');
        
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.WORKERS,
          [Query.equal('userId', user.$id)]
        );
        
        if (response.documents.length > 0) {
          const profile = response.documents[0] as unknown as WorkerProfile;
          setWorkerProfile(profile);
          setFormData({
            displayName: profile.displayName || user.name,
            bio: profile.bio,
            hourlyRate: profile.hourlyRate,
            experienceYears: profile.experienceYears,
            maxRadiusKm: profile.maxRadiusKm,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            workingHoursStart: profile.workingHoursStart,
            workingHoursEnd: profile.workingHoursEnd,
            acceptsLastMinute: profile.acceptsLastMinute,
            acceptsWeekends: profile.acceptsWeekends,
          });
        }
      } catch (error) {
        console.error('Error fetching worker profile:', error);
        toast.error("Failed to load your profile");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (!loading && isAuthenticated && user) {
      fetchWorkerProfile();
    }
  }, [user, loading, isAuthenticated]);

  // Handle responsive sidebar behavior
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFieldEdit = (fieldName: string) => {
    setEditingFields(prev => new Set([...prev, fieldName]));
  };

  const handleFieldSave = (fieldName: string, value: any) => {
    console.log(`Saving field ${fieldName} with value:`, value);
    
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value };
      console.log('New form data:', newData);
      return newData;
    });
    
    setEditingFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
    
    setHasChanges(true);
    console.log('hasChanges set to true');
  };

  const handleFieldCancel = (fieldName: string) => {
    setEditingFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
  };

  const handleSaveAllChanges = async () => {
    if (!workerProfile || !hasChanges) {
      console.log('No changes to save or no worker profile');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving changes:', formData);
      
      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
      
      // Prepare update data - only include changed fields
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      console.log('Update data:', updateData);
      console.log('Worker profile ID:', (workerProfile as any).$id);

      // Save to backend database
      const result = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        (workerProfile as any).$id,
        updateData
      );

      console.log('Update result:', result);

      // Update local state after successful save
      setWorkerProfile(prev => prev ? { ...prev, ...updateData } : null);
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
  if (loading || isLoading || !user || !workerProfile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex">
        <WorkerSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 flex flex-col lg:ml-0">
          <Header>
            <SidebarToggle onToggle={() => setSidebarOpen(!sidebarOpen)} />
          </Header>
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  // Ensure user is a worker
  if (user.role !== "worker") {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
       

      <div className="flex-1 flex flex-col lg:ml-0">
         
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                Profile Settings
              </h1>
              <p className="text-neutral-600">
                Manage your professional profile and preferences
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Overview */}
              <div className="lg:col-span-1">
                <Card variant="elevated">
                  <CardContent className="p-6 text-center">
                    <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-2xl">
                        {(formData.displayName || user.name)?.charAt(0)}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-1">
                      {formData.displayName || user.name}
                    </h3>
                    <p className="text-neutral-600 mb-4">Professional Worker</p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-neutral-500">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-500" />
                        {workerProfile.ratingAverage || 0}
                      </div>
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-1" />
                        {workerProfile.completedJobs || 0} jobs
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Profile Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information */}
                <Card variant="elevated">
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
                    />
                  </CardContent>
                </Card>

                {/* Location */}
                <Card variant="elevated">
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
                    />
                    <EditableField
                      label="City"
                      value={formData.city || ''}
                      isEditing={editingFields.has('city')}
                      onEdit={() => handleFieldEdit('city')}
                      onSave={(value) => handleFieldSave('city', value)}
                      onCancel={() => handleFieldCancel('city')}
                      icon={<Globe className="h-4 w-4" />}
                    />
                    <EditableField
                      label="State"
                      value={formData.state || ''}
                      isEditing={editingFields.has('state')}
                      onEdit={() => handleFieldEdit('state')}
                      onSave={(value) => handleFieldSave('state', value)}
                      onCancel={() => handleFieldCancel('state')}
                      icon={<Globe className="h-4 w-4" />}
                    />
                    <EditableField
                      label="Service Radius"
                      value={formData.maxRadiusKm || 0}
                      isEditing={editingFields.has('maxRadiusKm')}
                      onEdit={() => handleFieldEdit('maxRadiusKm')}
                      onSave={(value) => handleFieldSave('maxRadiusKm', value)}
                      onCancel={() => handleFieldCancel('maxRadiusKm')}
                      type="number"
                      suffix=" km"
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </CardContent>
                </Card>

                {/* Professional Details */}
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Professional Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <EditableField
                      label="Hourly Rate"
                      value={formData.hourlyRate || 0}
                      isEditing={editingFields.has('hourlyRate')}
                      onEdit={() => handleFieldEdit('hourlyRate')}
                      onSave={(value) => handleFieldSave('hourlyRate', value)}
                      onCancel={() => handleFieldCancel('hourlyRate')}
                      type="number"
                      suffix=" ₦/hr"
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                    <EditableField
                      label="Years of Experience"
                      value={formData.experienceYears || 0}
                      isEditing={editingFields.has('experienceYears')}
                      onEdit={() => handleFieldEdit('experienceYears')}
                      onSave={(value) => handleFieldSave('experienceYears', value)}
                      onCancel={() => handleFieldCancel('experienceYears')}
                      type="number"
                      suffix=" years"
                      icon={<Star className="h-4 w-4" />}
                    />
                  </CardContent>
                </Card>

                {/* Availability */}
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Availability
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <EditableField
                      label="Working Hours Start"
                      value={formData.workingHoursStart || ''}
                      isEditing={editingFields.has('workingHoursStart')}
                      onEdit={() => handleFieldEdit('workingHoursStart')}
                      onSave={(value) => handleFieldSave('workingHoursStart', value)}
                      onCancel={() => handleFieldCancel('workingHoursStart')}
                      icon={<Clock className="h-4 w-4" />}
                    />
                    <EditableField
                      label="Working Hours End"
                      value={formData.workingHoursEnd || ''}
                      isEditing={editingFields.has('workingHoursEnd')}
                      onEdit={() => handleFieldEdit('workingHoursEnd')}
                      onSave={(value) => handleFieldSave('workingHoursEnd', value)}
                      onCancel={() => handleFieldCancel('workingHoursEnd')}
                      icon={<Clock className="h-4 w-4" />}
                    />
                    <EditableField
                      label="Accepts Last Minute Bookings"
                      value={formData.acceptsLastMinute ?? false}
                      isEditing={editingFields.has('acceptsLastMinute')}
                      onEdit={() => handleFieldEdit('acceptsLastMinute')}
                      onSave={(value) => handleFieldSave('acceptsLastMinute', value)}
                      onCancel={() => handleFieldCancel('acceptsLastMinute')}
                      type="boolean"
                      icon={<Clock className="h-4 w-4" />}
                    />
                    <EditableField
                      label="Accepts Weekend Bookings"
                      value={formData.acceptsWeekends ?? false}
                      isEditing={editingFields.has('acceptsWeekends')}
                      onEdit={() => handleFieldEdit('acceptsWeekends')}
                      onSave={(value) => handleFieldSave('acceptsWeekends', value)}
                      onCancel={() => handleFieldCancel('acceptsWeekends')}
                      type="boolean"
                      icon={<Clock className="h-4 w-4" />}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Save Changes Button - Always visible */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSaveAllChanges}
                disabled={!hasChanges || isSaving}
                size="lg"
                className={`shadow-lg ${hasChanges ? 'bg-[#16a34a] hover:bg-[#15803d]' : 'bg-gray-400 cursor-not-allowed'}`}
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
        </main>
        
      </div>
    </div>
  );
} 