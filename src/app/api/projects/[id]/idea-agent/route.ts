import { NextRequest } from "next/server";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { IDEA_AGENT_SYSTEM, IDEA_AGENT_STOP_WHEN, ideaAgentTools } from "@/lib/ai/agents/idea-agent";
import { projectRepository } from "@/db/repositories/project.repository";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

  // Verify project exists
  const project = await projectRepository.findById(projectId);
  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { messages, currentPrdMarkdown }: { messages: UIMessage[]; currentPrdMarkdown?: string } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Build system prompt with rich project context
  const projectContext = `## PROJECT CONTEXT (READ THIS CAREFULLY)

**Product Name:** ${project.name}

**What This Product Does:**
${project.description || "No description provided."}

**Tech Stack:** ${project.stack || "Not specified"}

You are helping refine features for THIS specific product. Your questions should reference the product's existing capabilities and tech constraints described above.`;

  // Add current PRD context if available
  const prdContext = currentPrdMarkdown
    ? `\n\n## CURRENT PRD\n\nThe user has an existing PRD. When they ask for changes, use the \`updatePRD\` tool to propose modifications.\n\n${currentPrdMarkdown}`
    : '';

  const systemPrompt = `${projectContext}${prdContext}\n\n${IDEA_AGENT_SYSTEM}`;

  const result = streamText({
    model: "google/gemini-3-flash",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: IDEA_AGENT_STOP_WHEN,
    tools: ideaAgentTools
  });

  return result.toUIMessageStreamResponse();
}
