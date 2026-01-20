"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Message part types matching the existing UI format
// Clarification question types from AskUserQuestion tool
export interface ClarificationOption {
  label: string;
  description: string;
}

export interface ClarificationQuestion {
  question: string;
  header: string;
  options: ClarificationOption[];
  multiSelect: boolean;
}

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "image"; imageId: string; filename: string; mimeType: string }
  | { type: "activity"; message: string }
  | { type: "tool-generateSpec"; markdown: string }
  | { type: "tool-updateSpec"; markdown: string; changeSummary: string }
  | { type: "tool-use"; name: string; input: unknown }
  | { type: "file-search-result"; files: string[]; count: number }
  | { type: "file-read-result"; path: string; lineCount?: number }
  | { type: "file-write-result"; path: string }
  | { type: "file-edit-result"; path: string }
  | { type: "bash-result"; command?: string; output: string; exitCode?: number }
  | { type: "tool-error"; error: string }
  | { type: "raw"; messageType: string; data: unknown }
  | { type: "clarification"; questions: ClarificationQuestion[] }
  | { type: "todo-list"; todos: TodoItem[] };

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
}

interface UseClaudeCodeChatOptions {
  featureId: string;
  currentSpecMarkdown?: string;
  onSpecGenerated?: (markdown: string) => void;
  onPendingChange?: (markdown: string, changeSummary: string) => void;
}

type ChatStatus = "idle" | "streaming" | "ready" | "error";

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
  };
  result?: string;
  cost?: number;
  turns?: number;
  messageType?: string;
  data?: unknown;
  // File search result fields
  files?: string[];
  count?: number;
  // File read result fields
  path?: string;
  lineCount?: number;
  // Bash result fields
  command?: string;
  bashOutput?: string;
  exitCode?: number;
  // Clarification fields
  questions?: ClarificationQuestion[];
  // Todo list fields
  todos?: TodoItem[];
  // Tool error fields
  error?: string;
}

export function useClaudeCodeChat({
  featureId,
  currentSpecMarkdown,
  onSpecGenerated,
  onPendingChange
}: UseClaudeCodeChatOptions) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdCounterRef = useRef(0);
  const specNotifiedRef = useRef(false);
  const updateNotifiedRef = useRef(false);

  // Generate unique message IDs
  const generateId = useCallback(() => {
    messageIdCounterRef.current += 1;
    return `msg-${Date.now()}-${messageIdCounterRef.current}`;
  }, []);

  // Stop the current stream
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus("ready");
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (content: { text: string }) => {
      // Add user message
      const userMessage: DisplayMessage = {
        id: generateId(),
        role: "user",
        parts: [{ type: "text", text: content.text }]
      };

      setMessages((prev) => [...prev, userMessage]);
      setStatus("streaming");
      setError(null);

      // Prepare messages for API
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("\n")
      }));

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`/api/features/${featureId}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages,
            currentSpecMarkdown
          }),
          signal: abortControllerRef.current.signal
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
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === assistantId);
            if (existing) {
              return prev.map((m) => (m.id === assistantId ? { ...m, parts: [...assistantParts] } : m));
            } else {
              return [...prev, { id: assistantId, role: "assistant" as const, parts: [...assistantParts] }];
            }
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const event: SSEEvent = JSON.parse(data);

                switch (event.type) {
                  case "text":
                    if (event.content) {
                      // Find or create text part
                      const lastPart = assistantParts[assistantParts.length - 1];
                      if (lastPart?.type === "text") {
                        // Append to existing text part
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
                      // Notify parent
                      if (!specNotifiedRef.current && onSpecGenerated) {
                        specNotifiedRef.current = true;
                        onSpecGenerated(event.output.markdown);
                      }
                    } else if (event.name === "updateSpec" && event.output?.markdown && event.output?.changeSummary) {
                      assistantParts.push({
                        type: "tool-updateSpec",
                        markdown: event.output.markdown,
                        changeSummary: event.output.changeSummary
                      });
                      updateAssistantMessage();
                      // Notify parent
                      if (!updateNotifiedRef.current && onPendingChange) {
                        updateNotifiedRef.current = true;
                        onPendingChange(event.output.markdown, event.output.changeSummary);
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

                  case "tool_error":
                    assistantParts.push({
                      type: "tool-error",
                      error: event.error || "Unknown error"
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
                    setStatus("ready");
                    break;

                  case "error":
                    throw new Error(event.message || "Unknown error");

                  default:
                    // Handle any completely unknown event types
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

        setStatus("ready");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("ready");
          return;
        }
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setStatus("error");
      } finally {
        abortControllerRef.current = null;
      }
    },
    [featureId, currentSpecMarkdown, messages, generateId, onSpecGenerated, onPendingChange]
  );

  // Reset notification refs when messages change externally
  useEffect(() => {
    return () => {
      specNotifiedRef.current = false;
      updateNotifiedRef.current = false;
    };
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setStatus("idle");
    specNotifiedRef.current = false;
    updateNotifiedRef.current = false;
  }, []);

  return {
    messages,
    sendMessage,
    status,
    error,
    stop,
    clearMessages,
    setMessages
  };
}
