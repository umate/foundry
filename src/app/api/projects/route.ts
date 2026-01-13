import { NextRequest, NextResponse } from 'next/server';
import { projectRepository } from '@/db/repositories/project.repository';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  repoPath: z.string().optional(),
});

export async function GET() {
  try {
    const projects = await projectRepository.findManyWithFeatureCounts();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createProjectSchema.parse(body);

    const project = await projectRepository.create(data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
