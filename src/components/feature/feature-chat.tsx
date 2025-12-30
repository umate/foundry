"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaperPlaneRightIcon, StopIcon, CircleIcon } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import type { MiniPRD } from "@/lib/ai/agents/idea-agent";
import type { FeatureMessage } from "@/db/schema";

interface ClarificationOption {
  id: string;
  label: string;
  description: string;
}

// DB message content types
type MessageContent =
  | { text: string }
  | { toolName: "askClarification"; question: string; options: ClarificationOption[] }
  | { toolName: "generatePRD"; prd: MiniPRD };

interface FeatureChatProps {
  projectId: string;
  featureId: string;
  initialIdea?: string;
  initialMessages?: FeatureMessage[];
  onPRDGenerated: (prd: MiniPRD) => void;
}

// Simplified display message type for hydrated messages
interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<
    | { type: "text"; text: string }
    | { type: "tool-askClarification"; question: string; options: ClarificationOption[] }
    | { type: "tool-generatePRD"; prd: MiniPRD }
  >;
}

// Tool response wrapper with subtle label
function ToolResponse({ toolName, children }: { toolName: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-bold text-muted-foreground/50">{toolName}</div>
      <div>{children}</div>
    </div>
  );
}

// Convert DB messages to display format
function dbToDisplayMessages(dbMessages: FeatureMessage[]): DisplayMessage[] {
  return dbMessages.map((msg, index) => {
    const content = msg.content as MessageContent;
    const parts: DisplayMessage["parts"] = [];

    if ("text" in content) {
      parts.push({ type: "text", text: content.text });
    } else if ("toolName" in content) {
      if (content.toolName === "askClarification") {
        parts.push({
          type: "tool-askClarification",
          question: content.question,
          options: content.options
        });
      } else if (content.toolName === "generatePRD") {
        parts.push({
          type: "tool-generatePRD",
          prd: content.prd
        });
      }
    }

    return {
      id: msg.id || `db-${index}`,
      role: msg.role as "user" | "assistant",
      parts
    };
  });
}

// Extract saveable content from a UI message
// Note: askClarification tool calls are ephemeral and not saved
function extractMessageContent(msg: UIMessage): MessageContent | null {
  for (const part of msg.parts) {
    if (part.type === "text" && part.text) {
      return { text: part.text };
    }
    // askClarification is ephemeral - skip it
    if (part.type === "tool-askClarification") {
      continue;
    }
    if (part.type === "tool-generatePRD") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolPart = part as any;
      const prd = toolPart.prd || toolPart.output?.prd;
      if (prd) {
        return { toolName: "generatePRD" as const, prd };
      }
    }
  }
  return null;
}

export function FeatureChat({
  projectId,
  featureId,
  initialIdea,
  initialMessages = [],
  onPRDGenerated
}: FeatureChatProps) {
  const [input, setInput] = useState("");
  const [answeredClarifications, setAnsweredClarifications] = useState<Set<string>>(new Set());
  const hasSentInitialIdeaRef = useRef(false);
  const hasNotifiedPRDRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());

  // Convert initial DB messages to display format
  const hydratedMessages = useMemo(() => dbToDisplayMessages(initialMessages), [initialMessages]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/projects/${projectId}/idea-agent`
      }),
    [projectId]
  );

  const {
    messages: chatMessages,
    sendMessage,
    status,
    error,
    stop
  } = useChat({
    transport
  });

  // Combine hydrated messages (from DB) with new chat messages
  const messages: DisplayMessage[] = useMemo(() => {
    const newMessages = chatMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: msg.parts as DisplayMessage["parts"]
    }));
    return [...hydratedMessages, ...newMessages];
  }, [chatMessages, hydratedMessages]);

  const isLoading = status === "streaming" || status === "submitted";

  const handleStop = () => {
    stop();
  };

  // Save a single message to DB
  const saveMessage = useCallback(
    async (role: "user" | "assistant", content: MessageContent) => {
      try {
        const response = await fetch(`/api/features/${featureId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: { role, content } })
        });
        if (!response.ok) {
          console.error("Failed to save message:", response.status);
        }
      } catch (err) {
        console.error("Failed to save message:", err);
      }
    },
    [featureId]
  );

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send initial idea when component mounts (only if no existing messages)
  useEffect(() => {
    if (initialIdea && !hasSentInitialIdeaRef.current && hydratedMessages.length === 0 && chatMessages.length === 0) {
      hasSentInitialIdeaRef.current = true;
      saveMessage("user", { text: initialIdea });
      sendMessage({ text: initialIdea });
    }
  }, [initialIdea, hydratedMessages.length, chatMessages.length, sendMessage, saveMessage]);

  // Save assistant messages when streaming completes
  useEffect(() => {
    if (status === "ready") {
      for (const msg of chatMessages) {
        if (msg.role === "assistant" && !savedMessageIdsRef.current.has(msg.id)) {
          savedMessageIdsRef.current.add(msg.id);
          const content = extractMessageContent(msg);
          if (content) {
            saveMessage("assistant", content);
          }
        }
      }
    }
  }, [status, chatMessages, saveMessage]);

  // Watch for PRD generation in messages - use ref to prevent duplicate callbacks
  useEffect(() => {
    if (hasNotifiedPRDRef.current) return;

    for (const message of messages) {
      if (message.role === "assistant" && message.parts) {
        for (const part of message.parts) {
          if (part.type === "tool-generatePRD") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toolPart = part as any;
            console.log("generatePRD tool part:", JSON.stringify(toolPart, null, 2));
            // Try different possible locations for the PRD data
            const prd = toolPart.prd || toolPart.output?.prd || toolPart.result?.prd || toolPart.output;
            if (prd && prd.title) {
              hasNotifiedPRDRef.current = true;
              onPRDGenerated(prd);
              return;
            }
          }
        }
      }
    }
  }, [messages, onPRDGenerated]);

  const handleOptionSelect = (label: string, description: string, clarificationKey: string) => {
    setAnsweredClarifications((prev) => new Set(prev).add(clarificationKey));
    const responseText = description ? `${label}: ${description}` : label;
    saveMessage("user", { text: responseText });
    sendMessage({ text: responseText });
  };

  const handleOtherSelect = (clarificationKey: string) => {
    setAnsweredClarifications((prev) => new Set(prev).add(clarificationKey));
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      saveMessage("user", { text: input });
      sendMessage({ text: input });
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !initialIdea && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm text-center px-8">Describe your idea to get started</p>
          </div>
        )}

        {messages.map((message) => {
          // Deduplicate parts by content to handle AI SDK quirks
          const seenTexts = new Set<string>();
          const seenToolCalls = new Set<string>();

          const uniqueParts = message.parts.filter((part) => {
            if (part.type === "text" && part.text) {
              if (seenTexts.has(part.text)) return false;
              seenTexts.add(part.text);
              return true;
            }
            if (part.type === "tool-askClarification" || part.type === "tool-generatePRD") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const toolPart = part as any;
              const key = `${part.type}-${JSON.stringify(toolPart.question || toolPart.prd?.title || "")}`;
              if (seenToolCalls.has(key)) return false;
              seenToolCalls.add(key);
              return true;
            }
            return true;
          });

          return (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex gap-3 items-start"}>
              {message.role === "assistant" && <span className="w-2 h-2 rounded-full shrink-0 mt-2 bg-secondary" />}
              <div className={message.role === "user" ? "max-w-[80%] space-y-3" : "flex-1 space-y-3"}>
                {uniqueParts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className={message.role === "user" ? "rounded-md py-2 px-3 bg-background" : ""}
                      >
                        <div className="text-base prose prose-sm max-w-none">
                          <ReactMarkdown>{part.text}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  }

                  if (part.type === "tool-askClarification") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const toolPart = part as any;
                    // Try different possible locations for the clarification data
                    const output = toolPart.output || toolPart.result || toolPart;
                    const question = output?.question;
                    const options = output?.options as ClarificationOption[] | undefined;
                    const clarificationKey = `${message.id}-${i}`;
                    const isAnswered = answeredClarifications.has(clarificationKey);

                    if (question) {
                      return (
                        <ToolResponse key={clarificationKey} toolName="Clarification Question">
                          <div className="space-y-2">
                            <span className="text-base">{question}</span>
                            {!isAnswered && (
                              <div className="space-y-1 py-2">
                                {options?.map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() =>
                                      handleOptionSelect(option.label, option.description, clarificationKey)
                                    }
                                    disabled={isLoading}
                                    className="w-full flex items-start gap-2 p-2 rounded-md border border-border text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <CircleIcon
                                      weight="bold"
                                      className="size-4 mt-0.5 shrink-0 text-muted-foreground/50"
                                    />
                                    <div className="min-w-0 space-y-0.5">
                                      <span className="text-sm font-semibold block">{option.label}</span>
                                      {option.description && (
                                        <span className="text-sm font text-muted-foreground block">
                                          {option.description}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => handleOtherSelect(clarificationKey)}
                                  disabled={isLoading}
                                  className="w-full flex items-center gap-2 p-2 rounded-md border border-dashed border-muted-foreground/50 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
                                >
                                  <span className="text-sm">Other</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </ToolResponse>
                      );
                    }
                  }

                  if (part.type === "tool-generatePRD") {
                    return (
                      <ToolResponse key={`${message.id}-${i}`} toolName="PRD Generated">
                        <span className="text-sm">PRD generated — check the editor</span>
                      </ToolResponse>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-start">
            <span className="w-2 h-2 rounded-full shrink-0 mt-2 bg-secondary" />
            <p className="text-sm pt-0.5 font-bold text-muted-foreground/50">Thinking...</p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive">Error: {error.message}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            disabled={isLoading}
            className="flex-1"
          />
          {isLoading ? (
            <Button type="button" onClick={handleStop} size="icon" variant="destructive">
              <StopIcon weight="bold" />
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()} size="icon">
              <PaperPlaneRightIcon weight="bold" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
