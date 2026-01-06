import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { projectRepository } from '@/db/repositories/project.repository';
import { featureRepository } from '@/db/repositories/feature.repository';

const submitSchema = z.object({
  description: z.string().min(1).max(5000),
  pageUrl: z.string().url().max(2000),
  pageTitle: z.string().max(500).optional(),
  elementData: z.object({
    tag: z.string().optional(),
    id: z.string().optional(),
    classes: z.array(z.string()).optional(),
    textContent: z.string().max(500).optional(),
    xpath: z.string().optional(),
    parentHierarchy: z.array(z.object({
      tag: z.string(),
      id: z.string().optional(),
      classes: z.array(z.string()).optional(),
    })).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get('Origin');

  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return corsResponse({ error: 'Missing or invalid Authorization header' }, 401, origin);
    }

    const apiKey = authHeader.substring(7);
    const project = await projectRepository.findByApiKey(apiKey);

    if (!project) {
      return corsResponse({ error: 'Invalid API key' }, 401, origin);
    }

    // Parse and validate body
    const body = await request.json();
    const data = submitSchema.parse(body);

    // Create feature with status='idea'
    const title = data.description.slice(0, 100) + (data.description.length > 100 ? '...' : '');

    // Build human-readable initialIdea
    const parts = [data.description];

    // Add context section
    const contextLines: string[] = [];
    if (data.pageTitle) {
      contextLines.push(`Submitted from: ${data.pageTitle}`);
    }
    contextLines.push(`Page: ${data.pageUrl}`);

    if (data.elementData?.textContent) {
      const elementText = data.elementData.textContent.slice(0, 100);
      contextLines.push(`Selected: "${elementText}"`);
    } else if (data.elementData?.tag) {
      contextLines.push(`Selected: <${data.elementData.tag}> element`);
    }

    if (contextLines.length > 0) {
      parts.push('---');
      parts.push(...contextLines);
    }

    const initialIdea = parts.join('\n');

    const feature = await featureRepository.create({
      projectId: project.id,
      title,
      status: 'idea',
      priority: 0,
      requestCount: 1,
      initialIdea,
    });

    return corsResponse({ success: true, featureId: feature.id }, 201, origin);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return corsResponse({ error: 'Validation failed', details: error.issues }, 400, origin);
    }

    console.error('Widget submission failed:', error);
    return corsResponse({ error: 'Failed to submit feedback' }, 500, origin);
  }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('Origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function corsResponse(data: object, status: number, origin: string | null): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(origin),
  });
}
