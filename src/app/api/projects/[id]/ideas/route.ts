import { NextRequest, NextResponse } from 'next/server';
import { projectRepository } from '@/db/repositories/project.repository';
import { featureRepository } from '@/db/repositories/feature.repository';
import { breakdownIdea } from '@/lib/ai/idea-breakdown';
import { miniPRDSchema } from '@/lib/ai/agents/idea-agent';
import { z } from 'zod';

const ideaSchema = z.object({
  ideaText: z.string().min(1),
  createOnly: z.boolean().optional(),
});

const prdSchema = z.object({
  prd: miniPRDSchema,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    // Verify project exists
    const project = await projectRepository.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Handle PRD from Idea Agent (new flow)
    if (body.prd) {
      const { prd } = prdSchema.parse(body);

      const feature = await featureRepository.create({
        projectId,
        title: prd.title,
        description: prd.problem,
        status: 'idea' as const,
        priority: 0,
        requestCount: 0,
        agentSpec: JSON.stringify(prd),
      });

      return NextResponse.json({ feature });
    }

    // Handle ideaText flow
    const { ideaText, createOnly } = ideaSchema.parse(body);

    // If createOnly flag is set, just create a minimal feature and return
    // This is used by the new AddIdeaDialog to redirect to the feature page
    if (createOnly) {
      // Extract a short title from the idea (first ~50 chars)
      const title = ideaText.slice(0, 50) + (ideaText.length > 50 ? '...' : '');

      const feature = await featureRepository.create({
        projectId,
        title,
        description: null,
        status: 'idea' as const,
        priority: 0,
        requestCount: 0,
        initialIdea: ideaText,
      });

      return NextResponse.json({
        featureId: feature.id,
        feature,
      });
    }

    // Legacy flow: Break down the idea using AI
    const projectContext = `Project: ${project.name}\n${project.description || ''}\n${project.stack ? `Tech stack: ${project.stack}` : ''}`;

    // Break down the idea using AI
    const breakdown = await breakdownIdea(ideaText, projectContext);

    // Create features in database
    const features = await featureRepository.createMany(
      breakdown.features.map((feature, index) => ({
        projectId,
        title: feature.title,
        description: feature.description,
        status: 'idea' as const,
        priority: index,
        requestCount: 0,
      }))
    );

    return NextResponse.json({
      problem: breakdown.problem,
      solution: breakdown.solution,
      features,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to process idea:', error);
    return NextResponse.json(
      { error: 'Failed to process idea' },
      { status: 500 }
    );
  }
}
