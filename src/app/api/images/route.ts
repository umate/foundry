import { NextRequest, NextResponse } from 'next/server';
import {
  validateImageFile,
  isAllowedMimeType,
  type UploadedImage,
  type AllowedMimeType,
} from '@/lib/image-utils';
import { saveImage } from '@/lib/image-utils.server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // Support both 'images' (multiple) and 'file' (single) field names
    let files = formData.getAll('images') as File[];
    if (files.length === 0) {
      const singleFile = formData.get('file') as File | null;
      if (singleFile) {
        files = [singleFile];
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    const uploadedImages: UploadedImage[] = [];
    const errors: { filename: string; error: string }[] = [];

    for (const file of files) {
      // Validate the file
      const validation = validateImageFile({
        size: file.size,
        type: file.type,
      });

      if (!validation.valid) {
        errors.push({ filename: file.name, error: validation.error! });
        continue;
      }

      // Ensure MIME type is valid (TypeScript narrowing)
      if (!isAllowedMimeType(file.type)) {
        errors.push({ filename: file.name, error: 'Invalid file type' });
        continue;
      }

      // Read file contents and save
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploaded = await saveImage(buffer, file.type as AllowedMimeType);
      uploadedImages.push(uploaded);
    }

    // If all files failed, return error
    if (uploadedImages.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: 'All files failed validation', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      images: uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}
