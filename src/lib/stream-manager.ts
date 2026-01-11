/**
 * Stream Manager - Extracted SSE streaming logic for background chat processing
 */

import type { DisplayMessage, MessagePart, ClarificationQuestion } from "./hooks/use-claude-code-chat";

export type ChatStatus = "idle" | "streaming" | "ready" | "error";

interface SSEEvent {
  type: "text" | "activity" | "tool_use" | "tool_result" | "done" | "error" | "raw" | "file_search_result" | "file_read_result" | "bash_result" | "clarification";
  content?: string;
  message?: string;
  name?: string;
  input?: unknown;
  output?: {
    type: string;
    markdown?: string;
    changeSummary?: string;
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
}

export interface StreamCallbacks {
  onStatusChange: (status: ChatStatus) => void;
  onMessagesUpdate: (messages: DisplayMessage[]) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  onSpecGenerated?: (markdown: string) => void;
  onPendingChange?: (markdown: string, changeSummary: string) => void;
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
  callbacks: StreamCallbacks,
  abortController: AbortController
): Promise<void> {
  // Track notification state per stream
  let specNotified = false;
  let updateNotified = false;

  // Add user message is already done by context, just start streaming
  callbacks.onStatusChange("streaming");

  // Prepare messages for API
  const apiMessages = messages.map((m) => ({
    role: m.role,
    content: m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
  }));

  try {
    const response = await fetch(`/api/features/${featureId}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: apiMessages,
        currentSpecMarkdown
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
          if (data === "[DONE]") continue;

          try {
            const event: SSEEvent = JSON.parse(data);

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
                }
                break;

              case "activity":
                if (event.message) {
                  assistantParts.push({ type: "activity", message: event.message });
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
                }
                break;

              case "done":
                callbacks.onStatusChange("ready");
                callbacks.onComplete();
                break;

              case "error":
                throw new Error(event.message || "Unknown error");

              default:
                assistantParts.push({
                  type: "raw",
                  messageType: event.type,
                  data: event
                });
                updateAssistantMessage();
            }
          } catch (e) {
            console.error("Failed to parse SSE event:", e, data);
          }
        }
      }
    }

    callbacks.onStatusChange("ready");
    callbacks.onComplete();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      callbacks.onStatusChange("ready");
      return;
    }
    const error = err instanceof Error ? err : new Error("Unknown error");
    callbacks.onError(error);
    callbacks.onStatusChange("error");
  }
}
