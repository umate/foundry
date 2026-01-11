import { NextRequest, NextResponse } from 'next/server';
import { featureRepository } from '@/db/repositories/feature.repository';
import { z } from 'zod';

const subtaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  completed: z.boolean(),
  order: z.number().int().min(0),
});

const updateSubtasksSchema = z.object({
  subtasks: z.array(subtaskSchema),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { subtasks } = updateSubtasksSchema.parse(body);

    const feature = await featureRepository.update(id, { subtasks });

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subtasks: feature.subtasks });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to update subtasks:', error);
    return NextResponse.json(
      { error: 'Failed to update subtasks' },
      { status: 500 }
    );
  }
}
