import { NextRequest } from 'next/server';
import { featureRepository } from '@/db/repositories/feature.repository';
import { featureMessageRepository } from '@/db/repositories/feature-message.repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: featureId } = await params;

  const feature = await featureRepository.findById(featureId);
  if (!feature) {
    return new Response(JSON.stringify({ error: 'Feature not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = await featureMessageRepository.findByFeatureId(featureId);

  return Response.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: featureId } = await params;

  const feature = await featureRepository.findById(featureId);
  if (!feature) {
    return new Response(JSON.stringify({ error: 'Feature not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message } = await req.json();

  if (!message || !message.role || !message.content) {
    return new Response(JSON.stringify({ error: 'Message must have role and content' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const saved = await featureMessageRepository.create({
    featureId,
    role: message.role,
    content: message.content,
  });

  return Response.json({ message: saved });
}
