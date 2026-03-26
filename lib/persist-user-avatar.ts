import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";

export type AvatarRole = "client" | "worker" | "admin";

/**
 * Saves profile picture URL to Appwrite: USERS (avatar + profileImage for downstream features),
 * and WORKERS.profileImage when the user is a worker — same storage bucket as verification files.
 */
export async function persistUserAvatar(
  userId: string,
  role: AvatarRole,
  avatarUrl: string
): Promise<void> {
  const updatedAt = new Date().toISOString();

  await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, userId, {
    avatar: avatarUrl,
    profileImage: avatarUrl,
    updatedAt,
  });

  if (role === "worker") {
    const res = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WORKERS,
      [Query.equal("userId", userId), Query.limit(1)]
    );
    const worker = res.documents[0];
    if (worker) {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.WORKERS, worker.$id, {
        profileImage: avatarUrl,
        avatar: avatarUrl,
        updatedAt,
      });
    }
  }
}
