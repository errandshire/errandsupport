"use client";

import * as React from "react";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, RefreshCw, Users, DollarSign, UserPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Partner, Referral, PartnerCommission } from "@/lib/types";

export default function AdminPartnersPage() {
  const [partners, setPartners] = React.useState<Partner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  // Detail dialog state
  const [selectedPartner, setSelectedPartner] = React.useState<Partner | null>(null);
  const [partnerReferrals, setPartnerReferrals] = React.useState<Referral[]>([]);
  const [partnerCommissions, setPartnerCommissions] = React.useState<PartnerCommission[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const loadPartners = React.useCallback(async () => {
    try {
      setLoading(true);
      const queries: any[] = [Query.orderDesc("createdAt"), Query.limit(100)];

      if (statusFilter !== "all") {
        queries.push(Query.equal("status", statusFilter));
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PARTNERS,
        queries
      );

      setPartners(response.documents as unknown as Partner[]);
    } catch (error) {
      console.error("Error loading partners:", error);
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const filteredPartners = React.useMemo(() => {
    if (!searchQuery) return partners;
    const q = searchQuery.toLowerCase();
    return partners.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.partnerCode?.toLowerCase().includes(q)
    );
  }, [partners, searchQuery]);

  const stats = React.useMemo(() => {
    const active = partners.filter((p) => p.status === "active").length;
    const totalEarnings = partners.reduce((sum, p) => sum + (p.totalEarnings || 0), 0);
    const totalReferrals = partners.reduce((sum, p) => sum + (p.totalReferrals || 0), 0);
    const pendingPayouts = partners.reduce((sum, p) => sum + (p.pendingPayout || 0), 0);
    return { total: partners.length, active, totalEarnings, totalReferrals, pendingPayouts };
  }, [partners]);

  const handleStatusChange = async (partnerId: string, newStatus: string) => {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PARTNERS,
        partnerId,
        { status: newStatus, updatedAt: new Date().toISOString() }
      );
      toast.success(`Partner status updated to ${newStatus}`);
      loadPartners();
    } catch (error) {
      console.error("Error updating partner status:", error);
      toast.error("Failed to update partner status");
    }
  };

  const openPartnerDetail = async (partner: Partner) => {
    setSelectedPartner(partner);
    setDetailLoading(true);

    try {
      const [referralsRes, commissionsRes] = await Promise.all([
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.REFERRALS,
          [Query.equal("partnerId", partner.$id), Query.orderDesc("createdAt"), Query.limit(50)]
        ),
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.PARTNER_COMMISSIONS,
          [Query.equal("partnerId", partner.$id), Query.orderDesc("createdAt"), Query.limit(50)]
        ),
      ]);

      setPartnerReferrals(referralsRes.documents as unknown as Referral[]);
      setPartnerCommissions(commissionsRes.documents as unknown as PartnerCommission[]);
    } catch (error) {
      console.error("Error loading partner details:", error);
      toast.error("Failed to load partner details");
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      suspended: "bg-orange-100 text-orange-800",
      removed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Partners</h1>
        <p className="text-gray-600 mt-2">
          Manage community growth partners and their referrals
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Partners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-600 mt-1">{stats.active} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Total Referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalReferrals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ₦{stats.totalEarnings.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              ₦{stats.pendingPayouts.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="removed">Removed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadPartners}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Partners List */}
      <Card>
        <CardHeader>
          <CardTitle>Partners ({filteredPartners.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPartners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No partners found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPartners.map((partner) => (
                <div
                  key={partner.$id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{partner.name}</p>
                      <Badge className={getStatusBadge(partner.status)}>
                        {partner.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{partner.email}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span className="font-mono font-semibold text-emerald-600">
                        {partner.partnerCode}
                      </span>
                      <span>Referrals: {partner.totalReferrals || 0}</span>
                      <span>
                        Earnings: ₦{(partner.totalEarnings || 0).toLocaleString()}
                      </span>
                      <span>
                        Pending: ₦{(partner.pendingPayout || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPartnerDetail(partner)}
                    >
                      View Details
                    </Button>
                    {partner.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={() => handleStatusChange(partner.$id, "suspended")}
                      >
                        Suspend
                      </Button>
                    )}
                    {partner.status === "suspended" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleStatusChange(partner.$id, "active")}
                      >
                        Reactivate
                      </Button>
                    )}
                    {partner.status !== "removed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleStatusChange(partner.$id, "removed")}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partner Detail Dialog */}
      <Dialog
        open={!!selectedPartner}
        onOpenChange={(open) => !open && setSelectedPartner(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPartner?.name} — {selectedPartner?.partnerCode}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Partner Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  {selectedPartner?.email}
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>{" "}
                  {selectedPartner?.phone || "N/A"}
                </div>
                <div>
                  <span className="text-gray-500">Total Earnings:</span>{" "}
                  <span className="font-semibold text-green-600">
                    ₦{(selectedPartner?.totalEarnings || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Pending Payout:</span>{" "}
                  <span className="font-semibold text-orange-600">
                    ₦{(selectedPartner?.pendingPayout || 0).toLocaleString()}
                  </span>
                </div>
                {selectedPartner?.experience && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Experience:</span>{" "}
                    {selectedPartner.experience}
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Joined:</span>{" "}
                  {selectedPartner?.createdAt
                    ? new Date(selectedPartner.createdAt).toLocaleDateString("en-NG")
                    : "N/A"}
                </div>
              </div>

              {/* Referrals */}
              <div>
                <h3 className="font-semibold mb-3">
                  Referred Clients ({partnerReferrals.length})
                </h3>
                {partnerReferrals.length === 0 ? (
                  <p className="text-sm text-gray-500">No referrals yet</p>
                ) : (
                  <div className="space-y-2">
                    {partnerReferrals.map((ref) => (
                      <div
                        key={ref.$id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div>
                          <p className="font-medium">{ref.clientEmail}</p>
                          <p className="text-xs text-gray-400">
                            Status: {ref.status} | Jobs: {ref.jobsCompleted || 0} |
                            Commission: ₦
                            {(ref.totalCommissionEarned || 0).toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          className={
                            ref.status === "active"
                              ? "bg-green-100 text-green-800"
                              : ref.status === "expired"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {ref.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Commissions */}
              <div>
                <h3 className="font-semibold mb-3">
                  Commission History ({partnerCommissions.length})
                </h3>
                {partnerCommissions.length === 0 ? (
                  <p className="text-sm text-gray-500">No commissions yet</p>
                ) : (
                  <div className="space-y-2">
                    {partnerCommissions.map((comm) => (
                      <div
                        key={comm.$id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            Booking: {comm.bookingId.slice(0, 12)}...
                          </p>
                          <p className="text-xs text-gray-400">
                            Job: ₦{comm.jobAmount.toLocaleString()} | Rate:{" "}
                            {(comm.commissionRate * 100).toFixed(0)}% |{" "}
                            {comm.payoutMonth || "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            ₦{comm.commissionAmount.toLocaleString()}
                          </p>
                          <Badge
                            className={
                              comm.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : comm.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {comm.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
