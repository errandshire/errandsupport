"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, Clock, AlertCircle, Eye, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { WithdrawalWorkflowService } from "@/lib/withdrawal-workflow-service";

interface WithdrawalRequest {
  $id: string;
  userId: string;
  amount: number;
  bankAccountId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  reason?: string;
  reference?: string;
  transferCode?: string;
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

  // Load all withdrawals
  const loadWithdrawals = async () => {
    try {
      setIsLoading(true);
      const allWithdrawals = await WithdrawalWorkflowService.getAllWithdrawals();
      setWithdrawals(allWithdrawals);
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
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
            <p className="text-muted-foreground">View withdrawal requests and process them in Paystack</p>
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
          <p className="text-muted-foreground">View withdrawal requests and process them in Paystack</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadWithdrawals} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => window.open('https://dashboard.paystack.com', '_blank')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Paystack
          </Button>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>How withdrawals work:</strong> When workers request a withdrawal, the money is automatically deducted from their balance
          and a Paystack transfer is initiated automatically. You can monitor the transfer status in your Paystack dashboard.
        </AlertDescription>
      </Alert>

      {withdrawals.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Withdrawal Requests</h3>
              <p className="text-muted-foreground">There are no withdrawal requests at this time.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requests ({withdrawals.length})</CardTitle>
            <CardDescription>
              Click on a withdrawal to view details and bank information for processing in Paystack
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
                          ₦{withdrawal.amount.toLocaleString()}
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
                          View Details
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
                Use these details to process the transfer in Paystack dashboard
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Alert for Paystack */}
              <Alert className={selectedWithdrawal.status === 'processing' ? "border-blue-200 bg-blue-50" : selectedWithdrawal.status === 'failed' ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                <AlertCircle className={selectedWithdrawal.status === 'processing' ? "h-4 w-4 text-blue-600" : selectedWithdrawal.status === 'failed' ? "h-4 w-4 text-red-600" : "h-4 w-4 text-green-600"} />
                <AlertDescription className={selectedWithdrawal.status === 'processing' ? "text-blue-800" : selectedWithdrawal.status === 'failed' ? "text-red-800" : "text-green-800"}>
                  {selectedWithdrawal.status === 'processing' ? (
                    <><strong>Transfer in progress:</strong> Paystack transfer has been initiated automatically. The money has been deducted from the worker's wallet and is being transferred to their bank account.</>
                  ) : selectedWithdrawal.status === 'failed' ? (
                    <><strong>Transfer failed:</strong> The Paystack transfer failed. Please check your Paystack dashboard for details or retry manually.</>
                  ) : (
                    <><strong>Transfer completed:</strong> The money has been successfully transferred to the worker's bank account via Paystack.</>
                  )}
                </AlertDescription>
              </Alert>

              {/* User Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Worker Information</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">{selectedWithdrawal.user?.name || 'Unknown User'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{selectedWithdrawal.user?.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{selectedWithdrawal.user?.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Request Date</div>
                    <div className="font-medium">{formatDate(selectedWithdrawal.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Amount to Transfer</h3>
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="text-3xl font-bold text-green-700">
                    ₦{selectedWithdrawal.amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600 mt-1">Already deducted from worker's balance</div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Bank Account Details</h3>
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Bank Name</div>
                    <div className="font-semibold text-lg">{selectedWithdrawal.bankName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Account Number</div>
                    <div className="font-semibold text-lg font-mono">{selectedWithdrawal.accountNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Account Name</div>
                    <div className="font-semibold text-lg">{selectedWithdrawal.accountName}</div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              {selectedWithdrawal.reason && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Reason</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    {selectedWithdrawal.reason}
                  </div>
                </div>
              )}

              {/* Status & Transfer Details */}
              <div className="space-y-2">
                <h3 className="font-semibold">Transfer Status</h3>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedWithdrawal.status)}
                  {selectedWithdrawal.transferCode && (
                    <span className="text-sm text-muted-foreground">
                      Transfer Code: <code className="bg-muted px-2 py-1 rounded">{selectedWithdrawal.transferCode}</code>
                    </span>
                  )}
                </div>
              </div>

              {/* Reference */}
              {selectedWithdrawal.reference && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Reference</h3>
                  <code className="block bg-muted p-3 rounded text-sm">{selectedWithdrawal.reference}</code>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => window.open('https://dashboard.paystack.com', '_blank')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Paystack Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedWithdrawal(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
