import imageCompression from "browser-image-compression";

export const ALLOWED_REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB hard cap (post-compression budget)

/**
 * Resize to ≤1600px on the longest edge, re-encode as JPEG (which drops EXIF),
 * and ensure the file stays under ~1MB. This both fixes the HEIC / huge-file
 * problem and strips location metadata from real-world phone photos.
 */
export async function prepareReviewPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.heic$/i.test(file.name)) {
    throw new Error("Photo must be an image (jpeg, png, or webp).");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("That photo is too large. Please pick one under 25 MB.");
  }
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.82,
    // browser-image-compression re-encodes via canvas → EXIF dropped
  });
  // Always present a clean .jpg name to storage
  const cleanName = file.name.replace(/\.[a-z0-9]+$/i, "") || "review";
  return new File([compressed], `${cleanName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}