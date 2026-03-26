"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { uploadProfileImageFile, validateProfileImageFile } from "@/lib/profile-image-upload";
import { persistUserAvatar, type AvatarRole } from "@/lib/persist-user-avatar";
import type { User } from "@/lib/types";

export function ProfilePictureUpload({
  userId,
  role,
  displayName,
}: {
  userId: string;
  role: AvatarRole;
  displayName: string;
}) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const currentUrl =
    user?.$id === userId ? user.avatar || user.profileImage : undefined;

  const [localPreview, setLocalPreview] = React.useState<string | undefined>();

  React.useEffect(() => {
    setLocalPreview(undefined);
  }, [currentUrl]);

  const shownUrl = localPreview ?? currentUrl;

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const err = validateProfileImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setUploading(true);
      const url = await uploadProfileImageFile(file);
      await persistUserAvatar(userId, role, url);
      updateUser({ avatar: url, profileImage: url } as Partial<User>);
      setLocalPreview(url);
      toast.success("Profile picture updated");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload profile picture"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-neutral-100">
      <div className="relative shrink-0">
        <Avatar className="h-24 w-24 border-2 border-neutral-200">
          <AvatarImage src={shownUrl || ""} alt="" />
          <AvatarFallback className="text-lg bg-neutral-100 text-neutral-700">
            {initials || "?"}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40"
            aria-busy
            aria-label="Uploading"
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="space-y-2 min-w-0">
        <Label>Profile photo</Label>
        <p className="text-sm text-neutral-600">
          JPG, PNG, WebP, or GIF up to 5 MB. Stored in the same secure storage as verification
          documents.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={onPick}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          {shownUrl ? "Change photo" : "Upload photo"}
        </Button>
      </div>
    </div>
  );
}
