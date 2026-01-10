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

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "activity"; message: string }
  | { type: "tool-generatePRD"; markdown: string }
  | { type: "tool-updatePRD"; markdown: string; changeSummary: string }
  | { type: "tool-use"; name: string; input: unknown }
  | { type: "file-search-result"; files: string[]; count: number }
  | { type: "file-read-result"; path: string; lineCount?: number }
  | { type: "bash-result"; command?: string; output: string; exitCode?: number }
  | { type: "raw"; messageType: string; data: unknown }
  | { type: "clarification"; questions: ClarificationQuestion[] };

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
}

interface UseClaudeCodeChatOptions {
  featureId: string;
  currentPrdMarkdown?: string;
  onPRDGenerated?: (markdown: string) => void;
  onPendingChange?: (markdown: string, changeSummary: string) => void;
}

type ChatStatus = "idle" | "streaming" | "ready" | "error";

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
}

export function useClaudeCodeChat({
  featureId,
  currentPrdMarkdown,
  onPRDGenerated,
  onPendingChange
}: UseClaudeCodeChatOptions) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdCounterRef = useRef(0);
  const prdNotifiedRef = useRef(false);
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
            currentPrdMarkdown
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
                    }
                    break;

                  case "activity":
                    if (event.message) {
                      assistantParts.push({ type: "activity", message: event.message });
                      updateAssistantMessage();
                    }
                    break;

                  case "tool_result":
                    if (event.name === "generatePRD" && event.output?.markdown) {
                      assistantParts.push({
                        type: "tool-generatePRD",
                        markdown: event.output.markdown
                      });
                      updateAssistantMessage();
                      // Notify parent
                      if (!prdNotifiedRef.current && onPRDGenerated) {
                        prdNotifiedRef.current = true;
                        onPRDGenerated(event.output.markdown);
                      }
                    } else if (event.name === "updatePRD" && event.output?.markdown && event.output?.changeSummary) {
                      assistantParts.push({
                        type: "tool-updatePRD",
                        markdown: event.output.markdown,
                        changeSummary: event.output.changeSummary
                      });
                      updateAssistantMessage();
                      // Notify parent
                      if (!updateNotifiedRef.current && onPendingChange) {
                        updateNotifiedRef.current = true;
                        onPendingChange(event.output.markdown, event.output.changeSummary);
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
    [featureId, currentPrdMarkdown, messages, generateId, onPRDGenerated, onPendingChange]
  );

  // Reset notification refs when messages change externally
  useEffect(() => {
    return () => {
      prdNotifiedRef.current = false;
      updateNotifiedRef.current = false;
    };
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setStatus("idle");
    prdNotifiedRef.current = false;
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
