import { NextRequest, NextResponse } from 'next/server';
import { projectRepository } from '@/db/repositories/project.repository';
import { featureRepository } from '@/db/repositories/feature.repository';

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
