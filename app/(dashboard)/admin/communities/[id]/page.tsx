"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminCommunityService, Community, CommunityMember } from "@/lib/community.service";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, ArrowLeft, Users, Globe, Lock, Shield, Briefcase,
  CheckCircle, XCircle, Ban, Trash2, Settings, UserMinus,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminCommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const communityId = params.id as string;

  const [community, setCommunity] = React.useState<Community | null>(null);
  const [members, setMembers] = React.useState<CommunityMember[]>([]);
  const [pendingMembers, setPendingMembers] = React.useState<CommunityMember[]>([]);
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionUserId, setActionUserId] = React.useState<string | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [settingsForm, setSettingsForm] = React.useState({ name: "", description: "", type: "public" as "public" | "private" });

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [comm, active, pending, jobList] = await Promise.all([
        AdminCommunityService.getById(communityId),
        AdminCommunityService.getMembers(communityId, "active"),
        AdminCommunityService.getMembers(communityId, "pending"),
        AdminCommunityService.getJobs(communityId),
      ]);
      setCommunity(comm);
      setMembers(active);
      setPendingMembers(pending);
      setJobs(jobList);
      setSettingsForm({ name: comm.name, description: comm.description || "", type: comm.type });
    } catch (error) {
      console.error("Error loading community:", error);
      toast.error("Failed to load community");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (userId: string) => {
    if (!user) return;
    setActionUserId(userId);
    try {
      await AdminCommunityService.approveMember(communityId, userId, user.$id);
      toast.success("Member approved");
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    } finally {
      setActionUserId(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!user) return;
    setActionUserId(userId);
    try {
      await AdminCommunityService.rejectMember(communityId, userId, user.$id);
      toast.success("Request rejected");
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    } finally {
      setActionUserId(null);
    }
  };

  const handleBan = async (userId: string) => {
    if (!user) return;
    setActionUserId(userId);
    try {
      await AdminCommunityService.banMember(communityId, userId, user.$id);
      toast.success("Member banned");
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to ban member");
    } finally {
      setActionUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!user) return;
    setActionUserId(userId);
    try {
      await AdminCommunityService.removeMember(communityId, userId, user.$id);
      toast.success("Member removed");
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    } finally {
      setActionUserId(null);
    }
  };

  const handleUnlinkJob = async (jobId: string) => {
    if (!user) return;
    try {
      await AdminCommunityService.unlinkJob(communityId, jobId, user.$id);
      toast.success("Job removed from community");
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove job");
    }
  };

  const handleSaveSettings = async () => {
    if (!user || !community) return;
    setSaving(true);
    try {
      await AdminCommunityService.update(communityId, user.$id, {
        name: settingsForm.name,
        description: settingsForm.description,
        type: settingsForm.type,
      });
      toast.success("Community updated");
      setShowSettings(false);
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to update community");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !community) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/communities")} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Communities
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {community.type === "private" ? (
                <Lock className="h-6 w-6 text-purple-600" />
              ) : (
                <Globe className="h-6 w-6 text-green-600" />
              )}
              <h1 className="text-3xl font-bold">{community.name}</h1>
              <Badge className={community.type === "private" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}>
                {community.type}
              </Badge>
            </div>
            {community.description && <p className="text-gray-600 mt-2">{community.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{community.memberCount} members</span>
              {community.estateName && <span>{community.estateName}</span>}
              <span>Created {new Date(community.$createdAt).toLocaleDateString("en-NG")}</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Pending requests alert */}
      {pendingMembers.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-orange-800">
              {pendingMembers.length} pending join request{pendingMembers.length > 1 ? "s" : ""} awaiting review
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingMembers.length})
          </TabsTrigger>
          <TabsTrigger value="jobs">
            Jobs ({jobs.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Members */}
        <TabsContent value="members">
          <Card>
            <CardContent className="pt-6">
              {members.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No active members</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.$id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {m.role === "admin" && <Shield className="h-4 w-4 text-primary" />}
                        <span className="font-medium">{m.name || m.userId}</span>
                        <Badge variant="outline" className="text-xs">{m.role}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.role !== "admin" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleRemoveMember(m.userId)} disabled={actionUserId === m.userId}>
                              <UserMinus className="h-4 w-4 mr-1" />Remove
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleBan(m.userId)} disabled={actionUserId === m.userId}>
                              <Ban className="h-4 w-4 mr-1" />Ban
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Requests */}
        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {pendingMembers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {pendingMembers.map((m) => (
                    <div key={m.$id} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{m.name || m.userId}</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleApprove(m.userId)} disabled={actionUserId === m.userId}>
                          {actionUserId === m.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" />Approve</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(m.userId)} disabled={actionUserId === m.userId}>
                          <XCircle className="h-4 w-4 mr-1" />Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs */}
        <TabsContent value="jobs">
          <Card>
            <CardContent className="pt-6">
              {jobs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No jobs posted to this community</p>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div key={job.$id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{job.title}</p>
                          <p className="text-sm text-gray-500">
                            ₦{job.budgetMax?.toLocaleString()} · {job.status} · {new Date(job.linkedAt).toLocaleDateString("en-NG")}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleUnlinkJob(job.$id)}>
                        <Trash2 className="h-4 w-4 mr-1" />Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Community Settings</DialogTitle>
            <DialogDescription>Update community name, description, and visibility</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} className="mt-2" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={settingsForm.description} onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })} rows={3} className="mt-2" />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={settingsForm.type} onValueChange={(v) => setSettingsForm({ ...settingsForm, type: v as "public" | "private" })}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — anyone can join</SelectItem>
                  <SelectItem value="private">Private — requires approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
