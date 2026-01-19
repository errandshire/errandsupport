"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Upload, MapPin, DollarSign, Clock, Star, X, Camera, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { DocumentUpload } from "@/components/forms/document-upload";
import { LocationSelect } from "@/components/forms/location-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { SERVICE_CATEGORIES, EXPERIENCE_LEVELS, ID_TYPES } from "@/lib/constants";
import { clientProfileSchema, onboardingWorkerProfileSchema, onboardingVerificationSchema } from "@/lib/validations";
import { cn, joinDocumentUrls } from "@/lib/utils";
import { toast } from "sonner";

interface OnboardingStep {
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());
  // Store Step 2 (Professional Details) data to be used in Step 3
  const [professionalData, setProfessionalData] = React.useState<any>(null);

  // Handle authentication and loading
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/onboarding");
      return;
    }

    // If user is already onboarded, redirect to their dashboard
    if (user.isOnboarded) {
      router.replace(`/${user.role}`);
      return;
    }

    // If user is not a worker, redirect to their dashboard
    if (user.role !== 'worker') {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  // Show loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // If not a worker or already onboarded, return null (will be redirected)
  if (user.role !== 'worker' || user.isOnboarded) {
    return null;
  }
  
  const steps: OnboardingStep[] = [
    {
      title: "Personal Information",
      description: "Tell us a bit about yourself",
      component: PersonalInfoStep,
    },
    ...(user.role === "worker"
      ? [
          {
            title: "Professional Details",
            description: "Set up your service profile",
            component: WorkerProfileStep,
          },
          {
            title: "Verification",
            description: "Verify your identity for trust and safety",
            component: VerificationStep,
          },
        ]
      : []),
    {
      title: "Complete Setup",
      description: "You're all set! Let's get started",
      component: CompletionStep,
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            Welcome to Errand Support, {user?.name}!
          </h1>
          <p className="text-neutral-600">
            Let's set up your {user.role === "worker" ? "worker" : "client"} profile
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium text-neutral-600 mb-2">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-col items-center text-center flex-1",
                  index < steps.length - 1 && "border-r border-neutral-200 mr-4 pr-4"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2",
                    index < currentStep || completedSteps.has(index)
                      ? "bg-primary-500 text-white"
                      : index === currentStep
                      ? "bg-primary-100 text-primary-600 border-2 border-primary-500"
                      : "bg-neutral-200 text-neutral-500"
                  )}
                >
                  {index + 1}
                </div>
                <div className="text-xs font-medium text-neutral-900">{step.title}</div>
                <div className="text-xs text-neutral-500 hidden sm:block">{step.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card variant="elevated" className="shadow-hover">
          <CardHeader>
            <CardTitle className="text-2xl font-serif">
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription>
              {steps[currentStep].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CurrentStepComponent
              user={user}
              updateProfile={updateProfile}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstStep={currentStep === 0}
              isLastStep={currentStep === steps.length - 1}
              router={router}
              professionalData={professionalData}
              setProfessionalData={setProfessionalData}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Personal Information Step
function PersonalInfoStep({ user, updateProfile, onNext }: any) {
  const router = useRouter();
  const [selectedState, setSelectedState] = React.useState(user?.state || "");
  const [selectedCity, setSelectedCity] = React.useState(user?.city || "");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      postalCode: user.postalCode || "",
      country: user.country || "Nigeria",
    },
  });

  // Load existing location values on mount
  React.useEffect(() => {
    if (user?.state) {
      setSelectedState(user.state);
      setValue("state", user.state);
    }
    if (user?.city) {
      setSelectedCity(user.city);
      setValue("city", user.city);
    }
  }, [user, setValue]);

  // Sync form values with location selects
  React.useEffect(() => {
    setValue("state", selectedState);
    setValue("city", selectedCity);
  }, [selectedState, selectedCity, setValue]);

  const onSubmit = async (data: any) => {
    const result = await updateProfile(data);
    if (result.success) {
      onNext();
    }
  };

  const handleBack = () => {
    // Since this is the first step, go back to the dashboard or previous page
    router.back();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          {...register("name")}
          label="Full Name"
          error={errors.name?.message}
          disabled={isSubmitting}
          required
        />
        <FormInput
          {...register("phone")}
          label="Phone Number"
          error={errors.phone?.message}
          disabled={isSubmitting}
        />
      </div>

      <FormInput
        {...register("address")}
        label="Street Address"
        error={errors.address?.message}
        disabled={isSubmitting}
      />

      <LocationSelect
        selectedState={selectedState}
        selectedCity={selectedCity}
        onStateChange={(state) => {
          setSelectedState(state);
          setValue("state", state);
        }}
        onCityChange={(city) => {
          setSelectedCity(city);
          setValue("city", city);
        }}
        stateLabel="State"
        cityLabel="City"
        stateError={errors.state?.message}
        cityError={errors.city?.message}
        disabled={isSubmitting}
        stateRequired
        cityRequired
      />

      <FormInput
        {...register("postalCode")}
        label="Postal Code (Optional)"
        error={errors.postalCode?.message}
        disabled={isSubmitting}
      />

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Continue"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// Worker Profile Step
function WorkerProfileStep({ user, updateProfile, onNext, onPrevious, setProfessionalData }: any) {
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    resolver: zodResolver(onboardingWorkerProfileSchema),
    defaultValues: {
      bio: "",
      experience: 0,
      hourlyRate: 25,
      serviceRadius: 10,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      // Store professional data in state to be used in Step 3
      // DO NOT create WORKERS profile yet - wait until verification documents are uploaded
      const workerProfileData = {
        userId: user.$id,
        // Copy registration data from USERS to WORKERS
        email: user.email,
        phone: user.phone || '',
        name: user.name || '',
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        displayName: user.name || 'Worker',
        bio: data.bio,
        // Flatten experience
        experienceYears: data.experience,
        experienceDescription: `${data.experience} years of experience`,
        // Flatten pricing
        hourlyRate: data.hourlyRate,
        minimumHours: 1,
        currency: "NGN",
        // Arrays are supported
        categories: selectedCategories,
        skills: [],

        // Flatten availability
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        workingHoursStart: "09:00",
        workingHoursEnd: "17:00",
        timezone: "Africa/Lagos",
        // Flatten verification
        isVerified: false,
        idVerified: false,
        backgroundCheckVerified: false,
        // Flatten rating
        ratingAverage: 0,
        totalReviews: 0,
        // Flatten stats
        completedJobs: 0,
        responseTimeMinutes: 0,
        rehireRatePercent: 0,
        // Flatten preferences
        maxRadiusKm: data.serviceRadius,
        acceptsLastMinute: true,
        acceptsWeekends: false,
        // Status
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store the data for Step 3 to use
      setProfessionalData(workerProfileData);

      // Update user profile with worker-specific data (in USERS collection)
      const profileData = {
        ...data,
        categories: selectedCategories,
        // Don't mark as onboarded yet - wait for verification step
        isOnboarded: false,
      };

      const result = await updateProfile(profileData);

      if (result.success) {
        toast.success("Professional details saved! Next, upload verification documents.");
        onNext();
      } else {
        console.error('Profile update failed:', result.error);
        toast.error("Failed to save professional details");
      }
    } catch (error) {
      console.error('Error saving worker profile:', error);
      toast.error("Failed to save professional details");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Professional Bio
        </label>
        <Textarea
          {...register("bio")}
          placeholder="Tell clients about your experience and what makes you great at what you do..."
          rows={4}
          error={errors.bio?.message}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Years of Experience
          </label>
          <Select onValueChange={(value) => setValue("experience", parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select experience level" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value.toString()}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FormInput
          {...register("hourlyRate", { valueAsNumber: true })}
          type="number"
          label="Hourly Rate (₦)"
          min={5}
          max={5000}
          error={errors.hourlyRate?.message}
          disabled={isSubmitting}
          startIcon={<span className="text-neutral-500 font-medium">₦</span>}
          required
        />
      </div>

      <FormInput
        {...register("serviceRadius", { valueAsNumber: true })}
        type="number"
        label="Service Radius (km)"
        min={1}
        max={100}
        error={errors.serviceRadius?.message}
        disabled={isSubmitting}
        startIcon={<MapPin className="h-4 w-4" />}
        required
      />

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Service Categories
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SERVICE_CATEGORIES.map((category) => (
            <div
              key={category.id}
              className={cn(
                "p-3 rounded-xl border-2 cursor-pointer transition-all",
                selectedCategories.includes(category.id)
                  ? "border-primary-500 bg-green-200 "
                  : "border-neutral-200 hover:border-primary-300"
              )}
              onClick={() => {
                setSelectedCategories(prev =>
                  prev.includes(category.id)
                    ? prev.filter(id => id !== category.id)
                    : [...prev, category.id]
                );
              }}
            >
              <div className="text-lg mb-1">{category.icon}</div>
              <div className="text-sm font-medium">{category.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrevious}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting || selectedCategories.length === 0}>
          {isSubmitting ? "Saving..." : "Continue"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// Verification Step
function VerificationStep({ user, onNext, onPrevious, updateProfile, professionalData }: any) {
  // Preview URLs for UI; actual uploads will happen on submit
  const [idDocumentUrl, setIdDocumentUrl] = React.useState<string>("");
  const [selfieWithIdUrl, setSelfieWithIdUrl] = React.useState<string>("");
  const [additionalDocuments, setAdditionalDocuments] = React.useState<string[]>([]);
  // Hold File objects locally until submit
  const [idDocumentFile, setIdDocumentFile] = React.useState<File | null>(null);
  const [selfieWithIdFile, setSelfieWithIdFile] = React.useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState<{idDocument: boolean, selfieWithId: boolean}>({
    idDocument: false,
    selfieWithId: false
  });
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(onboardingVerificationSchema),
  });

  // Watch ID type and ID number for button validation
  const idType = watch("idType");
  const idNumber = watch("idNumber");

  // Register form fields that are updated programmatically
  React.useEffect(() => {
    // Ensure these fields exist in the form state so setValue validates properly
    // We deliberately don't set defaults here to avoid premature validation failures
    // Hidden inputs are not necessary if we register programmatically
    (register as any)("idType");
    (register as any)("idDocument");
    (register as any)("selfieWithId");
    (register as any)("additionalDocuments");
    // combined helper not persisted to DB
  }, [register]);

  const uploadFileToStorage = async (file: File): Promise<string> => {
    try {
      const { storage, STORAGE_BUCKET_ID } = await import('@/lib/appwrite');
      const { ID } = await import('appwrite');
      
      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(STORAGE_BUCKET_ID, fileId, file);
      
      // Get file URL
      const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, uploadedFile.$id);
      return fileUrl.toString();
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  };

  const handleIdDocumentUpload = async (files: File[]): Promise<string[]> => {
    // Do not upload now; just store locally and create preview URL
    const file = files[0];
    if (!file) return [];
    // Revoke existing preview to avoid leaks
    if (idDocumentUrl.startsWith('blob:')) URL.revokeObjectURL(idDocumentUrl);
    const previewUrl = URL.createObjectURL(file);
    setIdDocumentFile(file);
    setIdDocumentUrl(previewUrl);
    setValue("idDocument", previewUrl, { shouldValidate: true, shouldDirty: true });
    return [previewUrl];
  };

  const handleSelfieWithIdUpload = async (files: File[]): Promise<string[]> => {
    const file = files[0];
    if (!file) return [];
    if (selfieWithIdUrl.startsWith('blob:')) URL.revokeObjectURL(selfieWithIdUrl);
    const previewUrl = URL.createObjectURL(file);
    setSelfieWithIdFile(file);
    setSelfieWithIdUrl(previewUrl);
    setValue("selfieWithId", previewUrl, { shouldValidate: true, shouldDirty: true });
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
    setAdditionalDocuments(prev => {
      const next = [...prev, ...previews];
      setValue("additionalDocuments", joinDocumentUrls(next), { shouldValidate: false, shouldDirty: true });
      return next;
    });
    return previews;
  };

  const removeIdDocument = () => {
    setIdDocumentUrl("");
    setValue("idDocument", "", { shouldValidate: true, shouldDirty: true });
    setIdDocumentFile(null);
  };

  const removeSelfieWithId = () => {
    setSelfieWithIdUrl("");
    setValue("selfieWithId", "", { shouldValidate: true, shouldDirty: true });
    setSelfieWithIdFile(null);
  };

  const removeAdditionalDocument = (url: string) => {
    setAdditionalDocuments(prev => {
      const index = prev.indexOf(url);
      const next = prev.filter(doc => doc !== url);
      if (index > -1) setAdditionalFiles(files => files.filter((_, i) => i !== index));
      setValue("additionalDocuments", joinDocumentUrls(next), { shouldValidate: false, shouldDirty: true });
      return next;
    });
  };

  const onSubmit = async () => {
    try {
      if (!idDocumentUrl || !selfieWithIdUrl) {
        toast.error('Please upload both ID document and selfie with ID');
        return;
      }

      if (!professionalData) {
        toast.error('Professional details are missing. Please go back and complete Step 2.');
        return;
      }

      // Upload files now (deferred upload)
      setUploading({ idDocument: true, selfieWithId: true });
      const [finalIdUrl, finalSelfieUrl] = await Promise.all([
        idDocumentFile ? uploadFileToStorage(idDocumentFile) : Promise.resolve(idDocumentUrl),
        selfieWithIdFile ? uploadFileToStorage(selfieWithIdFile) : Promise.resolve(selfieWithIdUrl)
      ]);
      setUploading({ idDocument: false, selfieWithId: false });

      // Upload additional files if any local files exist
      let additionalUrls = additionalDocuments;
      if (additionalFiles.length > 0) {
        const uploaded = await Promise.all(additionalFiles.map(uploadFileToStorage));
        additionalUrls = [...additionalUrls, ...uploaded];
      }

      // NOW create the complete WORKERS profile with professional data + verification documents
      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
      const { Query, ID } = await import('appwrite');

      // Check if worker profile already exists (shouldn't for new users, but handle edge cases)
      const existingWorkers = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', user.$id), Query.limit(1)]
      );

      const completeWorkerProfile = {
        ...professionalData, // Professional details from Step 2
        // Add verification data
        idType: idType,
        idNumber: idNumber,
        idDocument: finalIdUrl,
        selfieWithId: finalSelfieUrl,
        additionalDocuments: joinDocumentUrls(additionalUrls),
        verificationStatus: 'pending',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingWorkers.documents.length > 0) {
        // Update existing worker document (edge case: user abandoned previously)
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.WORKERS,
          existingWorkers.documents[0].$id,
          completeWorkerProfile
        );
        toast.success('Worker profile updated successfully!');
      } else {
        // Create NEW worker document with complete data (normal flow)
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.WORKERS,
          ID.unique(),
          completeWorkerProfile
        );
        toast.success('Worker profile created successfully!');
      }

      // Update user profile to mark as onboarded
      // Only shared fields (isOnboarded) should be updated in USERS
      // Verification documents are stored only in WORKERS collection
      const result = await updateProfile({
        isOnboarded: true,
      });

      if (result.success) {
        toast.success('Verification documents submitted successfully!');
        onNext();
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification documents');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2">Identity Verification Required</h4>
        <p className="text-sm text-blue-700">
          To ensure platform safety and build trust, we need to verify your identity. Please upload clear, high-quality images of your documents.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          ID Type <span className="text-red-500">*</span>
        </label>
        <Select onValueChange={(value) => setValue("idType", value as any, { shouldValidate: true, shouldDirty: true })}>
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
        {errors.idType && (
          <p className="text-sm text-red-600 mt-1">{errors.idType.message}</p>
        )}
      </div>

      <FormInput
        {...register("idNumber")}
        label="ID Number"
        error={errors.idNumber?.message}
        disabled={isSubmitting}
        required
        placeholder="Enter your ID number"
      />

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

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="font-medium text-amber-900 mb-2">📸 Photo Guidelines</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Ensure good lighting and clear visibility</li>
          <li>• All text on documents should be readable</li>
          <li>• Avoid glare, shadows, or blurry images</li>
          <li>• For selfie: hold ID next to your face, both should be clearly visible</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrevious}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !idType ||
            !idNumber ||
            !idDocumentUrl ||
            !selfieWithIdUrl ||
            uploading.idDocument ||
            uploading.selfieWithId
          }
        >
          {isSubmitting ? "Submitting..." : "Submit for Review"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// Completion Step
function CompletionStep({ user, router, updateProfile }: any) {
  const isWorker = user.role === "worker";
  const [callbackUrl, setCallbackUrl] = React.useState<string | null>(null);

  // Check for callback URL on mount
  React.useEffect(() => {
    const storedCallbackUrl = localStorage.getItem('signup_callback_url');
    if (storedCallbackUrl) {
      setCallbackUrl(storedCallbackUrl);
    }
  }, []);

  // Mark user as active when reaching completion step
  React.useEffect(() => {
    const markUserActive = async () => {
      if (!user.isActive) {
        await updateProfile({ isActive: true });
      }
    };
    markUserActive();
  }, [user.isActive, updateProfile]);

  const handleReturnToJob = () => {
    if (callbackUrl) {
      // Clear the callback URL from localStorage
      localStorage.removeItem('signup_callback_url');
      // Navigate to the job
      router.push(callbackUrl);
    }
  };

  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Star className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-2xl font-serif font-bold text-neutral-900 mb-2">
          Welcome aboard, {user.name}! 🎉
        </h3>
        <p className="text-neutral-600">
          {isWorker
            ? "Your profile is set up! We'll review your verification documents and notify you once approved."
            : "Your profile is complete! You can now start booking services from trusted workers."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card variant="flat" className="text-center p-4">
          <div className="text-2xl mb-2">🔍</div>
          <h4 className="font-medium mb-1">Explore Services</h4>
          <p className="text-xs text-neutral-600">Browse available workers</p>
        </Card>
        <Card variant="flat" className="text-center p-4">
          <div className="text-2xl mb-2">💬</div>
          <h4 className="font-medium mb-1">Get Support</h4>
          <p className="text-xs text-neutral-600">24/7 customer support</p>
        </Card>
        <Card variant="flat" className="text-center p-4">
          <div className="text-2xl mb-2">⭐</div>
          <h4 className="font-medium mb-1">Build Trust</h4>
          <p className="text-xs text-neutral-600">Reviews and ratings</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {callbackUrl ? (
          <>
            <Button
              size="lg"
              onClick={handleReturnToJob}
            >
              Return to Job & Apply
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                localStorage.removeItem('signup_callback_url');
                router.push(`/${user.role}`);
              }}
            >
              Go to Dashboard
            </Button>
          </>
        ) : (
          <>
            <Button
              size="lg"
              onClick={() => router.push(`/${user.role}`)}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/workers")}
            >
              {isWorker ? "View Worker Profiles" : "Find Workers"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 