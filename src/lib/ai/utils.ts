import type { UIMessage } from 'ai';

/**
 * Validate request body for chat endpoints
 */
export function validateChatRequest(body: unknown): { messages: UIMessage[] } | null {
  if (!body || typeof body !== 'object') return null;
  if (!('messages' in body) || !Array.isArray(body.messages)) return null;
  return { messages: body.messages as UIMessage[] };
}

/**
 * Create error response for streaming failures
 */
export function createErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
