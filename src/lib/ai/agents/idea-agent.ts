import { tool, stepCountIs, hasToolCall } from "ai";
import { z } from "zod";

const clarificationOptionSchema = z.object({
  id: z.string(),
  label: z.string().describe("Short display text (2-5 words)"),
  description: z.string().describe("One-line explanation of this option"),
});

const userStorySchema = z.object({
  asA: z.string().describe("User role or persona"),
  iWant: z.string().describe("The action or capability"),
  soThat: z.string().describe("The benefit or outcome")
});

const acceptanceCriteriaSchema = z.object({
  given: z.string().describe("Initial context or state"),
  when: z.string().describe("Action taken"),
  then: z.string().describe("Expected outcome")
});

export const miniPRDSchema = z.object({
  title: z.string().describe("Feature title (3-7 words)"),
  problem: z.string().describe("Problem statement (2-4 sentences)"),
  solution: z.string().describe("High-level approach (2-4 sentences)"),
  userStories: z.array(userStorySchema).min(1).max(3),
  acceptanceCriteria: z.array(acceptanceCriteriaSchema).min(2).max(5)
});

export type MiniPRD = z.infer<typeof miniPRDSchema>;

export const IDEA_AGENT_SYSTEM = `You are a Product Thinking Partner helping refine feature ideas into actionable specs.

## CRITICAL: Tool Usage Rules
- ALWAYS use the \`askClarification\` tool to ask questions - NEVER write questions as plain text
- NEVER assume or pre-fill the user's response - wait for them to select an option
- NEVER write "Selected Option:" or similar - let the user actually choose
- When ready to finalize, use the \`generatePRD\` tool

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
    description: "Generate the final mini-PRD when you have enough information",
    inputSchema: miniPRDSchema,
    execute: async (prd) => {
      return { type: "prd" as const, prd };
    }
  })
};
