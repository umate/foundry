import { NextRequest } from "next/server";
import {
  createClaudeCodeStream,
  isAssistantMessage,
  isResultMessage,
  extractTextContent,
  extractToolCalls,
  type ChatMessage
} from "@/lib/ai/agents/claude-code-agent";
import { featureRepository } from "@/db/repositories/feature.repository";
import { projectRepository } from "@/db/repositories/project.repository";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

/**
 * Transform Claude Code SDK messages to a format compatible with the UI.
 *
 * We emit Server-Sent Events with the following types:
 * - { type: "text", content: "..." } - Assistant text
 * - { type: "tool_use", name: "...", input: {...} } - Tool being called
 * - { type: "tool_result", name: "...", output: {...} } - Tool result (for PRD/update)
 * - { type: "activity", message: "..." } - Codebase exploration activity
 * - { type: "file_search_result", files: [...], count: N } - Glob/Grep results
 * - { type: "file_read_result", path: "...", lineCount: N } - Read results
 * - { type: "bash_result", command: "...", output: "..." } - Bash results
 * - { type: "clarification", questions: [...] } - AskUserQuestion clarification
 * - { type: "done" } - Stream complete
 * - { type: "error", message: "..." } - Error occurred
 *
 * Messages we skip (don't emit):
 * - { type: "system", subtype: "init" } - Internal session initialization
 */

// Type guards for SDK message types
interface SDKSystemMessage {
  type: "system";
  subtype?: string;
}

interface SDKUserMessage {
  type: "user";
  message?: {
    content?: Array<{
      type: "tool_result";
      tool_use_id?: string;
      content?: string;
    }>;
  };
  tool_use_result?: {
    filenames?: string[];
    numFiles?: number;
    file?: {
      filePath?: string;
      numLines?: number;
    };
    // Bash results
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    // TodoWrite results
    oldTodos?: unknown;
    newTodos?: unknown;
    // Edit tool results
    type?: string;
    structuredPatch?: unknown;
    filePath?: string;
    // Error results
    error?: string | unknown;
  };
}

function isSystemMessage(msg: SDKMessage): msg is SDKMessage & SDKSystemMessage {
  return (msg as SDKSystemMessage).type === "system";
}

function isUserMessage(msg: SDKMessage): msg is SDKMessage & SDKUserMessage {
  return (msg as SDKUserMessage).type === "user";
}

export const runtime = "nodejs"; // Claude Code SDK requires Node.js runtime

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: featureId } = await params;

  // Get feature and project
  const feature = await featureRepository.findById(featureId);
  if (!feature) {
    return new Response(JSON.stringify({ error: "Feature not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const project = await projectRepository.findById(feature.projectId);
  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Parse request body
  const body = await req.json();
  const rawMessages: Array<{
    role: "user" | "assistant";
    content: string;
    images?: Array<{ id: string; filename: string; mimeType: string }>;
  }> = body.messages || [];
  const currentSpecMarkdown: string | null = body.currentSpecMarkdown ?? null;
  const thinkingEnabled: boolean = body.thinkingEnabled ?? false;
  const viewMode: "pm" | "dev" = body.viewMode === "dev" ? "dev" : "pm";

  if (!Array.isArray(rawMessages)) {
    return new Response(JSON.stringify({ error: "Messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Convert to ChatMessage format (which now supports images)
  const messages: ChatMessage[] = rawMessages.map((m) => ({
    role: m.role,
    content: m.content,
    images: m.images
  }));

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        const eventType = (data as { type?: string }).type || "unknown";
        console.log(`[Agent] Sending SSE event: type=${eventType}`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Track tool calls to map tool_use_id to tool name
        const toolCallMap = new Map<string, { name: string; input: unknown }>();
        let messageCount = 0;

        console.log("[Agent] Starting stream for feature:", featureId);

        for await (const message of createClaudeCodeStream(
          {
            name: project.name,
            description: project.description,
            stack: project.stack,
            repoPath: project.repoPath
          },
          {
            title: feature.title,
            description: feature.description,
            initialIdea: feature.initialIdea
          },
          currentSpecMarkdown,
          messages,
          thinkingEnabled,
          viewMode
        )) {
          messageCount++;
          const msgType = (message as { type?: string }).type || "unknown";
          const msgSubtype = (message as { subtype?: string }).subtype;
          console.log(`[Agent] Message #${messageCount}: type=${msgType}${msgSubtype ? `, subtype=${msgSubtype}` : ""}`);

          // Skip system init messages entirely
          if (isSystemMessage(message)) {
            console.log(`[Agent] Skipping system message`);
            continue;
          }

          // Handle user messages (tool results)
          if (isUserMessage(message)) {
            console.log(`[Agent] Processing user message`);
            const toolResult = message.tool_use_result;
            let handledToolResult = false;

            if (toolResult) {
              console.log(`[Agent] User message has tool_use_result:`, Object.keys(toolResult));
              // Check if this is a file search result (Glob/Grep)
              if (toolResult.filenames && Array.isArray(toolResult.filenames)) {
                const files = toolResult.filenames
                  .filter((f: string) => !f.includes("node_modules"))
                  .map((f: string) => f.split("/").slice(-2).join("/"));
                sendEvent({
                  type: "file_search_result",
                  files: files.slice(0, 5), // Show max 5 files
                  count: toolResult.numFiles || files.length
                });
                handledToolResult = true;
              }
              // Check if this is a file read result
              else if (toolResult.file?.filePath) {
                const path = toolResult.file.filePath.split("/").slice(-2).join("/");
                sendEvent({
                  type: "file_read_result",
                  path,
                  lineCount: toolResult.file.numLines
                });
                handledToolResult = true;
              }
              // Check if this is a bash result
              else if (toolResult.stdout !== undefined || toolResult.stderr !== undefined) {
                sendEvent({
                  type: "bash_result",
                  bashOutput: toolResult.stdout || toolResult.stderr || "",
                  exitCode: toolResult.exitCode
                });
                handledToolResult = true;
              }
              // TodoWrite results are handled silently - we already showed the list when the tool was called
              else if (toolResult.oldTodos !== undefined || toolResult.newTodos !== undefined) {
                handledToolResult = true;
              }
              // Check if this is an Edit tool result (file update)
              else if (toolResult.type === "update" || toolResult.structuredPatch) {
                const path = (toolResult.filePath as string)?.split("/").slice(-2).join("/") || "file";
                sendEvent({
                  type: "file_edit_result",
                  path
                });
                handledToolResult = true;
              }
              // Check if this is an error result (string or has error property)
              else if (typeof toolResult === "string" || toolResult.error) {
                const errorMsg = typeof toolResult === "string"
                  ? toolResult
                  : toolResult.error;
                sendEvent({
                  type: "tool_error",
                  error: typeof errorMsg === "string" ? errorMsg.slice(0, 100) : "Unknown error"
                });
                handledToolResult = true;
              }

              // Emit raw for any tool result that wasn't handled above
              if (!handledToolResult) {
                sendEvent({
                  type: "raw",
                  messageType: "unhandled_tool_result",
                  data: toolResult
                });
              }
            }
            continue;
          }

          // Handle different message types
          if (isAssistantMessage(message)) {
            console.log(`[Agent] Processing assistant message`);
            // Extract and send text content
            const text = extractTextContent(message);
            if (text) {
              console.log(`[Agent] Assistant has text content (${text.length} chars)`);
              sendEvent({ type: "text", content: text });
            }

            // Extract and send tool calls
            const toolCalls = extractToolCalls(message);
            console.log(`[Agent] Assistant has ${toolCalls.length} tool calls`);
            for (const toolCall of toolCalls) {
              // Store tool call for matching with results
              toolCallMap.set(toolCall.id, { name: toolCall.name, input: toolCall.input });

              // Check if it's a codebase exploration tool
              if (["Read", "Glob", "Grep"].includes(toolCall.name)) {
                // Send as activity indicator
                const input = toolCall.input as Record<string, unknown>;
                let activityMessage = "";

                if (toolCall.name === "Read") {
                  const path = input.file_path as string;
                  activityMessage = `Reading ${path.split("/").slice(-2).join("/")}`;
                } else if (toolCall.name === "Glob") {
                  activityMessage = `Searching for ${input.pattern}`;
                } else if (toolCall.name === "Grep") {
                  activityMessage = `Searching code for "${input.pattern}"`;
                }

                sendEvent({ type: "activity", message: activityMessage });
              } else if (toolCall.name === "Bash") {
                // Bash command - send activity with command preview
                const input = toolCall.input as { command?: string };
                const cmd = input.command || "";
                const cmdPreview = cmd.length > 50 ? cmd.slice(0, 47) + "..." : cmd;
                sendEvent({ type: "activity", message: `Running: ${cmdPreview}` });
              } else if (toolCall.name === "Write") {
                // Write file - send activity and result
                const input = toolCall.input as { file_path?: string };
                const path = input.file_path?.split("/").slice(-2).join("/") || "file";
                sendEvent({ type: "activity", message: `Writing ${path}` });
                sendEvent({ type: "file_write_result", path });
              } else if (toolCall.name === "Edit") {
                // Edit file - send activity and result
                const input = toolCall.input as { file_path?: string };
                const path = input.file_path?.split("/").slice(-2).join("/") || "file";
                sendEvent({ type: "activity", message: `Editing ${path}` });
                sendEvent({ type: "file_edit_result", path });
              } else if (toolCall.name === "mcp__foundry__generateSpec") {
                // Spec generation - extract the markdown from tool input
                const input = toolCall.input as { markdown: string };
                sendEvent({
                  type: "tool_result",
                  name: "generateSpec",
                  output: { type: "spec", markdown: input.markdown }
                });
              } else if (toolCall.name === "mcp__foundry__updateSpec") {
                // Spec update - extract markdown and summary
                const input = toolCall.input as { markdown: string; changeSummary: string };
                sendEvent({
                  type: "tool_result",
                  name: "updateSpec",
                  output: { type: "update", markdown: input.markdown, changeSummary: input.changeSummary }
                });
              } else if (toolCall.name === "mcp__foundry__generateWireframe") {
                // Wireframe generation - extract the wireframe from tool input
                const input = toolCall.input as { wireframe: string };
                sendEvent({
                  type: "tool_result",
                  name: "generateWireframe",
                  output: { type: "wireframe", wireframe: input.wireframe }
                });
              } else if (toolCall.name === "AskUserQuestion" || toolCall.name === "mcp__foundry__askClarification") {
                // Clarification questions - emit as clarification event
                const input = toolCall.input as {
                  questions?: Array<{
                    question: string;
                    header: string;
                    options: Array<{ label: string; description: string }>;
                    multiSelect: boolean;
                  }>;
                  // Single question format (from askClarification tool)
                  question?: string;
                  options?: Array<{ id: string; label: string; description: string }>;
                };

                // Handle both multi-question and single-question formats
                if (input.questions && Array.isArray(input.questions)) {
                  sendEvent({
                    type: "clarification",
                    questions: input.questions
                  });
                } else if (input.question && input.options) {
                  // Convert single question format to array format
                  sendEvent({
                    type: "clarification",
                    questions: [{
                      question: input.question,
                      header: "Question",
                      options: input.options.map(opt => ({ label: opt.label, description: opt.description })),
                      multiSelect: false
                    }]
                  });
                }
              } else if (toolCall.name === "TodoWrite") {
                // Task tracking - emit as todo_list event
                const input = toolCall.input as {
                  todos: Array<{ content: string; status: string; activeForm: string }>
                };
                sendEvent({
                  type: "todo_list",
                  todos: input.todos || []
                });
              } else {
                // Other tool calls
                sendEvent({
                  type: "tool_use",
                  name: toolCall.name,
                  input: toolCall.input
                });
              }
            }
          } else if (isResultMessage(message)) {
            // Stream complete
            console.log(`[Agent] Result message received: subtype=${message.subtype}, cost=${message.total_cost_usd}, turns=${message.num_turns}`);
            sendEvent({
              type: "done",
              result: message.subtype,
              cost: message.total_cost_usd,
              turns: message.num_turns
            });
          } else {
            // Emit any other unhandled message types as raw for debugging
            console.log(`[Agent] Unhandled message type, emitting as raw:`, message);
            sendEvent({
              type: "raw",
              messageType: "unknown_sdk_message",
              data: message
            });
          }
        }
        console.log(`[Agent] Stream loop ended. Total messages processed: ${messageCount}`);
      } catch (error) {
        console.error("[Agent] Claude Code agent error:", error);
        sendEvent({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        });
        // Always send done after error so client doesn't stay stuck in streaming state
        sendEvent({ type: "done", result: "error" });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
