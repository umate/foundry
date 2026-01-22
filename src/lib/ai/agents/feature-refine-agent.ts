import { tool, stepCountIs, hasToolCall, streamText, convertToModelMessages } from "ai";
import { z } from "zod";
import type { UIMessage } from "ai";

// --- Types ---

interface ProjectContext {
  name: string;
  description: string | null;
  stack: string | null;
}

// --- Internal Constants ---

const MODEL = "google/gemini-3-pro-preview";

const clarificationOptionSchema = z.object({
  id: z.string(),
  label: z.string().describe("Short display text (2-5 words)"),
  description: z.string().describe("One-line explanation of this option")
});

const SYSTEM_PROMPT = `You are a Product Thinking Partner helping refine feature ideas into actionable specs.

## CRITICAL: Tool Usage Rules
- ALWAYS use the \`askClarification\` tool to ask questions - NEVER write questions as plain text
- NEVER assume or pre-fill the user's response - wait for them to select an option
- NEVER write "Selected Option:" or similar - let the user actually choose
- When ready to finalize, use the \`generateSpec\` tool to create the initial spec
- When user asks to modify an existing spec, use the \`updateSpec\` tool

## CRITICAL: Use Project Context
The PROJECT CONTEXT above is essential. You MUST:
- Reference specific product capabilities mentioned in the description
- Consider how this feature fits the product's core purpose
- Ask questions that probe architecture/integration concerns for the given tech stack
- NEVER ask generic questions like "who is your target user?" - the product already has users defined

## Your Process
1. Briefly acknowledge the idea (1-2 sentences of text), then IMMEDIATELY call \`askClarification\` with your first question
2. After user responds, call \`askClarification\` again OR call \`generateSpec\` if ready
3. Generate the spec after 2-3 exchanges max

## Spec Markdown Format
When generating or updating a spec, use this markdown structure:

\`\`\`markdown
# Feature Title

## Problem

2-4 sentences describing the problem this feature solves.

## Solution

2-4 sentences describing the high-level approach.

## User Stories

- As a **[role]**, I want **[action]**, so that **[benefit]**
- As a **[role]**, I want **[action]**, so that **[benefit]**

## Acceptance Criteria

1. **Given** [context], **When** [action], **Then** [outcome]
2. **Given** [context], **When** [action], **Then** [outcome]
\`\`\`

## Good Questions (Context-Aware)
Instead of "Who is the main user?", ask things like:
- "Should this integrate with the existing [X feature] or be standalone?"
- "What's the trigger - manual action or automated based on [existing flow]?"
- "MVP: just [simple approach] or full [complex approach] from the start?"
- "Any constraints from [tech stack component]?"

## Bad Questions (Too Generic - AVOID)
- "Who is your target user?"
- "What problem does this solve?"
- "What does success look like?"
These are product-level questions. The product context already answers them.

## Guidelines
- Ask ONE question at a time using \`askClarification\`
- Options must be specific tradeoffs, not "Yes/No/Maybe"
- 2-3 exchanges max, then call \`generateSpec\`
- Be opinionated - suggest what you think makes sense given the product`;

const STOP_WHEN = [stepCountIs(12), hasToolCall("askClarification")];

const tools = {
  askClarification: tool({
    description: "Present a clarifying question with clickable options",
    inputSchema: z.object({
      question: z.string().describe("The clarifying question"),
      options: z.array(clarificationOptionSchema).min(2).max(4)
    }),
    execute: async ({ question, options }) => {
      return { type: "clarification" as const, question, options };
    }
  }),

  generateSpec: tool({
    description: "Generate the initial spec when you have enough information. Output full markdown.",
    inputSchema: z.object({
      markdown: z
        .string()
        .describe("The full spec in markdown format with sections: Problem, Solution, User Stories, Acceptance Criteria")
    }),
    execute: async ({ markdown }) => {
      return { type: "spec" as const, markdown };
    }
  }),

  updateSpec: tool({
    description: "Propose changes to an existing spec. User will review the diff before accepting.",
    inputSchema: z.object({
      markdown: z.string().describe("The full revised spec in markdown format"),
      changeSummary: z.string().describe("Brief description of what changed (1-2 sentences)")
    }),
    execute: async ({ markdown, changeSummary }) => {
      return { type: "update" as const, markdown, changeSummary };
    }
  }),

  // Wireframe generation disabled - ASCII art alignment issues
  // generateWireframe: tool({
  //   description: "Generate an ASCII wireframe showing the main UI layout. Use only box-drawing characters (┌ ┐ └ ┘ │ ─) to create a visual representation. No component names or annotations inside boxes - just visual structure with placeholder text.",
  //   inputSchema: z.object({
  //     wireframe: z.string().describe("ASCII art wireframe using box-drawing characters only, showing layout structure without component names")
  //   }),
  //   execute: async ({ wireframe }) => {
  //     return { type: "wireframe" as const, wireframe };
  //   }
  // })
};

// --- Internal Helpers ---

function buildProjectContext(project: ProjectContext): string {
  return `## PROJECT CONTEXT (READ THIS CAREFULLY)

**Product Name:** ${project.name}

**What This Product Does:**
${project.description || "No description provided."}

**Tech Stack:** ${project.stack || "Not specified"}

You are helping refine features for THIS specific product. Your questions should reference the product's existing capabilities and tech constraints described above.`;
}

function buildSpecContext(currentSpecMarkdown: string | null): string {
  if (!currentSpecMarkdown) return "";

  return `

## CURRENT SPEC

The user has an existing spec. When they ask for changes, use the \`updateSpec\` tool to propose modifications.

${currentSpecMarkdown}`;
}

// --- Factory Function ---

/**
 * Create a streaming response for the feature refinement agent.
 *
 * This encapsulates:
 * - Project context building
 * - Spec context composition
 * - System prompt assembly
 * - Model selection
 * - Tools and stop conditions
 */
export async function createFeatureRefineAgentStream(
  project: ProjectContext,
  currentSpecMarkdown: string | null,
  messages: UIMessage[]
): Promise<Response> {
  const projectContext = buildProjectContext(project);
  const specContext = buildSpecContext(currentSpecMarkdown);
  const systemPrompt = `${projectContext}${specContext}

${SYSTEM_PROMPT}`;

  const result = streamText({
    model: MODEL,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: STOP_WHEN,
    tools
  });

  return result.toUIMessageStreamResponse();
}
