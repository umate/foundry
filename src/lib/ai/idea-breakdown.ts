import { generateText, Output } from "ai";
import { z } from "zod";

export interface IdeaBreakdownResult {
  problem: string;
  solution: string;
  features: Array<{
    title: string;
    description: string;
  }>;
}

const ideaBreakdownSchema = z.object({
  problem: z.string().describe("Clear statement of the problem being solved"),
  solution: z.string().describe("High-level approach to solving it"),
  features: z
    .array(
      z.object({
        title: z.string().describe("Feature name (3-7 words)"),
        description: z.string().describe("What this feature does and why it matters")
      })
    )
    .describe("List of 3-8 discrete, actionable features")
});

const BREAKDOWN_SYSTEM_PROMPT = `You are a product architect helping decompose ideas into user-facing capabilities.

Your task:
1. Extract the core problem and proposed solution from the user's rambling text
2. Break down the solution into discrete user-facing FEATURES (what users can DO)
3. Focus on complete capabilities, not implementation tasks

Guidelines for features:
- Think from the user's perspective: "What can users accomplish after this is built?"
- Each feature should deliver independent value to users
- Use benefit-focused titles (3-7 words): "File upload for ideas" not "Create upload component"
- Descriptions explain the user benefit and context, not implementation details
- Features should be strategic, not tactical (avoid UI/API/database granularity)
- Aim for 3-6 features total

Examples of GOOD features:
✅ "File upload for transcript ingestion" (capability: users can upload files)
✅ "Export features as markdown checklist" (capability: users can export)
✅ "Bulk edit feature priorities" (capability: users can batch update)

Examples of BAD features (too granular/implementation-focused):
❌ "Create file upload UI component" (this is HOW, not WHAT)
❌ "Add API endpoint for file processing" (implementation detail)
❌ "Implement drag-and-drop reordering" (implementation detail)

The features you generate will later be broken down into implementation tasks by engineers or AI agents. Your job is to define WHAT to build, not HOW to build it.`;

export async function breakdownIdea(ideaText: string, projectContext?: string): Promise<IdeaBreakdownResult> {
  const contextPrompt = projectContext
    ? `Project context:\n${projectContext}\n\nIdea to break down:\n${ideaText}`
    : `Idea to break down:\n${ideaText}`;

  const { output } = await generateText({
    model: "google/gemini-2.5-pro",
    output: Output.object({
      schema: ideaBreakdownSchema
    }),
    system: BREAKDOWN_SYSTEM_PROMPT,
    prompt: contextPrompt,
    temperature: 0.7
  });

  return output;
}
