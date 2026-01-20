import { NextRequest, NextResponse } from 'next/server';
import { getMimeTypeFromExtension } from '@/lib/image-utils';
import { readImage } from '@/lib/image-utils.server';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Get the file extension and determine MIME type
    const ext = path.extname(filename).slice(1);
    const mimeType = getMimeTypeFromExtension(ext);

    if (!mimeType) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Read the image from filesystem
    const buffer = await readImage(filename);

    if (!buffer) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Return the image with appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image serving error:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}
