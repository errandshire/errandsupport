import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";

export type AvatarRole = "client" | "worker" | "admin";

/**
 * Saves profile picture URL to Appwrite: USERS.avatar + USERS.profileImage (same URL),
 * and WORKERS.profileImage for workers. Workers collection may omit `avatar`; UI uses profileImage there.
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
        updatedAt,
      });
    }
  }
}
