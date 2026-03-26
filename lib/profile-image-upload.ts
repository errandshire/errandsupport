import { ID } from "appwrite";
import { storage, STORAGE_BUCKET_ID } from "@/lib/appwrite";

/** Same bucket as ID / verification documents */
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateProfileImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Please use a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadProfileImageFile(file: File): Promise<string> {
  const validationError = validateProfileImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const fileId = ID.unique();
  const uploadedFile = await storage.createFile(STORAGE_BUCKET_ID, fileId, file);
  const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, uploadedFile.$id);
  return fileUrl.toString();
}
