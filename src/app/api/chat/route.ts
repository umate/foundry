import { NextRequest } from "next/server";
import { createAgentUIStreamResponse, streamText } from "ai";
import { chatAgent } from "@/lib/ai/agents/chat-agent";
import { IDEA_AGENT_SYSTEM, IDEA_AGENT_STOP_WHEN, ideaAgentTools } from "@/lib/ai/agents/idea-agent";
import { projectRepository } from "@/db/repositories/project.repository";
import { createErrorResponse } from "@/lib/ai/utils";

/**
 * POST /api/chat
 * Streaming chat endpoint - routes to different agents based on agentType
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, agentType, projectId } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid request: messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Idea agent route
    if (agentType === "idea" && projectId) {
      const project = await projectRepository.findById(projectId);
      const projectContext = project
        ? `[Project: ${project.name}${project.description ? ` - ${project.description}` : ""}${
            project.stack ? ` (Tech: ${project.stack})` : ""
          }]`
        : "";
      const systemPrompt = `${projectContext}\n\n${IDEA_AGENT_SYSTEM}`;

      const result = streamText({
        model: "google/gemini-2.5-pro",
        system: systemPrompt,
        messages,
        tools: ideaAgentTools,
        stopWhen: IDEA_AGENT_STOP_WHEN
      });

      return result.toUIMessageStreamResponse();
    }

    // Default chat agent
    return createAgentUIStreamResponse({
      agent: chatAgent,
      uiMessages: messages
    });
  } catch (error) {
    console.error("[API /chat] Error:", error);
    return createErrorResponse(error);
  }
}
