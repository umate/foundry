import { NextRequest, NextResponse } from 'next/server';
import { featureRepository } from '@/db/repositories/feature.repository';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feature = await featureRepository.findById(id);

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(feature);
  } catch (error) {
    console.error('Failed to fetch feature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature' },
      { status: 500 }
    );
  }
}

const updateFeatureSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  // Accept 'current' from UI but store as 'ready' in database
  // 'archived' is used for soft-deleting features via trash drop zone
  status: z.enum(['idea', 'scoped', 'current', 'ready', 'done', 'archived']).optional(),
  priority: z.number().int().optional(),
  sortOrder: z.number().int().optional(),
  requestCount: z.number().int().min(0).optional(),
  // Allow clearing spec and wireframe (null to clear)
  specMarkdown: z.string().nullable().optional(),
  wireframe: z.string().nullable().optional(),
});

// Map 'current' to 'ready' for database storage
function mapStatusToDb(status: string | undefined): string | undefined {
  if (status === 'current') return 'ready';
  return status;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateFeatureSchema.parse(body);

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...data,
      status: mapStatusToDb(data.status),
    };

    // Explicitly handle null values for spec clearing
    // (spreading doesn't always preserve null in all cases)
    if (data.specMarkdown === null) {
      updateData.specMarkdown = null;
    }
    if (data.wireframe === null) {
      updateData.wireframe = null;
    }

    console.log('[PATCH /api/features] Update data:', JSON.stringify(updateData, null, 2));

    // If status is changing and sortOrder is not explicitly provided,
    // auto-set sortOrder to place the feature at the top of the new column
    if (data.status && data.sortOrder === undefined) {
      const existingFeature = await featureRepository.findById(id);
      if (existingFeature) {
        const dbStatus = mapStatusToDb(data.status)!;
        // Only update sortOrder if the status is actually changing
        if (existingFeature.status !== dbStatus) {
          const maxSortOrder = await featureRepository.getMaxSortOrderForStatus(
            existingFeature.projectId,
            dbStatus
          );
          updateData.sortOrder = maxSortOrder + 1000;
        }
      }
    }

    const feature = await featureRepository.update(id, updateData);

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
