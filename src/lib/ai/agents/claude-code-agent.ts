import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKAssistantMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { readFile } from "fs/promises";
import path from "path";
import { getImagePath } from "@/lib/image-utils.server";

// --- CLAUDE.md Reader ---

async function readClaudeMd(repoPath: string | null): Promise<string | null> {
  if (!repoPath) return null;
  try {
    const claudeMdPath = path.join(repoPath, "CLAUDE.md");
    return await readFile(claudeMdPath, "utf-8");
  } catch {
    return null; // File doesn't exist or can't be read
  }
}

// --- Types ---

export interface ProjectContext {
  name: string;
  description: string | null;
  stack: string | null;
  repoPath: string | null;
}

export interface FeatureContext {
  title: string;
  description: string | null;
  initialIdea: string | null;
}

export interface ChatImage {
  id: string;
  filename: string;
  mimeType: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: ChatImage[];
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

function buildSystemPrompt(
  project: ProjectContext,
  feature: FeatureContext,
  currentSpecMarkdown: string | null,
  claudeMdContent: string | null
): string {
  const claudeMdSection = claudeMdContent
    ? `## CODEBASE INSTRUCTIONS (from CLAUDE.md)

${claudeMdContent}

---

`
    : "";

  const projectContext = `${claudeMdSection}## PROJECT CONTEXT (READ THIS CAREFULLY)

**Product Name:** ${project.name}

**What This Product Does:**
${project.description || "No description provided."}

**Tech Stack:** ${project.stack || "Not specified"}

You are helping refine features for THIS specific product. Your questions should reference the product's existing capabilities and tech constraints described above.`;

  const featureContext = `

## FEATURE CONTEXT (Always remember this)

**Feature Title:** ${feature.title}
${feature.description ? `**Description:** ${feature.description}` : ""}
${feature.initialIdea ? `**Original Idea:** ${feature.initialIdea}` : ""}`;

  const specContext = currentSpecMarkdown
    ? `

## CURRENT SPEC

The user has an existing spec. When they ask for changes, use the \`mcp__foundry__updateSpec\` tool to propose modifications.

${currentSpecMarkdown}`
    : "";

  return `${projectContext}${featureContext}${specContext}

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

## Git Usage (READ-ONLY)
You can use git commands for understanding the codebase:
- \`git status\` - see current changes
- \`git diff\` - view uncommitted changes
- \`git log\` - view commit history
- \`git show\` - view specific commits

Do NOT use destructive git commands:
- No \`git commit\`, \`git push\`, \`git pull\`
- No \`git reset\`, \`git checkout\`, \`git revert\`
- No \`git branch -d\`, \`git stash\`

## IMPORTANT: AskUserQuestion Behavior
After calling \`AskUserQuestion\`, you MUST stop immediately and wait for the user's response.
- Do NOT continue with codebase exploration or spec generation in the same turn
- Do NOT make assumptions about what the user will answer
- The tool will return with empty answers initially - this is expected
- The user's actual answers will arrive in their next message
- Only then should you continue with the next steps`;
}

// --- Message Formatting ---

// Rough token estimation: ~4 chars per token (conservative)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const MAX_CONVERSATION_TOKENS = 50000; // ~50k tokens for conversation history

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

  // Sliding window: build history from newest, stop at token budget
  const historyMessages: string[] = [];
  let tokenCount = estimateTokens(lastMessage.content);

  // Iterate backwards (newest to oldest), skip the last message
  for (let i = messages.length - 2; i >= 0; i--) {
    const m = messages[i];
    const formatted = `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`;
    const msgTokens = estimateTokens(formatted);

    if (tokenCount + msgTokens > MAX_CONVERSATION_TOKENS) {
      break; // Stop adding older messages
    }

    historyMessages.unshift(formatted); // Add to front (maintain order)
    tokenCount += msgTokens;
  }

  if (historyMessages.length === 0) {
    return lastMessage.content;
  }

  return `Previous conversation:
${historyMessages.join("\n\n")}

Current request:
${lastMessage.content}`;
}

// --- Image Loading ---

interface ImageContent {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

async function loadImageAsBase64(filename: string, mimeType: string): Promise<ImageContent | null> {
  try {
    const imagePath = getImagePath(filename);
    const buffer = await readFile(imagePath);
    const base64 = buffer.toString("base64");
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType,
        data: base64
      }
    };
  } catch (error) {
    console.error(`Failed to load image ${filename}:`, error);
    return null;
  }
}

async function loadImagesForMessage(images: ChatImage[]): Promise<ImageContent[]> {
  const loaded: ImageContent[] = [];
  for (const img of images) {
    const content = await loadImageAsBase64(img.filename, img.mimeType);
    if (content) {
      loaded.push(content);
    }
  }
  return loaded;
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
  feature: FeatureContext,
  currentSpecMarkdown: string | null,
  messages: ChatMessage[],
  thinkingEnabled: boolean = false
): AsyncGenerator<SDKMessage> {
  const foundryTools = createFoundryTools();
  const claudeMdContent = await readClaudeMd(project.repoPath);
  const systemPrompt = buildSystemPrompt(project, feature, currentSpecMarkdown, claudeMdContent);

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
    permissionMode: "default" as const, // Use default to enable canUseTool handler
    maxTurns: 50, // Increased from 12 to allow complex tasks to complete
    ...(thinkingEnabled && { thinkingBudget: 10000 }), // Enable extended thinking when toggle is on

    // Handle AskUserQuestion permission - return empty answers so tool completes without error
    // The agent will wait for user's next message per system prompt instructions
    canUseTool: async (toolName, input) => {
      if (toolName === "AskUserQuestion") {
        const askInput = input as { questions: unknown[]; answers?: Record<string, string> };
        return {
          behavior: "allow" as const,
          updatedInput: {
            ...askInput,
            answers: {} // Empty answers - user will respond in next message
          }
        };
      }

      // Allow all other tools
      return {
        behavior: "allow" as const,
        updatedInput: input
      };
    }
  };

  // Only set cwd if repoPath is provided
  if (project.repoPath) {
    queryOptions.cwd = project.repoPath;
  }

  // Check if the last message has images
  const lastMessage = messages[messages.length - 1];
  const hasImages = lastMessage?.images && lastMessage.images.length > 0;

  let queryResult;

  if (hasImages && lastMessage.images) {
    // Load images and create an async iterable for streaming input mode
    const imageContents = await loadImagesForMessage(lastMessage.images);
    const prompt = formatMessagesAsPrompt(messages);

    // Create content array with text and images
    const content: Array<{ type: "text"; text: string } | ImageContent> = [];

    // Add text content first
    if (prompt) {
      content.push({ type: "text", text: prompt });
    }

    // Add images
    content.push(...imageContents);

    // Create async iterable that yields a single user message with images
    async function* createMessageStream() {
      yield {
        type: "user" as const,
        session_id: "",
        message: {
          role: "user" as const,
          content
        },
        parent_tool_use_id: null
      };
    }

    queryResult = query({
      prompt: createMessageStream(),
      options: queryOptions
    });
  } else {
    // No images - use simple string prompt
    const prompt = formatMessagesAsPrompt(messages);
    queryResult = query({
      prompt,
      options: queryOptions
    });
  }

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
