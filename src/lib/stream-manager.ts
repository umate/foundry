/**
 * Stream Manager - Extracted SSE streaming logic for background chat processing
 */

import type { DisplayMessage, MessagePart, ClarificationQuestion, TodoItem } from "./hooks/use-claude-code-chat";

export type ChatStatus = "idle" | "streaming" | "ready" | "error";

interface SSEEvent {
  type: "text" | "activity" | "tool_use" | "tool_result" | "done" | "error" | "raw" | "file_search_result" | "file_read_result" | "file_write_result" | "file_edit_result" | "bash_result" | "tool_error" | "clarification" | "todo_list";
  content?: string;
  message?: string;
  name?: string;
  input?: unknown;
  output?: {
    type: string;
    markdown?: string;
    changeSummary?: string;
    wireframe?: string;
  };
  result?: string;
  cost?: number;
  turns?: number;
  messageType?: string;
  data?: unknown;
  files?: string[];
  count?: number;
  path?: string;
  lineCount?: number;
  command?: string;
  bashOutput?: string;
  exitCode?: number;
  questions?: ClarificationQuestion[];
  todos?: TodoItem[];
  error?: string;
}

export interface StreamCallbacks {
  onStatusChange: (status: ChatStatus) => void;
  onMessagesUpdate: (messages: DisplayMessage[]) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  onSpecGenerated?: (markdown: string) => void;
  onPendingChange?: (markdown: string, changeSummary: string) => void;
  onWireframeGenerated?: (wireframe: string) => void;
}

export interface StreamController {
  stop: () => void;
  isActive: () => boolean;
}

let messageIdCounter = 0;

function generateId(): string {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}`;
}

export async function startStream(
  featureId: string,
  messages: DisplayMessage[],
  currentSpecMarkdown: string | undefined,
  thinkingEnabled: boolean,
  viewMode: "pm" | "dev",
  callbacks: StreamCallbacks,
  abortController: AbortController
): Promise<void> {
  // Track notification state per stream
  let specNotified = false;
  let updateNotified = false;
  let wireframeNotified = false;
  let eventCount = 0;

  console.log(`[StreamManager] Starting stream for feature: ${featureId}`);

  // Add user message is already done by context, just start streaming
  callbacks.onStatusChange("streaming");

  // Prepare messages for API - include images if present
  const apiMessages = messages.map((m) => {
    // Extract text content
    const textContent = m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    // Extract images
    const images = m.parts
      .filter((p): p is { type: "image"; imageId: string; filename: string; mimeType: string } => p.type === "image")
      .map((p) => ({ id: p.imageId, filename: p.filename, mimeType: p.mimeType }));

    return {
      role: m.role,
      content: textContent,
      ...(images.length > 0 && { images })
    };
  });

  try {
    const response = await fetch(`/api/features/${featureId}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: apiMessages,
        currentSpecMarkdown,
        thinkingEnabled,
        viewMode
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Create assistant message
    const assistantId = generateId();
    const assistantParts: MessagePart[] = [];

    const updateAssistantMessage = () => {
      const assistantMessage: DisplayMessage = {
        id: assistantId,
        role: "assistant",
        parts: [...assistantParts]
      };

      // Update messages - either append or update existing
      const updatedMessages = [...messages];
      const existingIdx = updatedMessages.findIndex((m) => m.id === assistantId);
      if (existingIdx >= 0) {
        updatedMessages[existingIdx] = assistantMessage;
      } else {
        updatedMessages.push(assistantMessage);
      }
      callbacks.onMessagesUpdate(updatedMessages);
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            console.log(`[StreamManager] Received [DONE] marker`);
            continue;
          }

          try {
            const event: SSEEvent = JSON.parse(data);
            eventCount++;
            console.log(`[StreamManager] Event #${eventCount}: type=${event.type}`, event.name ? `name=${event.name}` : "");

            switch (event.type) {
              case "text":
                if (event.content) {
                  const lastPart = assistantParts[assistantParts.length - 1];
                  if (lastPart?.type === "text") {
                    lastPart.text += "\n" + event.content;
                  } else {
                    assistantParts.push({ type: "text", text: event.content });
                  }
                  updateAssistantMessage();
                } else {
                  // Text event without content - emit raw for debugging
                  assistantParts.push({
                    type: "raw",
                    messageType: "text_empty",
                    data: event
                  });
                  updateAssistantMessage();
                }
                break;

              case "activity":
                if (event.message) {
                  assistantParts.push({ type: "activity", message: event.message });
                  updateAssistantMessage();
                } else {
                  // Activity event without message - emit raw for debugging
                  assistantParts.push({
                    type: "raw",
                    messageType: "activity_empty",
                    data: event
                  });
                  updateAssistantMessage();
                }
                break;

              case "tool_result":
                if (event.name === "generateSpec" && event.output?.markdown) {
                  assistantParts.push({
                    type: "tool-generateSpec",
                    markdown: event.output.markdown
                  });
                  updateAssistantMessage();
                  if (!specNotified && callbacks.onSpecGenerated) {
                    specNotified = true;
                    callbacks.onSpecGenerated(event.output.markdown);
                  }
                } else if (event.name === "updateSpec" && event.output?.markdown && event.output?.changeSummary) {
                  assistantParts.push({
                    type: "tool-updateSpec",
                    markdown: event.output.markdown,
                    changeSummary: event.output.changeSummary
                  });
                  updateAssistantMessage();
                  if (!updateNotified && callbacks.onPendingChange) {
                    updateNotified = true;
                    callbacks.onPendingChange(event.output.markdown, event.output.changeSummary);
                  }
                } else if (event.name === "generateWireframe" && event.output?.wireframe) {
                  console.log('[StreamManager] Wireframe event received', { wireframeLength: event.output.wireframe?.length });
                  assistantParts.push({
                    type: "tool-generateWireframe",
                    wireframe: event.output.wireframe
                  });
                  updateAssistantMessage();
                  console.log('[StreamManager] Checking wireframe callback', { wireframeNotified, hasCallback: !!callbacks.onWireframeGenerated });
                  if (!wireframeNotified && callbacks.onWireframeGenerated) {
                    wireframeNotified = true;
                    console.log('[StreamManager] Calling onWireframeGenerated callback');
                    callbacks.onWireframeGenerated(event.output.wireframe);
                  }
                } else {
                  // Fallback for any other tool_result - emit raw for visibility
                  assistantParts.push({
                    type: "raw",
                    messageType: `tool_result:${event.name || "unknown"}`,
                    data: event.output || event
                  });
                  updateAssistantMessage();
                }
                break;

              case "tool_use":
                if (event.name) {
                  assistantParts.push({
                    type: "tool-use",
                    name: event.name,
                    input: event.input
                  });
                  updateAssistantMessage();
                } else {
                  // Tool use without name - emit raw for debugging
                  assistantParts.push({
                    type: "raw",
                    messageType: "tool_use_unnamed",
                    data: event
                  });
                  updateAssistantMessage();
                }
                break;

              case "file_search_result":
                if (event.files) {
                  assistantParts.push({
                    type: "file-search-result",
                    files: event.files,
                    count: event.count || event.files.length
                  });
                  updateAssistantMessage();
                } else {
                  // File search result without files - emit raw for debugging
                  assistantParts.push({
                    type: "raw",
                    messageType: "file_search_empty",
                    data: event
                  });
                  updateAssistantMessage();
                }
                break;

              case "file_read_result":
                if (event.path) {
                  assistantParts.push({
                    type: "file-read-result",
                    path: event.path,
                    lineCount: event.lineCount
                  });
                  updateAssistantMessage();
                } else {
                  // File read result without path - emit raw for debugging
                  assistantParts.push({
                    type: "raw",
                    messageType: "file_read_empty",
                    data: event
                  });
                  updateAssistantMessage();
                }
                break;

              case "file_write_result":
                if (event.path) {
                  assistantParts.push({
                    type: "file-write-result",
                    path: event.path
                  });
                  updateAssistantMessage();
                }
                break;

              case "file_edit_result":
                if (event.path) {
                  assistantParts.push({
                    type: "file-edit-result",
                    path: event.path
                  });
                  updateAssistantMessage();
                }
                break;

              case "bash_result":
                assistantParts.push({
                  type: "bash-result",
                  command: event.command,
                  output: event.bashOutput || "",
                  exitCode: event.exitCode
                });
                updateAssistantMessage();
                break;

              case "tool_error": {
                const error = event.error || "Unknown error";
                // Filter out file-not-found errors from agent path guessing
                const isFileNotFoundError = error.includes("File does not exist") ||
                                            error.includes("does not exist");
                if (!isFileNotFoundError) {
                  assistantParts.push({
                    type: "tool-error",
                    error
                  });
                  updateAssistantMessage();
                }
                break;
              }

              case "raw":
                assistantParts.push({
                  type: "raw",
                  messageType: event.messageType || "unknown",
                  data: event.data
                });
                updateAssistantMessage();
                break;

              case "clarification":
                if (event.questions && Array.isArray(event.questions)) {
                  assistantParts.push({
                    type: "clarification",
                    questions: event.questions
                  });
                  updateAssistantMessage();
                } else {
                  // Clarification event without valid questions - emit raw for debugging
                  assistantParts.push({
                    type: "raw",
                    messageType: "clarification_invalid",
                    data: event
                  });
                  updateAssistantMessage();
                }
                break;

              case "todo_list":
                if (event.todos && Array.isArray(event.todos)) {
                  assistantParts.push({
                    type: "todo-list",
                    todos: event.todos
                  });
                  updateAssistantMessage();
                }
                break;

              case "done":
                console.log(`[StreamManager] Received done event, total events: ${eventCount}`);
                callbacks.onStatusChange("ready");
                callbacks.onComplete();
                break;

              case "error":
                console.error(`[StreamManager] Received error event:`, event.message);
                throw new Error(event.message || "Unknown error");

              default:
                console.log(`[StreamManager] Unhandled event type: ${event.type}, adding as raw`);
                assistantParts.push({
                  type: "raw",
                  messageType: event.type,
                  data: event
                });
                updateAssistantMessage();
            }
          } catch (e) {
            console.error("[StreamManager] Failed to parse SSE event:", e, data);
          }
        }
      }
    }

    console.log(`[StreamManager] Stream reader loop ended. Total events processed: ${eventCount}, assistant parts: ${assistantParts.length}`);
    callbacks.onStatusChange("ready");
    callbacks.onComplete();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.log(`[StreamManager] Stream aborted by user`);
      callbacks.onStatusChange("ready");
      return;
    }
    console.error(`[StreamManager] Stream error:`, err);
    const error = err instanceof Error ? err : new Error("Unknown error");
    callbacks.onError(error);
    callbacks.onStatusChange("error");
  }
}
