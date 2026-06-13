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
import { SERVICE_CATEGORIES, JOB_DURATION_OPTIONS, MAX_JOB_ATTACHMENTS, CATEGORIES_WITH_PRICING, LAUNDRY_PRICING, HOUSE_CLEANING_PRICING } from "@/lib/constants";
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

  // State for pricing items (laundry/cleaning)
  const [selectedItems, setSelectedItems] = React.useState<Record<string, number>>({});

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
        // For laundry/cleaning, validate items are selected
        if (formData.categoryId === 'laundry' || formData.categoryId === 'cleaning') {
          if (Object.keys(selectedItems).length === 0) {
            toast.error('Please select at least one item');
            return false;
          }
          // Auto-calculate budget from selected items
          const totalBudget = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
            const item = (formData.categoryId === 'laundry' ? LAUNDRY_PRICING : HOUSE_CLEANING_PRICING).find(i => i.id === itemId);
            return total + (item ? item.price * quantity : 0);
          }, 0);
          setFormData(prev => ({
            ...prev,
            budgetMax: totalBudget,
            budgetMin: totalBudget,
            budgetType: 'fixed'
          }));
          return true;
        }
        // For other categories, validate manual budget
        if (!formData.budgetMax || formData.budgetMax <= 0) {
          toast.error('Please enter a valid budget');
          return false;
        }
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
      // Upload attachments client-side first (File objects can't be JSON-serialized)
      let attachmentUrls: string[] = [];
      if (formData.attachments && formData.attachments.length > 0) {
        try {
          attachmentUrls = await JobPostingService.uploadJobAttachments(formData.attachments);
        } catch (uploadErr) {
          console.error('Attachment upload failed:', uploadErr);
          toast.error('Failed to upload photos. Posting job without them.');
        }
      }

      // Strip File objects and replace with uploaded URLs for the JSON body
      const { attachments, ...restFormData } = formData;
      
      // Add pricing items for laundry/cleaning jobs
      const pricingItems = (formData.categoryId === 'laundry' || formData.categoryId === 'cleaning') 
        ? Object.entries(selectedItems)
            .filter(([_, quantity]) => quantity > 0)
            .map(([itemId, quantity]) => {
              const item = (formData.categoryId === 'laundry' ? LAUNDRY_PRICING : HOUSE_CLEANING_PRICING).find(i => i.id === itemId);
              return item ? { itemId, itemName: item.name, quantity, pricePerItem: item.price, totalPrice: item.price * quantity } : null;
            })
            .filter(Boolean)
        : [];
      
      const jobPayload = { ...restFormData, attachmentUrls, pricingItems };

      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookie for authentication
        body: JSON.stringify({
          clientId,
          jobData: jobPayload
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Job creation failed:', {
          status: response.status,
          statusText: response.statusText,
          result
        });
        throw new Error(result.message || 'Failed to post job');
      }

      const job = result.job;

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
      setSelectedItems({});
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
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, categoryId: value }));
                    // Reset selected items when category changes
                    setSelectedItems({});
                  }}
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
              {/* Show pricing selection for laundry and cleaning categories */}
              {(formData.categoryId === 'laundry' || formData.categoryId === 'cleaning') && (
                <div className="space-y-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Select Items & Quantities</h4>
                    <p className="text-sm text-blue-800">Choose the items you need and specify quantities. The total will be calculated automatically.</p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(formData.categoryId === 'laundry' ? LAUNDRY_PRICING : HOUSE_CLEANING_PRICING).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-green-600 font-semibold">₦{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItems(prev => {
                                const current = prev[item.id] || 0;
                                if (current > 0) {
                                  const newItems = { ...prev };
                                  newItems[item.id] = current - 1;
                                  if (newItems[item.id] === 0) delete newItems[item.id];
                                  return newItems;
                                }
                                return prev;
                              });
                            }}
                            disabled={!selectedItems[item.id]}
                          >
                            -
                          </Button>
                          <span className="w-12 text-center font-medium">
                            {selectedItems[item.id] || 0}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItems(prev => ({
                                ...prev,
                                [item.id]: (prev[item.id] || 0) + 1
                              }));
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculate and show total */}
                  {Object.keys(selectedItems).length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Selected Items:</h4>
                      <div className="space-y-1 mb-3">
                        {Object.entries(selectedItems).map(([itemId, quantity]) => {
                          const item = (formData.categoryId === 'laundry' ? LAUNDRY_PRICING : HOUSE_CLEANING_PRICING).find(i => i.id === itemId);
                          if (!item || quantity === 0) return null;
                          return (
                            <div key={itemId} className="flex justify-between text-sm">
                              <span>{item.name} x {quantity}</span>
                              <span className="font-medium">₦{(item.price * quantity).toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-green-200 pt-2 flex justify-between">
                        <span className="font-bold text-green-900">Total Budget:</span>
                        <span className="font-bold text-green-900 text-lg">
                          ₦{Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
                            const item = (formData.categoryId === 'laundry' ? LAUNDRY_PRICING : HOUSE_CLEANING_PRICING).find(i => i.id === itemId);
                            return total + (item ? item.price * quantity : 0);
                          }, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Budget Type Radio - RANGE OPTION COMMENTED OUT */}
              {/* <div>
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
              </div> */}

              {/* Only show manual budget input for non-pricing categories */}
              {formData.categoryId !== 'laundry' && formData.categoryId !== 'cleaning' && (
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
                      budgetMin: parseInt(e.target.value) || 0,
                      budgetType: 'fixed'
                    }))}
                  />
                </div>
              )}

              {/* RANGE BUDGET FIELDS COMMENTED OUT */}
              {/* {formData.budgetType === 'range' && (
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
              )} */}

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
                    ₦{formData.budgetMax?.toLocaleString()}
                  </p>
                  {(formData.categoryId === 'laundry' || formData.categoryId === 'cleaning') && Object.keys(selectedItems).length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      <p className="font-medium mb-1">Items:</p>
                      {Object.entries(selectedItems).map(([itemId, quantity]) => {
                        const item = (formData.categoryId === 'laundry' ? LAUNDRY_PRICING : HOUSE_CLEANING_PRICING).find(i => i.id === itemId);
                        if (!item || quantity === 0) return null;
                        return (
                          <p key={itemId}>• {item.name} x {quantity}</p>
                        );
                      })}
                    </div>
                  )}
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
