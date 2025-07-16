"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Upload, MapPin, DollarSign, Clock, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { SERVICE_CATEGORIES, EXPERIENCE_LEVELS, ID_TYPES } from "@/lib/constants";
import { clientProfileSchema, onboardingWorkerProfileSchema, onboardingVerificationSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";
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
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Personal Information Step
function PersonalInfoStep({ user, updateProfile, onNext, isFirstStep }: any) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Nigeria",
    },
  });

  const onSubmit = async (data: any) => {
    const result = await updateProfile(data);
    if (result.success) {
      onNext();
    }
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormInput
          {...register("city")}
          label="City"
          error={errors.city?.message}
          disabled={isSubmitting}
        />
        <FormInput
          {...register("state")}
          label="State"
          error={errors.state?.message}
          disabled={isSubmitting}
        />
        <FormInput
          {...register("postalCode")}
          label="Postal Code"
          error={errors.postalCode?.message}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Continue"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// Worker Profile Step
function WorkerProfileStep({ user, updateProfile, onNext, onPrevious }: any) {
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
      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
      const { ID } = await import('appwrite');

      // Create worker profile data
      const workerProfileData = {
        userId: user.$id,
        displayName: user.name || 'Worker', // Add displayName from user's name
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
        skills: [], // Will be updated in next step
        
        // languages: ["English"], // Default
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

      // Create worker profile in WORKERS collection
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        ID.unique(),
        workerProfileData
      );

      // Update user profile with worker-specific data
      const profileData = {
        ...data,
        categories: selectedCategories,
        isOnboarded: true,
      };
      
      const result = await updateProfile(profileData);
      
      if (result.success) {
        toast.success("Professional profile created successfully!");
        onNext();
      } else {
        console.error('Profile update failed:', result.error);
        toast.error("Failed to create professional profile");
      }
    } catch (error) {
      console.error('Error submitting worker profile:', error);
      toast.error("Failed to create professional profile");
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
function VerificationStep({ onNext, onPrevious, updateProfile }: any) {
  const [uploadedFiles, setUploadedFiles] = React.useState<{file: File, url?: string, uploading?: boolean}[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(onboardingVerificationSchema),
  });

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

  const validateFile = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and PDF files are allowed';
    }
    
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }
    
    return null;
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }
      
      // Add file to state as uploading
      const fileObj = { file, uploading: true };
      setUploadedFiles(prev => [...prev, fileObj]);
      
      try {
        const url = await uploadFileToStorage(file);
        
        // Update file with URL and remove uploading state
        setUploadedFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, url, uploading: false }
              : f
          )
        );
      } catch (error) {
        // Remove file from state if upload failed
        setUploadedFiles(prev => prev.filter(f => f.file !== file));
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(f => f.file !== fileToRemove));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const uploadedFileUrls = uploadedFiles
        .filter(f => f.url && !f.uploading)
        .map(f => f.url);
      
      if (uploadedFileUrls.length === 0) {
        toast.error('Please upload at least one verification document');
        return;
      }
      
      const verificationData = {
        ...data,
        verificationDocuments: uploadedFileUrls,
        verificationStatus: 'pending',
        submittedAt: new Date().toISOString(),
      };
      
      const result = await updateProfile(verificationData);
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
        <h4 className="font-medium text-blue-900 mb-2">Why do we need verification?</h4>
        <p className="text-sm text-blue-700">
          Identity verification helps build trust between clients and workers, ensuring a safe platform for everyone.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          ID Type
        </label>
        <Select onValueChange={(value) => setValue("idType", value as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Select ID type" />
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

      <FormInput
        {...register("idNumber")}
        label="ID Number"
        error={errors.idNumber?.message}
        disabled={isSubmitting}
        required
      />

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Upload Documents
        </label>
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            isDragOver
              ? "border-primary-500 bg-primary-50"
              : "border-neutral-300 hover:border-neutral-400"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
          <p className="text-sm text-neutral-600 mb-2">
            Drag and drop your ID documents here, or click to select
          </p>
          <p className="text-xs text-neutral-500 mb-4">
            Supported formats: JPEG, PNG, PDF (Max 5MB each)
          </p>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Display uploaded files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium text-neutral-700">Uploaded Documents</h4>
            {uploadedFiles.map((fileObj, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {fileObj.file.type.startsWith('image/') ? (
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">IMG</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-red-600 text-xs font-medium">PDF</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {fileObj.file.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {fileObj.uploading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      <span className="text-xs text-neutral-500">Uploading...</span>
                    </div>
                  ) : fileObj.url ? (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      Uploaded
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Failed
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(fileObj.file)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            uploadedFiles.length === 0 || 
            uploadedFiles.some(f => f.uploading || !f.url)
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

  // Mark user as active when reaching completion step
  React.useEffect(() => {
    const markUserActive = async () => {
      if (!user.isActive) {
        await updateProfile({ isActive: true });
      }
    };
    markUserActive();
  }, [user.isActive, updateProfile]);

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
      </div>
    </div>
  );
} 