"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle, User, DollarSign, Shield, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface WorkerSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  jobSlug?: string;
}

export function WorkerSignupModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  jobSlug
}: WorkerSignupModalProps) {
  const router = useRouter();

  const handleCreateAccount = () => {
    // Use slug if available, otherwise use jobId
    const urlIdentifier = jobSlug || jobId;
    const callbackUrl = `/jobs/${urlIdentifier}`;
    router.push(`/register?callbackUrl=${encodeURIComponent(callbackUrl)}&role=worker`);
  };

  const handleLogin = () => {
    // Use slug if available, otherwise use jobId
    const urlIdentifier = jobSlug || jobId;
    const callbackUrl = `/jobs/${urlIdentifier}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Become a Worker to Apply
          </DialogTitle>
          <DialogDescription className="text-center">
            Create a worker account to apply for <strong>"{jobTitle}"</strong> and access thousands of job opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits Section */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Join our community and enjoy:
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Flexible Schedule</p>
                  <p className="text-xs text-muted-foreground">
                    Choose jobs that fit your availability
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                  <DollarSign className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Set Your Own Rates</p>
                  <p className="text-xs text-muted-foreground">
                    Control your pricing and earnings
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-100">
                  <Shield className="h-3 w-3 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Secure Payments</p>
                  <p className="text-xs text-muted-foreground">
                    Get paid safely through our platform
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100">
                  <Star className="h-3 w-3 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Build Your Reputation</p>
                  <p className="text-xs text-muted-foreground">
                    Earn reviews and grow your profile
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleCreateAccount}
              className="w-full"
              size="lg"
            >
              <User className="mr-2 h-4 w-4" />
              Create Worker Account
            </Button>

            <Button
              onClick={handleLogin}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Already Have an Account? Log In
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
