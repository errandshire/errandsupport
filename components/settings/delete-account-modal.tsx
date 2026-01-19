"use client";

import * as React from "react";
import { AlertTriangle, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeletionEligibility {
  canDelete: boolean;
  blockers: string[];
  warnings: string[];
  summary: {
    activeBookings: number;
    walletBalance: number;
    escrowBalance: number;
    pendingWithdrawals: number;
    openDisputes: number;
  };
}

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function DeleteAccountModal({ isOpen, onClose, userEmail }: DeleteAccountModalProps) {
  const router = useRouter();

  const [step, setStep] = React.useState<'warning' | 'password' | 'deleting' | 'success' | 'error'>('warning');
  const [password, setPassword] = React.useState('');
  const [eligibility, setEligibility] = React.useState<DeletionEligibility | null>(null);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [deletionDetails, setDeletionDetails] = React.useState<any>(null);

  // Check eligibility when modal opens
  React.useEffect(() => {
    if (isOpen) {
      checkEligibility();
    }
  }, [isOpen]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setStep('warning');
      setPassword('');
      setErrorMessage('');
      setDeletionDetails(null);
    }
  }, [isOpen]);

  const checkEligibility = async () => {
    try {
      const response = await fetch('/api/account/delete', {
        method: 'GET',
      });

      const data = await response.json();

      if (data.success && data.eligibility) {
        setEligibility(data.eligibility);
      } else {
        toast.error('Failed to check account status');
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast.error('Failed to check account status');
    }
  };

  const handleDeleteAccount = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setStep('deleting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          reason: 'User requested deletion'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDeletionDetails(data.details);
        setStep('success');

        // Redirect to homepage after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setErrorMessage(data.message || 'Failed to delete account');
        setStep('error');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setStep('error');
    }
  };

  const renderWarningStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Delete Account Permanently?
        </DialogTitle>
        <DialogDescription>
          This action cannot be undone. Your account and all associated data will be permanently deleted.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {eligibility && !eligibility.canDelete && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Cannot delete account:</div>
              <ul className="list-disc pl-4 space-y-1">
                {eligibility.blockers.map((blocker, index) => (
                  <li key={index}>{blocker}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {eligibility && eligibility.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">What will happen:</div>
              <ul className="list-disc pl-4 space-y-1">
                {eligibility.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="font-semibold text-sm">The following will be permanently deleted:</p>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Your profile and account information</li>
            <li>• All booking history and records</li>
            <li>• All messages and notifications</li>
            <li>• All reviews and ratings</li>
            <li>• Payment history and transactions</li>
            <li>• Uploaded documents and images</li>
          </ul>
        </div>

        {eligibility && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-semibold text-sm">Your account summary:</p>
            <ul className="text-sm space-y-1">
              <li>• Active bookings: {eligibility.summary.activeBookings}</li>
              <li>• Available balance: ₦{eligibility.summary.walletBalance.toLocaleString()}</li>
              <li>• Escrow balance: ₦{eligibility.summary.escrowBalance.toLocaleString()}</li>
              <li>• Pending withdrawals: {eligibility.summary.pendingWithdrawals}</li>
              <li>• Open disputes: {eligibility.summary.openDisputes}</li>
            </ul>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => setStep('password')}
          disabled={eligibility && !eligibility.canDelete}
        >
          Continue to Delete
        </Button>
      </DialogFooter>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Confirm Account Deletion
        </DialogTitle>
        <DialogDescription>
          Enter your password to permanently delete your account.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>This action is irreversible!</strong> Once deleted, your account cannot be recovered.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleDeleteAccount();
              }
            }}
          />
          <p className="text-sm text-muted-foreground">
            Logged in as: {userEmail}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep('warning')}>
          Back
        </Button>
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={!password}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete My Account
        </Button>
      </DialogFooter>
    </>
  );

  const renderDeletingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Deleting Account...</DialogTitle>
        <DialogDescription>
          Please wait while we process your account deletion.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          This may take a few moments. Please don't close this window.
        </p>
      </div>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          Account Deleted Successfully
        </DialogTitle>
        <DialogDescription>
          Your account has been permanently deleted.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your account and all associated data have been successfully deleted.
          </AlertDescription>
        </Alert>

        {deletionDetails && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-semibold text-sm">Deletion summary:</p>
            <ul className="text-sm space-y-1">
              <li>• Bookings cancelled: {deletionDetails.bookingsCancelled}</li>
              <li>• Refund processed: ₦{deletionDetails.refundProcessed?.toLocaleString()}</li>
              <li>• Files deleted: {deletionDetails.filesDeleted}</li>
              <li>• Collections cleared: {deletionDetails.collectionsDeleted?.length}</li>
            </ul>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          A confirmation email has been sent to {userEmail}.
          You will be redirected to the homepage shortly.
        </p>
      </div>

      <DialogFooter>
        <Button onClick={() => router.push('/')}>
          Go to Homepage
        </Button>
      </DialogFooter>
    </>
  );

  const renderErrorStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          Deletion Failed
        </DialogTitle>
        <DialogDescription>
          We couldn't delete your account.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage || 'An unexpected error occurred. Please try again or contact support.'}
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={() => setStep('password')}>
          Try Again
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'warning' && renderWarningStep()}
        {step === 'password' && renderPasswordStep()}
        {step === 'deleting' && renderDeletingStep()}
        {step === 'success' && renderSuccessStep()}
        {step === 'error' && renderErrorStep()}
      </DialogContent>
    </Dialog>
  );
}
