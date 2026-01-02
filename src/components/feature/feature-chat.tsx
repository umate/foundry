"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PaperPlaneRightIcon, StopIcon, CircleIcon } from "@phosphor-icons/react";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import type { FeatureMessage } from "@/db/schema";
import { PendingChangeCard } from "./pending-change-card";

interface ClarificationOption {
  id: string;
  label: string;
  description: string;
}

// DB message content types
type MessageContent =
  | { text: string }
  | { toolName: "askClarification"; question: string; options: ClarificationOption[] }
  | { toolName: "generatePRD"; markdown: string }
  | { toolName: "updatePRD"; markdown: string; changeSummary: string };

interface FeatureChatProps {
  projectId: string;
  featureId: string;
  initialIdea?: string;
  initialMessages?: FeatureMessage[];
  /** Called when AI generates initial PRD (markdown) */
  onPRDGenerated: (markdown: string) => void;
  /** Called when AI proposes changes to existing PRD */
  onPendingChange: (markdown: string, changeSummary: string) => void;
  /** Called when user accepts pending change */
  onAcceptChange: () => void;
  /** Called when user rejects pending change */
  onRejectChange: () => void;
  /** Current PRD markdown to send to AI for context */
  currentPrdMarkdown?: string;
  /** Whether there's a pending change awaiting review */
  hasPendingChange?: boolean;
  hasSavedPrd?: boolean;
  /** Called when session is reset to clear parent state */
  onSessionReset?: () => void;
}

// Simplified display message type for hydrated messages
interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<
    | { type: "text"; text: string }
    | { type: "tool-askClarification"; question: string; options: ClarificationOption[] }
    | { type: "tool-generatePRD"; markdown: string }
    | { type: "tool-updatePRD"; markdown: string; changeSummary: string }
  >;
}

// Helper to determine if a message is complete (no pending clarifications)
function isMessageComplete(message: DisplayMessage, answeredClarifications: Set<string>): boolean {
  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i];
    if (part.type === "tool-askClarification") {
      const clarificationKey = `${message.id}-${i}`;
      if (!answeredClarifications.has(clarificationKey)) {
        return false;
      }
    }
  }
  return true;
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
          markdown: content.markdown
        });
      } else if (content.toolName === "updatePRD") {
        parts.push({
          type: "tool-updatePRD",
          markdown: content.markdown,
          changeSummary: content.changeSummary
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
      const markdown = toolPart.markdown || toolPart.output?.markdown;
      if (markdown) {
        return { toolName: "generatePRD" as const, markdown };
      }
    }
    if (part.type === "tool-updatePRD") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolPart = part as any;
      const markdown = toolPart.markdown || toolPart.output?.markdown;
      const changeSummary = toolPart.changeSummary || toolPart.output?.changeSummary;
      if (markdown && changeSummary) {
        return { toolName: "updatePRD" as const, markdown, changeSummary };
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
  onPRDGenerated,
  onPendingChange,
  onAcceptChange,
  onRejectChange,
  currentPrdMarkdown,
  hasPendingChange = false,
  hasSavedPrd = false,
  onSessionReset
}: FeatureChatProps) {
  const [input, setInput] = useState("");
  const [answeredClarifications, setAnsweredClarifications] = useState<Set<string>>(new Set());
  // Track resolved updatePRD tool calls: key is message-part key, value is resolution status
  const [resolvedChanges, setResolvedChanges] = useState<Map<string, "accepted" | "rejected">>(new Map());
  const [thinkingPhraseIndex, setThinkingPhraseIndex] = useState(0);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const hasSentInitialIdeaRef = useRef(false);
  const hasNotifiedPRDRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());

  // Convert initial DB messages to display format
  const hydratedMessages = useMemo(() => dbToDisplayMessages(initialMessages), [initialMessages]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/projects/${projectId}/idea-agent`,
        body: currentPrdMarkdown ? { currentPrdMarkdown } : undefined
      }),
    [projectId, currentPrdMarkdown]
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

  // Rotate thinking phrases while loading
  const thinkingPhrases = useMemo(
    () => ["Thinking...", "Analyzing your request...", "Drafting ideas...", "Almost there..."],
    []
  );
  const thinkingPhrase = thinkingPhrases[thinkingPhraseIndex % thinkingPhrases.length];

  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const interval = setInterval(() => {
      setThinkingPhraseIndex((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoading]);

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
    // Skip if PRD already saved in DB - don't overwrite user edits
    if (hasSavedPrd) return;

    for (const message of messages) {
      if (message.role === "assistant" && message.parts) {
        for (const part of message.parts) {
          if (part.type === "tool-generatePRD") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toolPart = part as any;
            // Try different possible locations for the markdown data
            const markdown = toolPart.markdown || toolPart.output?.markdown || toolPart.result?.markdown;
            if (markdown) {
              hasNotifiedPRDRef.current = true;
              onPRDGenerated(markdown);
              return;
            }
          }
        }
      }
    }
  }, [messages, onPRDGenerated, hasSavedPrd]);

  // Watch for updatePRD tool calls to trigger pending change
  // IMPORTANT: Only watch NEW messages from chatMessages, not hydrated DB messages
  // This prevents re-triggering pending change flow for historical updatePRD that was already accepted/rejected
  const hasNotifiedUpdateRef = useRef(false);
  useEffect(() => {
    if (hasNotifiedUpdateRef.current) return;
    if (hasPendingChange) return; // Already have a pending change

    // Only check NEW messages from chatMessages, not hydrated DB messages
    for (const message of chatMessages) {
      if (message.role === "assistant" && message.parts) {
        for (const part of message.parts) {
          if (part.type === "tool-updatePRD") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toolPart = part as any;
            const markdown = toolPart.markdown || toolPart.output?.markdown;
            const changeSummary = toolPart.changeSummary || toolPart.output?.changeSummary;
            if (markdown && changeSummary) {
              hasNotifiedUpdateRef.current = true;
              onPendingChange(markdown, changeSummary);
              return;
            }
          }
        }
      }
    }
  }, [chatMessages, onPendingChange, hasPendingChange]);

  // Reset update notification ref when pending change is resolved
  useEffect(() => {
    if (!hasPendingChange) {
      hasNotifiedUpdateRef.current = false;
    }
  }, [hasPendingChange]);

  const handleOptionSelect = (label: string, description: string, clarificationKey: string) => {
    setAnsweredClarifications((prev) => new Set(prev).add(clarificationKey));
    const responseText = description ? `${label}: ${description}` : label;
    saveMessage("user", { text: responseText });
    sendMessage({ text: responseText });
  };

  const handleOtherSelect = (clarificationKey: string) => {
    setAnsweredClarifications((prev) => new Set(prev).add(clarificationKey));
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey && !isLoading && input.trim()) {
      e.preventDefault();
      saveMessage("user", { text: input });
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      saveMessage("user", { text: input });
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleResetSession = async () => {
    try {
      const response = await fetch(`/api/features/${featureId}/messages`, {
        method: "DELETE"
      });
      if (response.ok) {
        // Clear local refs to prevent stale state
        savedMessageIdsRef.current.clear();
        hasSentInitialIdeaRef.current = false;
        hasNotifiedPRDRef.current = false;
        hasNotifiedUpdateRef.current = false;
        // Clear local state
        setAnsweredClarifications(new Set());
        setResolvedChanges(new Map());
        // Notify parent to remount this component with fresh state
        onSessionReset?.();
      }
    } catch (err) {
      console.error("Failed to reset session:", err);
    }
    setShowResetDialog(false);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !initialIdea && (
          <Empty className="h-full border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PaperPlaneRightIcon weight="duotone" />
              </EmptyMedia>
              <EmptyTitle>Start a conversation</EmptyTitle>
              <EmptyDescription>
                Ask questions about the PRD or request changes to refine it further.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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
            if (
              part.type === "tool-askClarification" ||
              part.type === "tool-generatePRD" ||
              part.type === "tool-updatePRD"
            ) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const toolPart = part as any;
              const key = `${part.type}-${JSON.stringify(toolPart.question || toolPart.markdown?.slice(0, 50) || "")}`;
              if (seenToolCalls.has(key)) return false;
              seenToolCalls.add(key);
              return true;
            }
            return true;
          });

          return (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex gap-3 items-start"}>
              {message.role === "assistant" && (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                    isMessageComplete(message, answeredClarifications) ? "bg-success" : "bg-secondary"
                  }`}
                />
              )}
              <div className={message.role === "user" ? "max-w-[80%] space-y-3" : "flex-1 space-y-3"}>
                {uniqueParts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className={message.role === "user" ? "rounded-md py-2 px-3 bg-background" : ""}
                      >
                        <div className="text-sm prose prose-sm max-w-none">
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
                            <span className="text-sm">{question}</span>
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

                  if (part.type === "tool-updatePRD") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const toolPart = part as any;
                    const changeSummary =
                      toolPart.changeSummary || toolPart.output?.changeSummary || "Changes proposed";
                    const updateKey = `${message.id}-${i}`;
                    const resolution = resolvedChanges.get(updateKey);

                    // Show status text if already resolved in this session
                    if (resolution) {
                      return (
                        <ToolResponse key={updateKey} toolName="PRD Update">
                          <span className="text-sm">
                            {resolution === "accepted" ? "Changes applied" : "Changes discarded"}
                          </span>
                        </ToolResponse>
                      );
                    }

                    // If no pending change (resolved in previous session or from DB), show as applied
                    if (!hasPendingChange) {
                      return (
                        <ToolResponse key={updateKey} toolName="PRD Update">
                          <span className="text-sm">Changes applied</span>
                        </ToolResponse>
                      );
                    }

                    // Show pending card with accept/reject buttons
                    return (
                      <PendingChangeCard
                        key={updateKey}
                        changeSummary={changeSummary}
                        onAccept={() => {
                          setResolvedChanges((prev) => new Map(prev).set(updateKey, "accepted"));
                          onAcceptChange();
                        }}
                        onReject={() => {
                          setResolvedChanges((prev) => new Map(prev).set(updateKey, "rejected"));
                          onRejectChange();
                        }}
                      />
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
            <span className="w-2 h-2 rounded-full shrink-0 mt-2 bg-secondary animate-pulse" />
            <p className="text-sm pt-0.5 font-bold text-muted-foreground/50 animate-thinking-pulse">
              {thinkingPhrase}
            </p>
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
      <div className="border-t border-border p-3 bg-white">
        {hasPendingChange ? (
          <div className="text-center text-sm text-muted-foreground py-2">
            Review the proposed changes before continuing
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-md border border-border bg-background focus-within:ring-1 focus-within:ring-ring">
              {/* Textarea - padding-bottom creates space for buttons */}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                disabled={isLoading}
                className="min-h-[80px] resize-none border-0 focus-visible:ring-0 pb-10"
                rows={3}
              />

              {/* Bottom toolbar - positioned inside container */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                {/* Left: Reset button */}
                <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Reset chat"
                    >
                      <ArrowsClockwise className="size-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Chat Session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all chat messages for this feature. Your PRD and feature data will
                        be preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <Button variant="outline">Cancel</Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button variant="secondary" onClick={handleResetSession}>
                          Reset Session
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Right: Send or Stop */}
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="p-1.5 rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    title="Stop"
                  >
                    <StopIcon weight="bold" className="size-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-1.5 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Send (Enter)"
                  >
                    <PaperPlaneRightIcon weight="bold" className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
