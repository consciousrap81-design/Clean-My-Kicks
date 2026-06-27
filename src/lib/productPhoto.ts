import imageCompression from "browser-image-compression";

/**
 * Resize/compress a product photo before upload.
 * - Max edge: 1920px (great for retina product galleries)
 * - Target size: ~800KB
 * - Re-encoded as JPEG (drops EXIF / GPS metadata)
 */
export async function prepareProductPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.heic$/i.test(file.name)) {
    throw new Error(`"${file.name}" is not an image.`);
  }
  if (file.size > 30 * 1024 * 1024) {
    throw new Error(`"${file.name}" is over 30 MB. Please pick a smaller photo.`);
  }
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.85,
  });
  const cleanName = file.name.replace(/\.[a-z0-9]+$/i, "") || "photo";
  return new File([compressed], `${cleanName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}