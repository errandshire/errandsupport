"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, Eye, User, Banknote, Calendar } from "lucide-react";
import { toast } from "sonner";
import { WithdrawalWorkflowService } from "@/lib/withdrawal-workflow-service";
import { EscrowUtils } from "@/lib/escrow-utils";

interface WithdrawalRequest {
  $id: string;
  userId: string;
  amount: number;
  bankAccountId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    email: string;
    phone: string;
  };
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  // Load pending withdrawals
  const loadWithdrawals = async () => {
    try {
      setIsLoading(true);
      const pendingWithdrawals = await WithdrawalWorkflowService.getPendingWithdrawals();
      setWithdrawals(pendingWithdrawals);
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
      toast.error('Failed to load withdrawal requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  // Handle approval
  const handleApprove = async (withdrawalId: string) => {
    try {
      setIsProcessing(true);
      
      const result = await WithdrawalWorkflowService.processWithdrawalApproval({
        withdrawalId,
        adminId: 'admin', // TODO: Get actual admin ID from auth
        action: 'approve'
      });

      if (result.success) {
        toast.success('Withdrawal approved successfully');
        await loadWithdrawals(); // Refresh the list
        setSelectedWithdrawal(null);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
      toast.error('Failed to approve withdrawal');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsProcessing(true);
      
      const result = await WithdrawalWorkflowService.processWithdrawalApproval({
        withdrawalId: selectedWithdrawal.$id,
        adminId: 'admin', // TODO: Get actual admin ID from auth
        action: 'reject',
        reason: rejectionReason.trim()
      });

      if (result.success) {
        toast.success('Withdrawal rejected successfully');
        await loadWithdrawals(); // Refresh the list
        setSelectedWithdrawal(null);
        setShowRejectionDialog(false);
        setRejectionReason("");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to reject withdrawal:', error);
      toast.error('Failed to reject withdrawal');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Withdrawal Requests</h1>
            <p className="text-muted-foreground">Review and approve worker withdrawal requests</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Withdrawal Requests</h1>
          <p className="text-muted-foreground">Review and approve worker withdrawal requests</p>
        </div>
        <Button onClick={loadWithdrawals} variant="outline">
          <Loader2 className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {withdrawals.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Withdrawals</h3>
              <p className="text-muted-foreground">All withdrawal requests have been processed.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Withdrawal Requests ({withdrawals.length})</CardTitle>
            <CardDescription>
              Review the details below and approve or reject each withdrawal request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.$id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{withdrawal.user?.name || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.user?.email}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.user?.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600">
                          ₦{EscrowUtils.formatAmount(withdrawal.amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{withdrawal.bankName}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.accountNumber}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.accountName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(withdrawal.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(withdrawal.status)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal Details Modal */}
      {selectedWithdrawal && (
        <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Withdrawal Request Details</DialogTitle>
              <DialogDescription>
                Review the withdrawal request details before making a decision
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* User Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">User Name</Label>
                  <div className="font-medium">{selectedWithdrawal.user?.name || 'Unknown User'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <div className="font-medium">{selectedWithdrawal.user?.email}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <div className="font-medium">{selectedWithdrawal.user?.phone}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Request Date</Label>
                  <div className="font-medium">{formatDate(selectedWithdrawal.createdAt)}</div>
                </div>
              </div>

              {/* Withdrawal Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                  <div className="font-semibold text-green-600 text-lg">
                    ₦{EscrowUtils.formatAmount(selectedWithdrawal.amount)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedWithdrawal.status)}</div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Bank Details</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Bank Name</div>
                      <div className="font-medium">{selectedWithdrawal.bankName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Account Number</div>
                      <div className="font-medium">{selectedWithdrawal.accountNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Account Name</div>
                      <div className="font-medium">{selectedWithdrawal.accountName}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              {selectedWithdrawal.reason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    {selectedWithdrawal.reason}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedWithdrawal.rejectionReason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    {selectedWithdrawal.rejectionReason}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              {selectedWithdrawal.status === 'pending_approval' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectionDialog(true);
                    }}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedWithdrawal.$id)}
                    disabled={isProcessing}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setSelectedWithdrawal(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this withdrawal request. The user will be notified of this reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejecting this withdrawal request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionDialog(false);
                setRejectionReason("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
              variant="destructive"
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
