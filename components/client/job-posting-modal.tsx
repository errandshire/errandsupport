"use client";

import * as React from "react";
import { Calendar, Clock, MapPin, Image as ImageIcon, Check, ArrowRight, ArrowLeft, DollarSign, FileText, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { JobFormData } from "@/lib/types";
import { JobPostingService } from "@/lib/job-posting.service";
import { WalletService } from "@/lib/wallet.service";
import { JobNotificationService } from "@/lib/job-notification.service";
import { SERVICE_CATEGORIES, JOB_DURATION_OPTIONS, MAX_JOB_ATTACHMENTS } from "@/lib/constants";
import { trackJobPost } from "@/lib/meta-pixel-events";

interface JobPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onJobCreated?: () => void;
}

type JobStep = 'details' | 'requirements' | 'location' | 'budget' | 'review';

interface StepProgressProps {
  currentStep: JobStep;
  steps: { id: JobStep; label: string }[];
}

function StepProgress({ currentStep, steps }: StepProgressProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  isActive && "bg-blue-600 text-white",
                  isCompleted && "bg-blue-600 text-white",
                  isUpcoming && "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium hidden sm:block",
                isActive && "text-blue-600",
                isCompleted && "text-blue-600",
                isUpcoming && "text-gray-500"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 transition-colors",
                index < currentIndex ? "bg-blue-600" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function JobPostingModal({ isOpen, onClose, clientId, onJobCreated }: JobPostingModalProps) {
  const [currentStep, setCurrentStep] = React.useState<JobStep>('details');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [walletBalance, setWalletBalance] = React.useState(0);

  const [formData, setFormData] = React.useState<Partial<JobFormData>>({
    title: '',
    description: '',
    categoryId: '',
    budgetType: 'fixed',
    budgetMin: 0,
    budgetMax: 0,
    locationAddress: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 2,
    skillsRequired: [],
    attachments: [],
  });

  const [attachmentPreviews, setAttachmentPreviews] = React.useState<string[]>([]);

  const steps = [
    { id: 'details' as JobStep, label: 'Details' },
    { id: 'requirements' as JobStep, label: 'Requirements' },
    { id: 'location' as JobStep, label: 'Location' },
    { id: 'budget' as JobStep, label: 'Budget' },
    { id: 'review' as JobStep, label: 'Review' },
  ];

  // Fetch wallet balance on mount
  React.useEffect(() => {
    if (isOpen && clientId) {
      WalletService.getOrCreateWallet(clientId).then(wallet => {
        setWalletBalance(wallet.balance);
      }).catch(err => {
        console.error('Failed to fetch wallet:', err);
      });
    }
  }, [isOpen, clientId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length + (formData.attachments?.length || 0) > MAX_JOB_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_JOB_ATTACHMENTS} photos allowed`);
      return;
    }

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...files]
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index)
    }));
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step: JobStep): boolean => {
    switch (step) {
      case 'details':
        if (!formData.title || !formData.description || !formData.categoryId) {
          toast.error('Please fill in all job details');
          return false;
        }
        return true;
      case 'requirements':
        if (!formData.duration || formData.duration <= 0) {
          toast.error('Please select job duration');
          return false;
        }
        return true;
      case 'location':
        if (!formData.locationAddress || !formData.scheduledDate || !formData.scheduledTime) {
          toast.error('Please fill in location and schedule');
          return false;
        }
        return true;
      case 'budget':
        if (formData.budgetType === 'fixed' && (!formData.budgetMax || formData.budgetMax <= 0)) {
          toast.error('Please enter a valid budget');
          return false;
        }
        if (formData.budgetType === 'range' && (!formData.budgetMin || !formData.budgetMax || formData.budgetMin >= formData.budgetMax)) {
          toast.error('Please enter a valid budget range');
          return false;
        }
        // Note: Wallet balance check removed - clients can post jobs without funding
        // They'll need to fund to view applicants after workers apply
        return true;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;

    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('review')) return;

    setIsSubmitting(true);
    try {
      // Create job
      const job = await JobPostingService.createJob(clientId, formData as JobFormData);

      // Track job posting event
      const budget = formData.budgetType === 'fixed' ? formData.budgetMax! : (formData.budgetMax! + formData.budgetMin!) / 2;
      trackJobPost(job.$id!, formData.title!, budget);

      // Send notifications to workers
      await JobNotificationService.notifyNewJobPosted(job);

      toast.success('Job posted successfully!');
      onJobCreated?.();
      onClose();

      // Reset form
      setFormData({
        title: '',
        description: '',
        categoryId: '',
        budgetType: 'fixed',
        budgetMin: 0,
        budgetMax: 0,
        locationAddress: '',
        scheduledDate: '',
        scheduledTime: '',
        duration: 2,
        skillsRequired: [],
        attachments: [],
      });
      setAttachmentPreviews([]);
      setCurrentStep('details');
    } catch (error) {
      console.error('Failed to post job:', error);
      toast.error('Failed to post job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a New Job</DialogTitle>
        </DialogHeader>

        <StepProgress currentStep={currentStep} steps={steps} />

        <div className="space-y-6">
          {/* Step 1: Details */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., House Cleaning Service"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what needs to be done..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  maxLength={2000}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.description?.length || 0}/2000 characters
                </p>
              </div>

              <div>
                <Label htmlFor="category">Service Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Requirements */}
          {currentStep === 'requirements' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="duration">Estimated Duration *</Label>
                <Select
                  value={formData.duration?.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_DURATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="skills">Skills/Requirements (Optional)</Label>
                <Input
                  id="skills"
                  placeholder="e.g., Experience with pets, Own cleaning supplies"
                  onChange={(e) => {
                    const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setFormData(prev => ({ ...prev, skillsRequired: skills }));
                  }}
                />
                <p className="text-sm text-gray-500 mt-1">Separate multiple skills with commas</p>
              </div>

              <div>
                <Label>Attach Photos (Optional, max {MAX_JOB_ATTACHMENTS})</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button type="button" variant="outline" className="w-full" asChild>
                      <span>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Upload Photos
                      </span>
                    </Button>
                  </label>
                </div>

                {attachmentPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {attachmentPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removeAttachment(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Location & Schedule */}
          {currentStep === 'location' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="location">Job Location *</Label>
                <Input
                  id="location"
                  placeholder="Enter full address"
                  value={formData.locationAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationAddress: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="date">Scheduled Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="time">Scheduled Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Step 4: Budget */}
          {currentStep === 'budget' && (
            <div className="space-y-4">
              <div>
                <Label>Budget Type *</Label>
                <RadioGroup
                  value={formData.budgetType}
                  onValueChange={(value: 'fixed' | 'range') => setFormData(prev => ({
                    ...prev,
                    budgetType: value,
                    budgetMin: value === 'fixed' ? 0 : prev.budgetMin,
                  }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">Fixed Price</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="range" id="range" />
                    <Label htmlFor="range">Price Range</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.budgetType === 'fixed' ? (
                <div>
                  <Label htmlFor="budget">Budget Amount (₦) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="5000"
                    value={formData.budgetMax || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      budgetMax: parseInt(e.target.value) || 0,
                      budgetMin: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budgetMin">Minimum (₦) *</Label>
                    <Input
                      id="budgetMin"
                      type="number"
                      placeholder="3000"
                      value={formData.budgetMin || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="budgetMax">Maximum (₦) *</Label>
                    <Input
                      id="budgetMax"
                      type="number"
                      placeholder="5000"
                      value={formData.budgetMax || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>💡 Note:</strong> You can post this job without funding your wallet. Once workers apply, you'll need to fund your wallet to view their profiles and select a worker.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Review Your Job Posting</h3>

              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Title</p>
                  <p className="font-medium">{formData.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-sm">{formData.description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">
                    {SERVICE_CATEGORIES.find(c => c.id === formData.categoryId)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{formData.duration} hours</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{formData.locationAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Schedule</p>
                  <p className="font-medium">
                    {new Date(formData.scheduledDate || '').toLocaleDateString()} at {formData.scheduledTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Budget</p>
                  <p className="font-medium text-green-600">
                    {formData.budgetType === 'fixed'
                      ? `₦${formData.budgetMax?.toLocaleString()}`
                      : `₦${formData.budgetMin?.toLocaleString()} - ₦${formData.budgetMax?.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          {currentStep !== 'details' && (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          {currentStep === 'details' && <div />}

          {currentStep !== 'review' ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Posting...' : 'Post Job'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
