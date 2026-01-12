import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKAssistantMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// --- Types ---

export interface ProjectContext {
  name: string;
  description: string | null;
  stack: string | null;
  repoPath: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// --- MCP Tools ---

function createFoundryTools() {
  return createSdkMcpServer({
    name: "foundry",
    tools: [
      tool(
        "generateSpec",
        "Generate the spec based on the feature idea and codebase analysis. Only call this AFTER asking clarifying questions and when scope is crystal clear.",
        {
          markdown: z
            .string()
            .describe(
              "The full spec in markdown format with sections: Problem, Solution, User Stories, Acceptance Criteria"
            )
        },
        async ({ markdown }) => ({
          content: [{ type: "text" as const, text: JSON.stringify({ type: "spec", markdown }) }]
        })
      ),
      tool(
        "updateSpec",
        "Propose changes to an existing spec. The user will review the diff before accepting.",
        {
          markdown: z.string().describe("The full revised spec in markdown format"),
          changeSummary: z.string().describe("Brief description of what changed (1-2 sentences)")
        },
        async ({ markdown, changeSummary }) => ({
          content: [{ type: "text" as const, text: JSON.stringify({ type: "update", markdown, changeSummary }) }]
        })
      )
    ]
  });
}

// --- System Prompt ---

function buildSystemPrompt(project: ProjectContext, currentSpecMarkdown: string | null): string {
  const projectContext = `## PROJECT CONTEXT (READ THIS CAREFULLY)

**Product Name:** ${project.name}

**What This Product Does:**
${project.description || "No description provided."}

**Tech Stack:** ${project.stack || "Not specified"}

You are helping refine features for THIS specific product. Your questions should reference the product's existing capabilities and tech constraints described above.`;

  const specContext = currentSpecMarkdown
    ? `

## CURRENT SPEC

The user has an existing spec. When they ask for changes, use the \`mcp__foundry__updateSpec\` tool to propose modifications.

${currentSpecMarkdown}`
    : "";

  return `${projectContext}${specContext}

You are a Product Thinking Partner with access to this project's codebase. Your job is to help the user refine their feature idea through thoughtful questions BEFORE generating a spec.

## Your Process (IN THIS ORDER)
1. **Acknowledge** the idea briefly (1-2 sentences)
2. **Ask clarifying questions** using the \`AskUserQuestion\` tool to understand:
   - Scope: MVP vs full feature? What's in vs out?
   - Priority: What's most important to get right?
   - Edge cases: What happens when things go wrong?
   - Constraints: Timeline, tech limitations, dependencies?
3. **After user answers**, explore the codebase if needed
4. **Generate spec** only when scope is crystal clear

## CRITICAL: Batch Questions Together!
- Do NOT jump straight to codebase exploration or spec generation
- Use \`AskUserQuestion\` with 2-4 questions per call (they appear as tabs for the user)
- Group related questions together (e.g., scope questions, behavior questions, edge case questions)
- Example: Ask about use case, deletion behavior, and cascading in ONE call, not three separate calls

## When to Ask Questions
- The idea is vague or could mean multiple things
- You're unsure about MVP scope vs full vision
- There are obvious tradeoffs to discuss (speed vs quality, simple vs flexible)
- Edge cases and error handling aren't specified
- Integration with existing features is unclear

## Signs You're NOT Ready for Spec
- User hasn't confirmed what's in/out of scope
- You're making assumptions about behavior
- Edge cases haven't been discussed
- You haven't explored how this fits with existing code

## Spec Markdown Format (use ONLY after questions are answered)
\`\`\`markdown
# Feature Title

## Problem

2-4 sentences describing the problem this feature solves.

## Solution

2-4 sentences describing the high-level approach.

## User Stories

- As a **[role]**, I want **[action]**, so that **[benefit]**

## Acceptance Criteria

1. **Given** [context], **When** [action], **Then** [outcome]

## Implementation Notes

Based on codebase analysis:
- Relevant files: [list key files]
- Patterns to follow: [existing patterns]
- Integration points: [connections to existing code]
\`\`\`

## Guidelines
- Questions first, exploration second, spec last
- Be opinionated - suggest what you think makes sense
- Reference the project context in your questions
- If updating existing spec, use \`mcp__foundry__updateSpec\` instead

## IMPORTANT: AskUserQuestion Behavior
After calling \`AskUserQuestion\`, you MUST stop immediately and wait for the user's response.
- Do NOT continue with codebase exploration or spec generation in the same turn
- Do NOT make assumptions about what the user will answer
- The user will see your questions, answer them, and you'll receive their answers in the next message
- Only then should you continue with the next steps`;
}

// --- Message Formatting ---

function formatMessagesAsPrompt(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return "";
  }

  // For Claude Code SDK, we format messages as a conversation string
  // The last user message is the current prompt
  const lastMessage = messages[messages.length - 1];

  if (messages.length === 1) {
    return lastMessage.content;
  }

  // Include conversation history as context
  const history = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  return `Previous conversation:
${history}

Current request:
${lastMessage.content}`;
}

// --- Exported Types for Message Handling ---

export type FoundrySDKMessage = SDKMessage;

export function isAssistantMessage(msg: SDKMessage): msg is SDKAssistantMessage {
  return msg.type === "assistant";
}

export function isResultMessage(msg: SDKMessage): msg is SDKResultMessage {
  return msg.type === "result";
}

// --- Factory Function ---

/**
 * Create an async generator that streams Claude Code SDK messages.
 *
 * This wraps the Claude Code SDK query() function and yields messages
 * as they arrive, allowing the API route to stream them to the client.
 */
export async function* createClaudeCodeStream(
  project: ProjectContext,
  currentSpecMarkdown: string | null,
  messages: ChatMessage[]
): AsyncGenerator<SDKMessage> {
  const foundryTools = createFoundryTools();
  const systemPrompt = buildSystemPrompt(project, currentSpecMarkdown);
  const prompt = formatMessagesAsPrompt(messages);

  // Configure allowed tools
  const allowedTools = [
    "Read",
    "Glob",
    "Grep", // Codebase understanding
    "Bash", // Build/lint commands
    "AskUserQuestion", // Clarifying questions - agent MUST stop after calling
    "TodoWrite", // Task tracking
    "mcp__foundry__generateSpec",
    "mcp__foundry__updateSpec"
  ];

  const queryOptions: Parameters<typeof query>[0]["options"] = {
    systemPrompt,
    mcpServers: { foundry: foundryTools },
    allowedTools,
    permissionMode: "acceptEdits" as const,
    maxTurns: 50 // Increased from 12 to allow complex tasks to complete
  };

  // Only set cwd if repoPath is provided
  if (project.repoPath) {
    queryOptions.cwd = project.repoPath;
  }

  const queryResult = query({
    prompt,
    options: queryOptions
  });

  // Yield messages as they stream
  for await (const message of queryResult) {
    yield message;
  }
}

/**
 * Extract tool calls from an assistant message.
 * Useful for detecting when generatePRD or updatePRD is called.
 */
export function extractToolCalls(message: SDKAssistantMessage): Array<{
  name: string;
  input: unknown;
  id: string;
}> {
  const toolCalls: Array<{ name: string; input: unknown; id: string }> = [];

  for (const block of message.message.content) {
    if (block.type === "tool_use") {
      toolCalls.push({
        name: block.name,
        input: block.input,
        id: block.id
      });
    }
  }

  return toolCalls;
}

/**
 * Extract text content from an assistant message.
 */
export function extractTextContent(message: SDKAssistantMessage): string {
  const textParts: string[] = [];

  for (const block of message.message.content) {
    if (block.type === "text") {
      textParts.push(block.text);
    }
  }

  return textParts.join("\n");
}
