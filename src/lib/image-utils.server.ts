import { mkdir, readFile, writeFile, unlink, access } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import {
  type UploadedImage,
  type AllowedMimeType,
  getExtensionFromMimeType,
  getImageUrl,
} from './image-utils';

// Constants
export const IMAGES_DIR = path.join(process.cwd(), 'data', 'images');

// Generate a short unique ID for images
export function generateImageId(): string {
  return nanoid(8);
}

// Get the full path for an image
export function getImagePath(filename: string): string {
  return path.join(IMAGES_DIR, filename);
}

// Ensure images directory exists
export async function ensureImagesDir(): Promise<void> {
  await mkdir(IMAGES_DIR, { recursive: true });
}

// Save an image to the filesystem
export async function saveImage(
  buffer: Buffer,
  mimeType: AllowedMimeType
): Promise<UploadedImage> {
  await ensureImagesDir();

  const id = generateImageId();
  const ext = getExtensionFromMimeType(mimeType);
  const filename = `${id}.${ext}`;
  const filepath = getImagePath(filename);

  await writeFile(filepath, buffer);

  return {
    id,
    filename,
    mimeType,
    url: getImageUrl(filename),
    createdAt: new Date().toISOString(),
  };
}

// Read an image from the filesystem
export async function readImage(filename: string): Promise<Buffer | null> {
  try {
    const filepath = getImagePath(filename);
    return await readFile(filepath);
  } catch {
    return null;
  }
}

// Check if an image exists
export async function imageExists(filename: string): Promise<boolean> {
  try {
    await access(getImagePath(filename));
    return true;
  } catch {
    return false;
  }
}

// Delete an image from the filesystem
export async function deleteImage(filename: string): Promise<boolean> {
  try {
    await unlink(getImagePath(filename));
    return true;
  } catch {
    return false;
  }
}

// Convert a file to base64 for Claude's vision API
export async function imageToBase64(filename: string): Promise<string | null> {
  const buffer = await readImage(filename);
  if (!buffer) return null;
  return buffer.toString('base64');
}
