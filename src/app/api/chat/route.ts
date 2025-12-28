import { NextRequest } from 'next/server';
import { createAgentUIStreamResponse } from 'ai';
import { chatAgent } from '@/lib/ai/agents/chat-agent';
import { validateChatRequest, createErrorResponse } from '@/lib/ai/utils';

/**
 * POST /api/chat
 * Streaming chat endpoint using default chat agent
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validated = validateChatRequest(body);

    if (!validated) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create streaming response using AI SDK v6 pattern
    return createAgentUIStreamResponse({
      agent: chatAgent,
      uiMessages: validated.messages,
    });
  } catch (error) {
    console.error('[API /chat] Error:', error);
    return createErrorResponse(error);
  }
}
