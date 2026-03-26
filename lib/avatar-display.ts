/** Header / nav / booking cards: prefer avatar, then profileImage. */
export function userProfileImageUrl(
  user: { avatar?: string | null; profileImage?: string | null } | null | undefined
): string {
  if (!user) return "";
  return (user.avatar || user.profileImage || "").trim();
}

/** Public worker cards: prefer profileImage, then avatar if present on worker doc. */
export function workerProfileImageUrl(worker: {
  profileImage?: string | null;
  avatar?: string | null;
}): string | undefined {
  const u = (worker.profileImage || worker.avatar || "").trim();
  return u || undefined;
}
