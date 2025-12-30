import { NextRequest, NextResponse } from 'next/server';
import { featureRepository } from '@/db/repositories/feature.repository';
import { z } from 'zod';

const updateFeatureSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['idea', 'scoped', 'ready', 'done']).optional(),
  priority: z.number().int().optional(),
  requestCount: z.number().int().min(0).optional(),
  agentSpec: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateFeatureSchema.parse(body);

    const feature = await featureRepository.update(id, data);

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(feature);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to update feature:', error);
    return NextResponse.json(
      { error: 'Failed to update feature' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await featureRepository.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete feature:', error);
    return NextResponse.json(
      { error: 'Failed to delete feature' },
      { status: 500 }
    );
  }
}
