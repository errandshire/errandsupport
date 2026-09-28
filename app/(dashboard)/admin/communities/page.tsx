"use client";

import * as React from "react";
import Link from "next/link";
import { AdminCommunityService, Community } from "@/lib/community.service";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Eye, Users, Globe, Lock, Trash2, Building2, Search } from "lucide-react";
import { toast } from "sonner";

export default function AdminCommunitiesPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [deleteTarget, setDeleteTarget] = React.useState<Community | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminCommunityService.list({
        search: search || undefined,
        type: typeFilter === "all" ? undefined : (typeFilter as "public" | "private"),
      });
      setCommunities(data);
    } catch (error) {
      console.error("Error loading communities:", error);
      toast.error("Failed to load communities");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  React.useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const stats = React.useMemo(() => ({
    all: communities.length,
    public: communities.filter((c) => c.type === "public").length,
    private: communities.filter((c) => c.type === "private").length,
    members: communities.reduce((sum, c) => sum + (c.memberCount || 0), 0),
  }), [communities]);

  const handleToggleType = async (community: Community) => {
    if (!user) return;
    const newType = community.type === "public" ? "private" : "public";
    setTogglingId(community.$id);
    try {
      await AdminCommunityService.update(community.$id, user.$id, { type: newType });
      toast.success(`"${community.name}" is now ${newType}`);
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to update community");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await AdminCommunityService.remove(deleteTarget.$id, user.$id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete community");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && communities.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Communities</h1>
        <p className="text-gray-600 mt-2">Moderate estate communities and job boards</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3"><CardDescription>Total Communities</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.all}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardDescription>Public</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{stats.public}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardDescription>Private</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-purple-600">{stats.private}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardDescription>Total Members</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.members}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search communities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Communities List */}
      <Card>
        <CardHeader>
          <CardTitle>Communities ({communities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {communities.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Communities Found</h3>
              <p className="text-gray-600">No communities match your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {communities.map((community) => (
                <div
                  key={community.$id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {community.type === "private" ? (
                        <Lock className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      ) : (
                        <Globe className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                      <h3 className="font-semibold text-lg truncate">{community.name}</h3>
                      <Badge className={community.type === "private" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}>
                        {community.type}
                      </Badge>
                      {community.status !== "active" && (
                        <Badge variant="destructive">{community.status}</Badge>
                      )}
                    </div>
                    {community.description && (
                      <p className="text-sm text-gray-600 line-clamp-1 mb-2">{community.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {community.memberCount} members
                      </span>
                      {community.estateName && <span>{community.estateName}</span>}
                      <span>Created {new Date(community.$createdAt).toLocaleDateString("en-NG")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Link href={`/admin/communities/${community.$id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleType(community)}
                      disabled={togglingId === community.$id}
                    >
                      {togglingId === community.$id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : community.type === "public" ? (
                        <><Lock className="h-4 w-4 mr-1" />Make Private</>
                      ) : (
                        <><Globe className="h-4 w-4 mr-1" />Make Public</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTarget(community)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Community</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will remove all
              memberships and job links. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
