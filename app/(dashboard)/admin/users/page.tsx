"use client";

import * as React from "react";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, XCircle, Search, Trash2, MessageSquare, Send, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emailService, WorkerVerificationData } from "@/lib/email-service";
import { Textarea } from "@/components/ui/textarea";
import { notificationService } from "@/lib/notification-service";
import { parseDocumentUrls } from "@/lib/utils";

type WorkerDoc = {
  $id: string;
  userId: string;
  displayName?: string;
  name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  categories?: string[];
  skills?: string[];
  hourlyRate?: number;
  currency?: string;
  minimumHours?: number;
  experienceYears?: number;
  experienceDescription?: string;
  workingDays?: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  timezone?: string;
  locationLat?: number;
  locationLng?: number;
  profileImage?: string;
  coverImage?: string;
  isActive?: boolean;
  isVerified?: boolean;
  idVerified?: boolean;
  backgroundCheckVerified?: boolean;
  verificationStatus?: string;
  verificationDocuments?: string;
  idType?: string;
  idNumber?: string;
  idDocument?: string;
  selfieWithId?: string;
  additionalDocuments?: string;
  submittedAt?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminUsersPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [workers, setWorkers] = React.useState<WorkerDoc[]>([]);
  const [search, setSearch] = React.useState("");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<WorkerDoc | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<any | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [workerToReject, setWorkerToReject] = React.useState<WorkerDoc | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<WorkerDoc | null>(null);
  const [messageModalOpen, setMessageModalOpen] = React.useState(false);
  const [userToMessage, setUserToMessage] = React.useState<WorkerDoc | null>(null);
  const [messageTitle, setMessageTitle] = React.useState("");
  const [messageContent, setMessageContent] = React.useState("");
  const [isSendingMessage, setIsSendingMessage] = React.useState(false);
  const [isSendingReminders, setIsSendingReminders] = React.useState(false);

  const fetchWorkers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [
          Query.orderDesc("$createdAt"),
          Query.limit(100)
        ]
      );

      // Fetch user data for each worker in parallel
      const workersWithUserData = await Promise.all(
        res.documents.map(async (worker) => {
          try {
            const user = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.USERS,
              worker.userId
            );
            return {
              ...worker,
              email: user.email,
              phone: user.phone,
              city: user.city,
              state: user.state,
              address: user.address
            };
          } catch (error) {
            console.warn(`Could not fetch user data for worker ${worker.userId}:`, error);
            return worker;
          }
        })
      );

      setWorkers(workersWithUserData as unknown as WorkerDoc[]);
    } catch (error) {
      console.error("Error loading workers:", error);
      toast.error("Failed to load workers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const approveWorker = async (worker: WorkerDoc) => {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        worker.$id,
        {
          isVerified: true,
          idVerified: true,
          backgroundCheckVerified: true,
          verificationStatus: "verified",
          verifiedAt: new Date().toISOString(),
          rejectionReason: null,
          isActive: true,
          updatedAt: new Date().toISOString()
        }
      );

      // Send approval email to worker
      if (worker.email || selectedUser?.email) {
        const emailData: WorkerVerificationData = {
          worker: {
            id: worker.userId,
            name: worker.displayName || worker.name || "Worker",
            email: worker.email || selectedUser?.email || ""
          },
          action: "approved",
          adminName: "Admin Team"
        };

        try {
          await emailService.sendWorkerApprovalEmail(emailData);
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
          // Don't fail the approval if email fails
        }
      }

      // Create in-app notification for worker
      try {
        await notificationService.createNotification({
          userId: worker.userId,
          title: "🎉 Application Approved!",
          message: `Congratulations! Your application to join ErandWork has been approved. You can now start receiving booking requests and begin earning money.`,
          type: "success",
          actionUrl: "/worker/dashboard"
        });
      } catch (notificationError) {
        console.error("Failed to create approval notification:", notificationError);
        // Don't fail the approval if notification fails
      }

      toast.success("Worker approved, email and notification sent");
      fetchWorkers();
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve worker");
    }
  };

  const openRejectionModal = (worker: WorkerDoc) => {
    setWorkerToReject(worker);
    setRejectionReason("");
    setRejectionModalOpen(true);
  };

  const rejectWorker = async (worker: WorkerDoc, reason: string) => {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        worker.$id,
        {
          isVerified: false,
          idVerified: false,
          backgroundCheckVerified: false,
          verificationStatus: "rejected",
          verifiedAt: null,
          rejectionReason: reason,
          isActive: false,
          updatedAt: new Date().toISOString()
        }
      );

      // Send rejection email to worker
      if (worker.email || selectedUser?.email) {
        const emailData: WorkerVerificationData = {
          worker: {
            id: worker.userId,
            name: worker.displayName || worker.name || "Worker",
            email: worker.email || selectedUser?.email || ""
          },
          action: "rejected",
          rejectionReason: reason,
          adminName: "Admin Team"
        };

        try {
          await emailService.sendWorkerRejectionEmail(emailData);
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError);
          // Don't fail the rejection if email fails
        }
      }

      // Create in-app notification for worker
      try {
        await notificationService.createNotification({
          userId: worker.userId,
          title: "Application Status Update",
          message: `Your application has been reviewed. Unfortunately, it was not approved at this time. Reason: ${reason}. You can reapply after addressing the concerns mentioned.`,
          type: "warning",
          actionUrl: "/worker/profile"
        });
      } catch (notificationError) {
        console.error("Failed to create rejection notification:", notificationError);
        // Don't fail the rejection if notification fails
      }

      toast.success("Worker rejected, email and notification sent");
      setRejectionModalOpen(false);
      setWorkerToReject(null);
      setRejectionReason("");
      fetchWorkers();
    } catch (error) {
      console.error("Reject error:", error);
      toast.error("Failed to reject worker");
    }
  };

  const deleteUser = async (worker: WorkerDoc) => {
    try {
      // Delete user document first
      try {
        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          worker.userId
        );
      } catch (error: any) {
        // User might already be deleted, continue
        if (error?.code !== 404) {
          throw error;
        }
      }

      // Delete worker document
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        worker.$id
      );

      toast.success("User deleted successfully");
      setDeleteModalOpen(false);
      setUserToDelete(null);
      setDetailOpen(false);
      fetchWorkers();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete user");
    }
  };

  const openMessageModal = (worker: WorkerDoc) => {
    setUserToMessage(worker);
    setMessageTitle("");
    setMessageContent("");
    setMessageModalOpen(true);
  };

  const sendMessageToUser = async () => {
    if (!userToMessage || !messageTitle.trim() || !messageContent.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    try {
      setIsSendingMessage(true);

      // Create in-app notification for the user
      await notificationService.createNotification({
        userId: userToMessage.userId,
        title: messageTitle.trim(),
        message: messageContent.trim(),
        type: "info",
        actionUrl: "/worker/dashboard"
      });

      toast.success(`Message sent to ${userToMessage.displayName || userToMessage.name || "user"}`);
      setMessageModalOpen(false);
      setUserToMessage(null);
      setMessageTitle("");
      setMessageContent("");
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const sendDocumentReminders = async () => {
    try {
      setIsSendingReminders(true);
      toast.info("Sending document upload reminders...");

      const response = await fetch('/api/admin/notify-incomplete-workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminders');
      }

      // Show detailed success message
      const { stats } = data;
      const summary = `Sent to ${stats.totalWorkers} workers: ${stats.email.sent} emails, ${stats.sms.sent} SMS, ${stats.inApp.sent} in-app notifications`;
      toast.success(summary);

      console.log('Document reminders sent:', stats);
    } catch (error) {
      console.error("Send reminders error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send reminders");
    } finally {
      setIsSendingReminders(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter(w => {
      const text = `${w.displayName || w.name || ""} ${w.email || ""} ${w.state || ""} ${w.city || ""} ${(w.categories || []).join(" ")}`.toLowerCase();
      return text.includes(q);
    });
  }, [workers, search]);

  const getWorkerStatus = (worker: WorkerDoc) => {
    if (worker.verificationStatus === "verified" || worker.isVerified) {
      return "approved";
    }
    if (worker.verificationStatus === "rejected") {
      return "rejected";
    }
    return "pending";
  };

  const statusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const openDetails = async (w: WorkerDoc) => {
    try {
      setSelected(w);
      setDetailLoading(true);
      setDetailOpen(true);
      // hydrate linked USER document if present
      if (w.userId) {
        try {
          const user = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.USERS,
            w.userId
          );
          setSelectedUser(user);
        } catch (e) {
          setSelectedUser(null);
        }
      } else {
        setSelectedUser(null);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-serif font-bold">Manage Users</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workers..."
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchWorkers} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={sendDocumentReminders}
            disabled={isSendingReminders}
          >
            <Bell className="h-4 w-4 mr-2" />
            {isSendingReminders ? "Sending..." : "Send Document Reminders"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-neutral-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-neutral-500">No workers found.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Location</th>
                      <th className="py-2 pr-4">Categories</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(w => (
                      <tr key={w.$id} className="border-b align-top">
                        <td className="py-3 pr-4 font-medium">{w.displayName || w.name || "—"}</td>
                        <td className="py-3 pr-4">{w.email || "—"}</td>
                        <td className="py-3 pr-4">{[w.city, w.state].filter(Boolean).join(", ") || "—"}</td>
                        <td className="py-3 pr-4">{(w.categories && w.categories.length) ? w.categories.slice(0, 3).join(", ") : "—"}</td>
                        <td className="py-3 pr-4">{statusBadge(getWorkerStatus(w))}</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => openDetails(w)}>
                              View Details
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openMessageModal(w)}>
                              <MessageSquare className="h-4 w-4 mr-1" /> Message
                            </Button>
                            {getWorkerStatus(w) === "pending" && (
                              <>
                                <Button size="sm" onClick={() => approveWorker(w)}>
                                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openRejectionModal(w)}>
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filtered.map(w => (
                  <Card key={w.$id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{w.displayName || w.name || "—"}</h3>
                          <p className="text-xs text-neutral-500 truncate">{w.email || "—"}</p>
                        </div>
                        <div className="ml-2">
                          {statusBadge(getWorkerStatus(w))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div>
                          <span className="text-neutral-500">Location:</span>
                          <span className="ml-1">{[w.city, w.state].filter(Boolean).join(", ") || "—"}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500">Categories:</span>
                          <span className="ml-1">{(w.categories && w.categories.length) ? w.categories.slice(0, 3).join(", ") : "—"}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDetails(w)} className="flex-1">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openMessageModal(w)} className="flex-1">
                            <MessageSquare className="h-4 w-4 mr-1" /> Message
                          </Button>
                        </div>
                        {getWorkerStatus(w) === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => approveWorker(w)} className="flex-1">
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openRejectionModal(w)} className="flex-1">
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Drawer/Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">          <DialogHeader>
            <DialogTitle>Worker Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="text-sm text-neutral-500">Loading details...</div>
          ) : !selected ? (
            <div className="text-sm text-neutral-500">No worker selected</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Profile Information */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <Detail label="Name" value={selected.displayName || selected.name || "—"} />
                      <Detail label="Email" value={selected.email || selectedUser?.email || "—"} />
                      <Detail label="Phone" value={selected.phone || selectedUser?.phone || "—"} />
                      <Detail label="User ID" value={<code className="font-mono break-all text-xs">{selected.userId || "—"}</code>} />
                      <Detail label="Worker Doc ID" value={<code className="font-mono break-all text-xs">{selected.$id}</code>} />
                      <Detail label="Status" value={statusBadge(getWorkerStatus(selected))} />
                    </div>
                    
                    {selected.bio && (
                      <div>
                        <Detail label="Bio/Description" value={<div className="whitespace-pre-wrap">{selected.bio}</div>} />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <Detail label="Location" value={[selected.city, selected.state].filter(Boolean).join(", ") || "—"} />
                      <Detail label="Address" value={selected.address || "—"} />
                      <Detail label="Categories" value={(selected.categories && selected.categories.length) ? selected.categories.join(", ") : "—"} />
                      <Detail label="Skills" value={(selected.skills && selected.skills.length) ? selected.skills.join(", ") : "—"} />
                    </div>
                  </CardContent>
                </Card>

                {/* Service Details */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Service Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <Detail label="Hourly Rate" value={selected.hourlyRate ? `₦${selected.hourlyRate.toLocaleString()}` : "—"} />
                      <Detail label="Currency" value={selected.currency || "—"} />
                      <Detail label="Minimum Hours" value={selected.minimumHours || "—"} />
                      <Detail label="Experience" value={selected.experienceYears ? `${selected.experienceYears} years` : "—"} />
                    </div>
                    
                    {selected.experienceDescription && (
                      <div>
                        <Detail label="Experience Description" value={<div className="whitespace-pre-wrap">{selected.experienceDescription}</div>} />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <Detail label="Working Days" value={(selected.workingDays && selected.workingDays.length) ? selected.workingDays.join(", ") : "—"} />
                      <Detail label="Working Hours" value={selected.workingHoursStart && selected.workingHoursEnd ? `${selected.workingHoursStart} - ${selected.workingHoursEnd}` : "—"} />
                      <Detail label="Timezone" value={selected.timezone || "—"} />
                      <Detail label="Location Coordinates" value={selected.locationLat && selected.locationLng ? `${selected.locationLat}, ${selected.locationLng}` : "—"} />
                    </div>
                  </CardContent>
                </Card>

                {/* Verification & Actions */}
                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Verification & Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
                      <Detail label="Verification Status" value={statusBadge(getWorkerStatus(selected))} />
                      <Detail label="ID Type" value={selected.idType || "—"} />
                      <Detail label="ID Number" value={selected.idNumber || "—"} />
                      <Detail label="Submitted At" value={selected.submittedAt ? new Date(selected.submittedAt).toLocaleDateString() : "—"} />
                      <Detail
                        label="ID Document"
                        value={
                          (selected.idDocument || selectedUser?.idDocument) ? (
                            <a 
                              href={selected.idDocument || selectedUser?.idDocument} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              ✅ View Document
                            </a>
                          ) : "❌ Not uploaded"
                        } 
                      />
                      <Detail 
                        label="Selfie with ID" 
                        value={
                          (selected.selfieWithId || selectedUser?.selfieWithId) ? (
                            <a 
                              href={selected.selfieWithId || selectedUser?.selfieWithId} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              ✅ View Document
                            </a>
                          ) : "❌ Not uploaded"
                        } 
                      />
                      <Detail 
                        label="Additional Docs" 
                        value={
                          (selected.additionalDocuments || selectedUser?.additionalDocuments) ? (
                            <div className="space-y-1">
                              {parseDocumentUrls(selected.additionalDocuments || selectedUser?.additionalDocuments || '').map((url, index) => (
                                <a 
                                  key={index}
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block text-blue-600 hover:text-blue-800 underline text-xs"
                                >
                                  ✅ Document {index + 1}
                                </a>
                              ))}
                            </div>
                          ) : "❌ None"
                        } 
                      />
                      <Detail label="Verified At" value={selected.verifiedAt || "—"} />
                      <Detail label="Is Verified" value={selected.isVerified ? "Yes" : "No"} />
                    </div>
                    
                    {selected.rejectionReason && (
                      <div className="mb-4">
                        <Detail label="Rejection Reason" value={selected.rejectionReason} />
                      </div>
                    )}
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => openMessageModal(selected)}>
                        <MessageSquare className="h-4 w-4 mr-1" /> Message User
                      </Button>
                      {getWorkerStatus(selected) === "pending" && (
                        <>
                          <Button size="sm" onClick={() => approveWorker(selected)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openRejectionModal(selected)}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setUserToDelete(selected);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete User
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* System Information */}
                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>System Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <Detail label="Created" value={selected.createdAt || selectedUser?.$createdAt || "—"} />
                      <Detail label="Updated" value={selected.updatedAt || selectedUser?.$updatedAt || "—"} />
                      <Detail label="Profile Image" value={selected.profileImage ? "Uploaded" : "Not uploaded"} />
                      <Detail label="Cover Image" value={selected.coverImage ? "Uploaded" : "Not uploaded"} />
                    </div>
                  </CardContent>
                </Card>

              </div>

              

              
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Modal */}
      <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Worker Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600 mb-2">
                Please provide a reason for rejecting <strong>{workerToReject?.displayName || workerToReject?.name || "this worker"}</strong>:
              </p>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectionModalOpen(false);
                  setWorkerToReject(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (workerToReject && rejectionReason.trim()) {
                    rejectWorker(workerToReject, rejectionReason.trim());
                  } else {
                    toast.error("Please provide a rejection reason");
                  }
                }}
                disabled={!rejectionReason.trim()}
              >
                Reject Worker
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Are you sure you want to permanently delete <strong>{userToDelete?.displayName || userToDelete?.name || "this user"}</strong>?
            </p>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone. All user data will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (userToDelete) {
                    deleteUser(userToDelete);
                  }
                }}
              >
                Delete User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message User Modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Send a message to <strong>{userToMessage?.displayName || userToMessage?.name || "this user"}</strong>.
              They will receive this as an in-app notification.
            </p>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                placeholder="Enter message title..."
                disabled={isSendingMessage}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Enter your message..."
                className="min-h-[120px]"
                disabled={isSendingMessage}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setMessageModalOpen(false);
                  setUserToMessage(null);
                  setMessageTitle("");
                  setMessageContent("");
                }}
                disabled={isSendingMessage}
              >
                Cancel
              </Button>
              <Button
                onClick={sendMessageToUser}
                disabled={isSendingMessage || !messageTitle.trim() || !messageContent.trim()}
              >
                {isSendingMessage ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" /> Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-neutral-500 text-xs">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}


