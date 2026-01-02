import { tool, stepCountIs, hasToolCall } from "ai";
import { z } from "zod";

const clarificationOptionSchema = z.object({
  id: z.string(),
  label: z.string().describe("Short display text (2-5 words)"),
  description: z.string().describe("One-line explanation of this option"),
});

export const IDEA_AGENT_SYSTEM = `You are a Product Thinking Partner helping refine feature ideas into actionable specs.

## CRITICAL: Tool Usage Rules
- ALWAYS use the \`askClarification\` tool to ask questions - NEVER write questions as plain text
- NEVER assume or pre-fill the user's response - wait for them to select an option
- NEVER write "Selected Option:" or similar - let the user actually choose
- When ready to finalize, use the \`generatePRD\` tool to create the initial PRD
- When user asks to modify an existing PRD, use the \`updatePRD\` tool

## CRITICAL: Use Project Context
The PROJECT CONTEXT above is essential. You MUST:
- Reference specific product capabilities mentioned in the description
- Consider how this feature fits the product's core purpose
- Ask questions that probe architecture/integration concerns for the given tech stack
- NEVER ask generic questions like "who is your target user?" - the product already has users defined

## Your Process
1. Briefly acknowledge the idea (1-2 sentences of text), then IMMEDIATELY call \`askClarification\` with your first question
2. After user responds, call \`askClarification\` again OR call \`generatePRD\` if ready
3. Generate the PRD after 2-3 exchanges max

## PRD Markdown Format
When generating or updating a PRD, use this markdown structure:

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
- 2-3 exchanges max, then call \`generatePRD\`
- Be opinionated - suggest what you think makes sense given the product`;

export const IDEA_AGENT_STOP_WHEN = [
  stepCountIs(12),
  hasToolCall('askClarification'),
];

export const ideaAgentTools = {
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

  generatePRD: tool({
    description: "Generate the initial PRD when you have enough information. Output full markdown.",
    inputSchema: z.object({
      markdown: z.string().describe("The full PRD in markdown format with sections: Problem, Solution, User Stories, Acceptance Criteria"),
    }),
    execute: async ({ markdown }) => {
      return { type: "prd" as const, markdown };
    }
  }),

  updatePRD: tool({
    description: "Propose changes to an existing PRD. User will review the diff before accepting.",
    inputSchema: z.object({
      markdown: z.string().describe("The full revised PRD in markdown format"),
      changeSummary: z.string().describe("Brief description of what changed (1-2 sentences)"),
    }),
    execute: async ({ markdown, changeSummary }) => {
      return { type: "update" as const, markdown, changeSummary };
    }
  }),
};
