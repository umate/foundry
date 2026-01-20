// Constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// Type for uploaded image metadata
export interface UploadedImage {
  id: string;
  filename: string;
  mimeType: AllowedMimeType;
  url: string;
  createdAt: string;
}

// Get file extension from MIME type
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return extensions[mimeType] || 'png';
}

// Get MIME type from file extension
export function getMimeTypeFromExtension(ext: string): AllowedMimeType | null {
  const mimeTypes: Record<string, AllowedMimeType> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[ext.toLowerCase()] || null;
}

// Validate MIME type
export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

// Validate file size
export function isAllowedFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

// Get the URL for an image
export function getImageUrl(filename: string): string {
  return `/api/images/${filename}`;
}

// Get the filesystem path for an image (server-side only)
export function getImagePath(filename: string): string {
  return `data/images/${filename}`;
}

// Validation result type
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Validate an uploaded file
export function validateImageFile(
  file: { size: number; type: string }
): ValidationResult {
  if (!isAllowedFileSize(file.size)) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    };
  }

  if (!isAllowedMimeType(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Allowed types: PNG, JPEG, GIF, WebP`,
    };
  }

  return { valid: true };
}

// Client-side function to upload images via API
export async function uploadImages(files: File[]): Promise<UploadedImage[]> {
  const uploadedImages: UploadedImage[] = [];

  for (const file of files) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/images', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const result = await response.json();
    // API returns { images: [...] } format
    if (result.images && result.images.length > 0) {
      uploadedImages.push(...result.images);
    }
  }

  return uploadedImages;
}
