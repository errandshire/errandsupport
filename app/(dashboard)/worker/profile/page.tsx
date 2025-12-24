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
  Globe,
  Camera,
  Upload,
  Shield
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
import { SERVICE_CATEGORIES, EXPERIENCE_LEVELS, ID_TYPES } from "@/lib/constants";
import { DocumentUpload } from "@/components/forms/document-upload";
import { EditableLocationField } from "@/components/forms/editable-location-field";
import { joinDocumentUrls, parseDocumentUrls } from "@/lib/utils";

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
  const [hasProfileChanges, setHasProfileChanges] = React.useState(false);
  const [hasDocumentChanges, setHasDocumentChanges] = React.useState(false);

  // Document upload states
  const [idType, setIdType] = React.useState<string>("");
  const [idNumber, setIdNumber] = React.useState<string>("");
  const [idDocumentUrl, setIdDocumentUrl] = React.useState<string>("");
  const [selfieWithIdUrl, setSelfieWithIdUrl] = React.useState<string>("");
  const [additionalDocuments, setAdditionalDocuments] = React.useState<string[]>([]);
  const [idDocumentFile, setIdDocumentFile] = React.useState<File | null>(null);
  const [selfieWithIdFile, setSelfieWithIdFile] = React.useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState<{ idDocument: boolean; selfieWithId: boolean }>({
    idDocument: false,
    selfieWithId: false
  });
  const [isUploadingDocuments, setIsUploadingDocuments] = React.useState(false);

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
            experienceYears: profile.experience,
            maxRadiusKm: profile.serviceRadius,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            workingHoursStart: profile.workingHoursStart,
            workingHoursEnd: profile.workingHoursEnd,
            acceptsLastMinute: profile.acceptsLastMinute || false,
            acceptsWeekends: profile.acceptsWeekends || false,
          });

          // Load existing verification documents
          const profileAny = profile as any;
          if (profileAny.idType) setIdType(profileAny.idType);
          if (profileAny.idNumber) setIdNumber(profileAny.idNumber);
          if (profileAny.idDocument) setIdDocumentUrl(profileAny.idDocument);
          if (profileAny.selfieWithId) setSelfieWithIdUrl(profileAny.selfieWithId);
          if (profileAny.additionalDocuments) {
            setAdditionalDocuments(parseDocumentUrls(profileAny.additionalDocuments));
          }
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
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value };
      return newData;
    });

    setEditingFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });

    setHasProfileChanges(true);
  };

  const handleFieldCancel = (fieldName: string) => {
    setEditingFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
  };

  const handleSaveAllChanges = async () => {
    if (!workerProfile || !hasProfileChanges) {
      return;
    }

    try {
      setIsSaving(true);
      
      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
      
      // Prepare update data - only include changed fields
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      
      // Save to backend database
      const result = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        (workerProfile as any).$id,
        updateData
      );


      // Update local state after successful save
      setWorkerProfile(prev => prev ? { ...prev, ...updateData } : null);
      setHasProfileChanges(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Document upload helpers
  const uploadFileToStorage = async (file: File): Promise<string> => {
    try {
      const { storage, STORAGE_BUCKET_ID } = await import('@/lib/appwrite');
      const { ID } = await import('appwrite');

      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(STORAGE_BUCKET_ID, fileId, file);

      const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, uploadedFile.$id);
      return fileUrl.toString();
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  };

  const handleIdDocumentUpload = async (files: File[]): Promise<string[]> => {
    const file = files[0];
    if (!file) return [];
    if (idDocumentUrl.startsWith('blob:')) URL.revokeObjectURL(idDocumentUrl);
    const previewUrl = URL.createObjectURL(file);
    setIdDocumentFile(file);
    setIdDocumentUrl(previewUrl);
    setHasDocumentChanges(true);
    return [previewUrl];
  };

  const handleSelfieWithIdUpload = async (files: File[]): Promise<string[]> => {
    const file = files[0];
    if (!file) return [];
    if (selfieWithIdUrl.startsWith('blob:')) URL.revokeObjectURL(selfieWithIdUrl);
    const previewUrl = URL.createObjectURL(file);
    setSelfieWithIdFile(file);
    setSelfieWithIdUrl(previewUrl);
    setHasDocumentChanges(true);
    return [previewUrl];
  };

  const handleAdditionalDocumentsUpload = async (files: File[]): Promise<string[]> => {
    const previews: string[] = [];
    const adds: File[] = [];
    files.forEach(f => {
      adds.push(f);
      previews.push(URL.createObjectURL(f));
    });
    setAdditionalFiles(prev => [...prev, ...adds]);
    setAdditionalDocuments(prev => [...prev, ...previews]);
    setHasDocumentChanges(true);
    return previews;
  };

  const removeIdDocument = () => {
    setIdDocumentUrl("");
    setIdDocumentFile(null);
    setHasDocumentChanges(true);
  };

  const removeSelfieWithId = () => {
    setSelfieWithIdUrl("");
    setSelfieWithIdFile(null);
    setHasDocumentChanges(true);
  };

  const removeAdditionalDocument = (url: string) => {
    setAdditionalDocuments(prev => {
      const index = prev.indexOf(url);
      const next = prev.filter(doc => doc !== url);
      if (index > -1) setAdditionalFiles(files => files.filter((_, i) => i !== index));
      return next;
    });
    setHasDocumentChanges(true);
  };

  const handleSaveDocuments = async () => {
    if (!workerProfile) return;

    try {
      setIsUploadingDocuments(true);

      // Upload files
      const [finalIdUrl, finalSelfieUrl] = await Promise.all([
        idDocumentFile ? uploadFileToStorage(idDocumentFile) : Promise.resolve(idDocumentUrl),
        selfieWithIdFile ? uploadFileToStorage(selfieWithIdFile) : Promise.resolve(selfieWithIdUrl)
      ]);

      // Upload additional files if any local files exist
      let additionalUrls = additionalDocuments.filter(url => !url.startsWith('blob:'));
      if (additionalFiles.length > 0) {
        const uploaded = await Promise.all(additionalFiles.map(uploadFileToStorage));
        additionalUrls = [...additionalUrls, ...uploaded];
      }

      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        (workerProfile as any).$id,
        {
          idType: idType,
          idNumber: idNumber,
          idDocument: finalIdUrl,
          selfieWithId: finalSelfieUrl,
          additionalDocuments: joinDocumentUrls(additionalUrls),
          verificationStatus: 'pending',
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      // Update local state with actual URLs
      setIdDocumentUrl(finalIdUrl);
      setSelfieWithIdUrl(finalSelfieUrl);
      setAdditionalDocuments(additionalUrls);
      setIdDocumentFile(null);
      setSelfieWithIdFile(null);
      setAdditionalFiles([]);

      // Notify all admins about the document submission
      try {
        const { Query } = await import('appwrite');
        const { notificationService } = await import('@/lib/notification-service');

        // Fetch all admin users
        const adminUsers = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USERS,
          [Query.equal('role', 'admin'), Query.limit(50)]
        );

        const workerName = (workerProfile as any).displayName || user?.name || 'A worker';

        // Send in-app notification to each admin
        await Promise.all(
          adminUsers.documents.map(admin =>
            notificationService.createNotification({
              userId: admin.$id,
              title: 'New Document Submission',
              message: `${workerName} has submitted/updated their verification documents. Please review.`,
              type: 'info',
              actionUrl: '/admin/users'
            })
          )
        );

        // Send email notification to admins
        const adminEmails = adminUsers.documents
          .map((admin: any) => admin.email)
          .filter(Boolean);

        if (adminEmails.length > 0) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: adminEmails,
              subject: `New Document Submission - ${workerName}`,
              html: `
                <h2>New Verification Document Submission</h2>
                <p><strong>${workerName}</strong> has submitted/updated their verification documents.</p>
                <p><strong>ID Type:</strong> ${idType}</p>
                <p><strong>ID Number:</strong> ${idNumber}</p>
                <p>Please review the documents in the admin dashboard.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://erandwork.com'}/admin/users" style="display:inline-block;padding:10px 20px;background-color:#16a34a;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">Review Documents</a>
              `
            })
          });
        }

        console.log('Admin notifications sent successfully');
      } catch (notifyError) {
        console.error('Failed to notify admins:', notifyError);
        // Don't fail the main operation if notification fails
      }

      toast.success('Verification documents submitted successfully!');
      setHasDocumentChanges(false);
    } catch (error) {
      console.error('Error saving documents:', error);
      toast.error('Failed to save verification documents');
    } finally {
      setIsUploadingDocuments(false);
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
                    <EditableLocationField
                      label="Location"
                      stateValue={formData.state || ''}
                      cityValue={formData.city || ''}
                      isEditing={editingFields.has('location')}
                      onEdit={() => handleFieldEdit('location')}
                      onSave={(state, city) => {
                        handleFieldSave('state', state);
                        handleFieldSave('city', city);
                        setEditingFields(prev => {
                          const newSet = new Set(prev);
                          newSet.delete('location');
                          return newSet;
                        });
                      }}
                      onCancel={() => handleFieldCancel('location')}
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
                {/* Save Changes Button - For profile info only */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSaveAllChanges}
                disabled={!hasProfileChanges || isSaving}
                size="lg"
                className={`shadow-lg ${hasProfileChanges ? 'bg-[#16a34a] hover:bg-[#15803d]' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

                {/* Verification Documents */}
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Verification Documents
                    </CardTitle>
                    <CardDescription>
                      Upload your verification documents to get verified and receive more bookings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Verification Status */}
                    {(workerProfile as any)?.verificationStatus && (
                      <div className={`p-4 rounded-lg ${
                        (workerProfile as any).verificationStatus === 'verified'
                          ? 'bg-green-50 border border-green-200'
                          : (workerProfile as any).verificationStatus === 'rejected'
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-yellow-50 border border-yellow-200'
                      }`}>
                        <p className={`text-sm font-medium ${
                          (workerProfile as any).verificationStatus === 'verified'
                            ? 'text-green-800'
                            : (workerProfile as any).verificationStatus === 'rejected'
                            ? 'text-red-800'
                            : 'text-yellow-800'
                        }`}>
                          Status: {(workerProfile as any).verificationStatus === 'verified'
                            ? '✅ Verified'
                            : (workerProfile as any).verificationStatus === 'rejected'
                            ? '❌ Rejected'
                            : '⏳ Pending Review'}
                        </p>
                        {(workerProfile as any).rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">
                            Reason: {(workerProfile as any).rejectionReason}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ID Type */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        ID Type <span className="text-red-500">*</span>
                      </label>
                      <Select value={idType} onValueChange={(value) => { setIdType(value); setHasDocumentChanges(true); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your ID type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ID_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ID Number */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        ID Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={idNumber}
                        onChange={(e) => { setIdNumber(e.target.value); setHasDocumentChanges(true); }}
                        placeholder="Enter your ID number"
                      />
                    </div>

                    {/* ID Document Upload */}
                    <DocumentUpload
                      title="ID Document"
                      description="Upload a clear photo of your ID document (front side)"
                      required
                      acceptedTypes={['image/jpeg', 'image/png', 'image/jpg']}
                      maxSize={5}
                      maxFiles={1}
                      onUpload={handleIdDocumentUpload}
                      onRemove={removeIdDocument}
                      uploadedFiles={idDocumentUrl ? [idDocumentUrl] : []}
                      uploading={uploading.idDocument}
                      icon={<FileText className="h-8 w-8" />}
                    />

                    {/* Selfie with ID Upload */}
                    <DocumentUpload
                      title="Selfie with ID"
                      description="Take a selfie holding your ID document next to your face"
                      required
                      acceptedTypes={['image/jpeg', 'image/png', 'image/jpg']}
                      maxSize={5}
                      maxFiles={1}
                      onUpload={handleSelfieWithIdUpload}
                      onRemove={removeSelfieWithId}
                      uploadedFiles={selfieWithIdUrl ? [selfieWithIdUrl] : []}
                      uploading={uploading.selfieWithId}
                      icon={<Camera className="h-8 w-8" />}
                    />

                    {/* Additional Documents Upload */}
                    <DocumentUpload
                      title="Additional Documents (Optional)"
                      description="Upload any additional verification documents (certificates, references, etc.)"
                      acceptedTypes={['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']}
                      maxSize={5}
                      maxFiles={3}
                      onUpload={handleAdditionalDocumentsUpload}
                      onRemove={removeAdditionalDocument}
                      uploadedFiles={additionalDocuments}
                      icon={<Upload className="h-8 w-8" />}
                    />

                    {/* Photo Guidelines */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="font-medium text-amber-900 mb-2">Photo Guidelines</h4>
                      <ul className="text-sm text-amber-700 space-y-1">
                        <li>• Ensure good lighting and clear visibility</li>
                        <li>• All text on documents should be readable</li>
                        <li>• Avoid glare, shadows, or blurry images</li>
                        <li>• For selfie: hold ID next to your face, both should be clearly visible</li>
                      </ul>
                    </div>

                    {/* Save Documents Button */}
                    <Button
                      onClick={handleSaveDocuments}
                      disabled={
                        isUploadingDocuments ||
                        !idType ||
                        !idNumber ||
                        !idDocumentUrl ||
                        !selfieWithIdUrl
                      }
                      className="w-full"
                    >
                      {isUploadingDocuments ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Uploading Documents...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Submit Verification Documents
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            
          </div>
        </main>
        
      </div>
    </div>
  );
} 