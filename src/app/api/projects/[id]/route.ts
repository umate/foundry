import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { projectRepository } from '@/db/repositories/project.repository';
import { featureRepository } from '@/db/repositories/feature.repository';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  stack: z.string().nullable().optional(),
  repoPath: z.string().nullable().optional(),
  packageManager: z.enum(["bun", "npm", "yarn", "pnpm"]).nullable().optional(),
  regenerateApiKey: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await projectRepository.findById(id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const features = await featureRepository.findByProjectIdGrouped(id);

    return NextResponse.json({
      ...project,
      features,
    });
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    const project = await projectRepository.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Handle API key regeneration
    if (data.regenerateApiKey) {
      const newApiKey = await projectRepository.regenerateApiKey(id);
      const updatedProject = await projectRepository.findById(id);
      return NextResponse.json(updatedProject);
    }

    // Handle regular updates
    const { regenerateApiKey: _, ...updateData } = data;
    const updatedProject = await projectRepository.update(id, updateData);

    return NextResponse.json(updatedProject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
