"use client";

import * as React from "react";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Search, Trash2, MessageSquare, Send, UserCheck, UserX, Eye, Calendar, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { notificationService } from "@/lib/notification-service";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

type ClientDoc = {
  $id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client';
  status?: 'active' | 'inactive' | 'suspended';
  address?: string;
  city?: string;
  state?: string;
  avatar?: string;
  isActive?: boolean;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ClientStats = {
  totalBookings: number;
  completedBookings: number;
  activeBookings: number;
  totalSpent: number;
  averageRating: number;
};

export default function AdminClientsPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [clients, setClients] = React.useState<ClientDoc[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<ClientDoc | null>(null);
  const [clientStats, setClientStats] = React.useState<ClientStats | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [clientToDelete, setClientToDelete] = React.useState<ClientDoc | null>(null);
  const [messageModalOpen, setMessageModalOpen] = React.useState(false);
  const [clientToMessage, setClientToMessage] = React.useState<ClientDoc | null>(null);
  const [messageTitle, setMessageTitle] = React.useState("");
  const [messageContent, setMessageContent] = React.useState("");
  const [isSendingMessage, setIsSendingMessage] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(20);

  const fetchClients = React.useCallback(async (page: number = 1, searchQuery: string = "") => {
    try {
      setIsLoading(true);

      // Build queries
      const queries = [
        Query.equal('role', 'client'),
        Query.orderDesc("$createdAt"),
        Query.limit(20), // Fixed value instead of state
        Query.offset((page - 1) * 20)
      ];

      // Add search if provided - fetch more for client-side filtering
      if (searchQuery.trim()) {
        queries.splice(2, 2); // Remove limit and offset for search
        queries.push(Query.limit(5000)); // Fetch ALL records for searching across all pages
      }

      const res = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        queries
      );

      setTotalCount(res.total);

      // Filter search results if search query provided
      let filteredClients = res.documents;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filteredClients = res.documents.filter((c: any) => {
          const text = `${c.name || ""} ${c.email || ""} ${c.phone || ""} ${c.state || ""} ${c.city || ""}`.toLowerCase();
          return text.includes(q);
        });
      }

      setClients(filteredClients as unknown as ClientDoc[]);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove itemsPerPage dependency

  // Fetch clients when page or search changes
  React.useEffect(() => {
    fetchClients(currentPage, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search]); // Removed fetchClients dependency

  const fetchClientStats = React.useCallback(async (clientId: string) => {
    try {
      // Fetch bookings for this client
      const bookingsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('clientId', clientId),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );

      const bookings = bookingsResponse.documents;
      const totalBookings = bookings.length;
      const completedBookings = bookings.filter((b: any) => b.status === 'completed').length;
      const activeBookings = bookings.filter((b: any) => 
        ['confirmed', 'accepted', 'in_progress'].includes(b.status)
      ).length;
      
      const totalSpent = bookings.reduce((sum: number, b: any) => sum + (b.budgetAmount || b.totalAmount || 0), 0);
      
      // Calculate average rating from reviews
      let averageRating = 0;
      try {
        const reviewsResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.REVIEWS,
          [
            Query.equal('clientId', clientId),
            Query.limit(100)
          ]
        );
        
        if (reviewsResponse.documents.length > 0) {
          const ratings = reviewsResponse.documents
            .map((r: any) => r.rating)
            .filter((r: number) => r > 0);
          if (ratings.length > 0) {
            averageRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
          }
        }
      } catch (error) {
        console.warn('Could not fetch reviews:', error);
      }

      setClientStats({
        totalBookings,
        completedBookings,
        activeBookings,
        totalSpent,
        averageRating: Math.round(averageRating * 10) / 10
      });
    } catch (error) {
      console.error("Error fetching client stats:", error);
      setClientStats(null);
    }
  }, []);

  const updateClientStatus = async (client: ClientDoc, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      setIsUpdatingStatus(true);
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        client.$id,
        {
          status: newStatus,
          isActive: newStatus === 'active',
          updatedAt: new Date().toISOString()
        }
      );

      // Create notification for client
      try {
        await notificationService.createNotification({
          userId: client.$id,
          title: `Account Status Updated`,
          message: `Your account status has been updated to ${newStatus}.`,
          type: newStatus === 'active' ? 'success' : 'warning',
          actionUrl: "/client/dashboard"
        });
      } catch (notificationError) {
        console.error("Failed to create status notification:", notificationError);
      }

      toast.success(`Client status updated to ${newStatus}`);
      fetchClients();
      if (selected?.$id === client.$id) {
        setSelected({ ...selected, status: newStatus, isActive: newStatus === 'active' });
      }
    } catch (error) {
      console.error("Update status error:", error);
      toast.error("Failed to update client status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const deleteClient = async (client: ClientDoc) => {
    try {
      // Check if client has active bookings
      const bookingsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('clientId', client.$id),
          Query.limit(100)
        ]
      );

      // Filter for active bookings
      const activeBookings = bookingsResponse.documents.filter((booking: any) => 
        ['confirmed', 'accepted', 'in_progress'].includes(booking.status)
      );

      if (activeBookings.length > 0) {
        toast.error("Cannot delete client with active bookings. Please cancel or complete bookings first.");
        return;
      }

      // Delete user document
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        client.$id
      );

      toast.success("Client deleted successfully");
      setDeleteModalOpen(false);
      setClientToDelete(null);
      setDetailOpen(false);
      fetchClients();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete client");
    }
  };

  const openMessageModal = (client: ClientDoc) => {
    setClientToMessage(client);
    setMessageTitle("");
    setMessageContent("");
    setMessageModalOpen(true);
  };

  const sendMessageToClient = async () => {
    if (!clientToMessage || !messageTitle.trim() || !messageContent.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    try {
      setIsSendingMessage(true);

      // Create in-app notification for the client
      await notificationService.createNotification({
        userId: clientToMessage.$id,
        title: messageTitle.trim(),
        message: messageContent.trim(),
        type: "info",
        actionUrl: "/client/dashboard"
      });

      toast.success(`Message sent to ${clientToMessage.name}`);
      setMessageModalOpen(false);
      setClientToMessage(null);
      setMessageTitle("");
      setMessageContent("");
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Pagination calculations (server-side)
  const totalPages = search.trim()
    ? Math.ceil(clients.length / itemsPerPage)
    : Math.ceil(totalCount / itemsPerPage);

  // For search, we do client-side pagination since we fetch all results
  // For normal view, clients already contains the current page from server
  const displayedClients = search.trim()
    ? clients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : clients;

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const getClientStatus = (client: ClientDoc) => {
    if (client.status === 'suspended') return 'suspended';
    if (client.status === 'inactive' || !client.isActive) return 'inactive';
    return 'active';
  };

  const statusBadge = (status: "active" | "inactive" | "suspended") => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      default:
        return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  const openDetails = async (client: ClientDoc) => {
    try {
      setSelected(client);
      setDetailLoading(true);
      setDetailOpen(true);
      await fetchClientStats(client.$id);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-serif font-bold">Manage Clients</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchClients(currentPage, search)} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clients ({search.trim() ? clients.length : totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-neutral-500">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="text-sm text-neutral-500">No clients found.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Phone</th>
                      <th className="py-2 pr-4">Location</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedClients.map(client => (
                      <tr key={client.$id} className="border-b align-top">
                        <td className="py-3 pr-4 font-medium">{client.name || "—"}</td>
                        <td className="py-3 pr-4">{client.email || "—"}</td>
                        <td className="py-3 pr-4">{client.phone || "—"}</td>
                        <td className="py-3 pr-4">{[client.city, client.state].filter(Boolean).join(", ") || "—"}</td>
                        <td className="py-3 pr-4">{statusBadge(getClientStatus(client))}</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => openDetails(client)}>
                              View Details
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openMessageModal(client)}>
                              <MessageSquare className="h-4 w-4 mr-1" /> Message
                            </Button>
                            {/* {getClientStatus(client) !== 'active' && (
                              <Button 
                                size="sm" 
                                onClick={() => updateClientStatus(client, 'active')}
                                disabled={isUpdatingStatus}
                              >
                                <UserCheck className="h-4 w-4 mr-1" /> Activate
                              </Button>
                            )} */}
                            {getClientStatus(client) === 'active' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => updateClientStatus(client, 'suspended')}
                                disabled={isUpdatingStatus}
                              >
                                <UserX className="h-4 w-4 mr-1" /> Suspend
                              </Button>
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
                {displayedClients.map(client => (
                  <Card key={client.$id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{client.name || "—"}</h3>
                          <p className="text-xs text-neutral-500 truncate">{client.email || "—"}</p>
                        </div>
                        <div className="ml-2">
                          {statusBadge(getClientStatus(client))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div>
                          <span className="text-neutral-500">Phone:</span>
                          <span className="ml-1">{client.phone || "—"}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500">Location:</span>
                          <span className="ml-1">{[client.city, client.state].filter(Boolean).join(", ") || "—"}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDetails(client)} className="flex-1">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openMessageModal(client)} className="flex-1">
                            <MessageSquare className="h-4 w-4 mr-1" /> Message
                          </Button>
                        </div>
                        {getClientStatus(client) !== 'active' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateClientStatus(client, 'active')}
                            disabled={isUpdatingStatus}
                            className="w-full"
                          >
                            <UserCheck className="h-4 w-4 mr-1" /> Activate
                          </Button>
                        )}
                        {getClientStatus(client) === 'active' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => updateClientStatus(client, 'suspended')}
                            disabled={isUpdatingStatus}
                            className="w-full"
                          >
                            <UserX className="h-4 w-4 mr-1" /> Suspend
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="text-sm text-neutral-500">Loading details...</div>
          ) : !selected ? (
            <div className="text-sm text-neutral-500">No client selected</div>
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
                      <Detail label="Name" value={selected.name || "—"} />
                      <Detail label="Email" value={selected.email || "—"} />
                      <Detail label="Phone" value={selected.phone || "—"} />
                      <Detail label="User ID" value={<code className="font-mono break-all text-xs">{selected.$id}</code>} />
                      <Detail label="Status" value={statusBadge(getClientStatus(selected))} />
                      <Detail label="Email Verified" value={selected.emailVerified ? "Yes" : "No"} />
                      <Detail label="Phone Verified" value={selected.phoneVerified ? "Yes" : "No"} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <Detail label="Location" value={[selected.city, selected.state].filter(Boolean).join(", ") || "—"} />
                      <Detail label="Address" value={selected.address || "—"} />
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Client Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {clientStats ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <Detail 
                          label="Total Bookings" 
                          value={
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {clientStats.totalBookings}
                            </div>
                          } 
                        />
                        <Detail 
                          label="Completed Bookings" 
                          value={clientStats.completedBookings} 
                        />
                        <Detail 
                          label="Active Bookings" 
                          value={clientStats.activeBookings} 
                        />
                        <Detail 
                          label="Total Spent" 
                          value={
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ₦{clientStats.totalSpent.toLocaleString()}
                            </div>
                          } 
                        />
                        <Detail 
                          label="Average Rating" 
                          value={clientStats.averageRating > 0 ? `${clientStats.averageRating} ⭐` : "No ratings yet"} 
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-500">Loading statistics...</div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => openMessageModal(selected)}>
                        <MessageSquare className="h-4 w-4 mr-1" /> Message Client
                      </Button>
                      {getClientStatus(selected) !== 'active' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateClientStatus(selected, 'active')}
                          disabled={isUpdatingStatus}
                        >
                          <UserCheck className="h-4 w-4 mr-1" /> Activate Account
                        </Button>
                      )}
                      {getClientStatus(selected) === 'active' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateClientStatus(selected, 'suspended')}
                          disabled={isUpdatingStatus}
                        >
                          <UserX className="h-4 w-4 mr-1" /> Suspend Account
                        </Button>
                      )}
                      {getClientStatus(selected) === 'suspended' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateClientStatus(selected, 'inactive')}
                          disabled={isUpdatingStatus}
                        >
                          <UserX className="h-4 w-4 mr-1" /> Set Inactive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setClientToDelete(selected);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete Client
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
                      <Detail label="Created" value={selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"} />
                      <Detail label="Updated" value={selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "—"} />
                      <Detail label="Avatar" value={selected.avatar ? "Uploaded" : "Not uploaded"} />
                      <Detail label="Is Active" value={selected.isActive ? "Yes" : "No"} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Are you sure you want to permanently delete <strong>{clientToDelete?.name || "this client"}</strong>?
            </p>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone. All client data will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setClientToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (clientToDelete) {
                    deleteClient(clientToDelete);
                  }
                }}
              >
                Delete Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Client Modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message to Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Send a message to <strong>{clientToMessage?.name || "this client"}</strong>.
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
                  setClientToMessage(null);
                  setMessageTitle("");
                  setMessageContent("");
                }}
                disabled={isSendingMessage}
              >
                Cancel
              </Button>
              <Button
                onClick={sendMessageToClient}
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

