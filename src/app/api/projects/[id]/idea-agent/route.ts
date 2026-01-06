import { NextRequest } from "next/server";
import type { UIMessage } from "ai";
import { createFeatureRefineAgentStream } from "@/lib/ai/agents/feature-refine-agent";
import { projectRepository } from "@/db/repositories/project.repository";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

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

  return createFeatureRefineAgentStream(
    { name: project.name, description: project.description, stack: project.stack },
    currentPrdMarkdown ?? null,
    messages
  );
}
