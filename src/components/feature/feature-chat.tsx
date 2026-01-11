"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useFeatureStream } from "@/components/project/background-stream-context";
import type { DisplayMessage, ClarificationQuestion } from "@/lib/hooks/use-claude-code-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PaperPlaneRightIcon, StopIcon, MagnifyingGlassIcon, TerminalIcon, FileIcon } from "@phosphor-icons/react";
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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import type { FeatureMessage } from "@/db/schema";
import { PendingChangeCard } from "./pending-change-card";
import { ClarificationCard } from "./clarification-card";

// DB message content types
type MessageContent =
  | { text: string }
  | { toolName: "generatePRD"; markdown: string }
  | { toolName: "updatePRD"; markdown: string; changeSummary: string };

interface FeatureChatProps {
  projectId: string;
  featureId: string;
  featureTitle?: string;
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
      if (content.toolName === "generatePRD") {
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

// Extract saveable content from a display message
function extractMessageContent(msg: DisplayMessage): MessageContent | null {
  for (const part of msg.parts) {
    if (part.type === "text" && part.text) {
      return { text: part.text };
    }
    // Activity messages are ephemeral - skip them
    if (part.type === "activity") {
      continue;
    }
    if (part.type === "tool-generatePRD") {
      if (part.markdown) {
        return { toolName: "generatePRD" as const, markdown: part.markdown };
      }
    }
    if (part.type === "tool-updatePRD") {
      if (part.markdown && part.changeSummary) {
        return { toolName: "updatePRD" as const, markdown: part.markdown, changeSummary: part.changeSummary };
      }
    }
  }
  return null;
}

export function FeatureChat({
  featureId,
  featureTitle,
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

  // Use background stream context for persistent streaming
  const {
    messages: contextMessages,
    status,
    error,
    sendMessage: contextSendMessage,
    stop,
    clearMessages,
    setMessages: setContextMessages
  } = useFeatureStream(featureId);

  // Hydrate context with DB messages on mount
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (!hasHydratedRef.current && hydratedMessages.length > 0 && contextMessages.length === 0) {
      hasHydratedRef.current = true;
      setContextMessages(hydratedMessages);
    }
  }, [hydratedMessages, contextMessages.length, setContextMessages]);

  // Wrapper to include PRD callbacks when sending messages
  const sendMessage = useCallback(
    (content: { text: string }) => {
      contextSendMessage(content, {
        currentPrdMarkdown,
        featureTitle,
        onPRDGenerated: hasSavedPrd ? undefined : onPRDGenerated,
        onPendingChange: hasPendingChange ? undefined : onPendingChange
      });
    },
    [
      contextSendMessage,
      currentPrdMarkdown,
      featureTitle,
      hasSavedPrd,
      onPRDGenerated,
      hasPendingChange,
      onPendingChange
    ]
  );

  // Use context messages, or hydrated messages if context is empty
  const messages: DisplayMessage[] = useMemo(() => {
    return contextMessages.length > 0 ? contextMessages : hydratedMessages;
  }, [contextMessages, hydratedMessages]);

  const isLoading = status === "streaming";

  // Rotate thinking phrases while loading
  const thinkingPhrases = useMemo(
    () => ["Exploring codebase...", "Analyzing patterns...", "Understanding context..."],
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
    if (
      initialIdea &&
      !hasSentInitialIdeaRef.current &&
      hydratedMessages.length === 0 &&
      contextMessages.length === 0
    ) {
      hasSentInitialIdeaRef.current = true;
      saveMessage("user", { text: initialIdea });
      sendMessage({ text: initialIdea });
    }
  }, [initialIdea, hydratedMessages.length, contextMessages.length, sendMessage, saveMessage]);

  // Save assistant messages when streaming completes
  useEffect(() => {
    if (status === "ready") {
      for (const msg of contextMessages) {
        if (msg.role === "assistant" && !savedMessageIdsRef.current.has(msg.id)) {
          savedMessageIdsRef.current.add(msg.id);
          const content = extractMessageContent(msg);
          if (content) {
            saveMessage("assistant", content);
          }
        }
      }
    }
  }, [status, contextMessages, saveMessage]);

  // Watch for PRD generation in hydrated messages (from DB reload)
  useEffect(() => {
    if (hasNotifiedPRDRef.current) return;
    if (hasSavedPrd) return;

    for (const message of hydratedMessages) {
      if (message.role === "assistant" && message.parts) {
        for (const part of message.parts) {
          if (part.type === "tool-generatePRD" && part.markdown) {
            hasNotifiedPRDRef.current = true;
            onPRDGenerated(part.markdown);
            return;
          }
        }
      }
    }
  }, [hydratedMessages, onPRDGenerated, hasSavedPrd]);

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

  const handleClarificationSubmit = useCallback(
    (responses: Map<number, string | string[]>, questions: ClarificationQuestion[]) => {
      // Format: "1. {Q}: {A}\n2. {Q}: {A}"
      const lines: string[] = [];

      questions.forEach((q, index) => {
        const selection = responses.get(index);
        if (selection) {
          const answer = Array.isArray(selection) ? selection.join(", ") : selection;
          lines.push(`${index + 1}. ${q.question}: ${answer}`);
        }
      });

      const responseText = lines.join("\n");

      if (responseText) {
        saveMessage("user", { text: responseText });
        sendMessage({ text: responseText });
      }
    },
    [saveMessage, sendMessage]
  );

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
        // Clear local state
        setResolvedChanges(new Map());
        clearMessages();
        // Notify parent to remount this component with fresh state
        onSessionReset?.();
      }
    } catch (err) {
      console.error("Failed to reset session:", err);
    }
    setShowResetDialog(false);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !initialIdea && (
          <Empty className="h-full border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PaperPlaneRightIcon weight="duotone" />
              </EmptyMedia>
              <EmptyTitle>Start a conversation</EmptyTitle>
              <EmptyDescription>Ask questions about the PRD or request changes to refine it further.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {messages.map((message) => {
          // Deduplicate parts by content
          const seenTexts = new Set<string>();
          const seenToolCalls = new Set<string>();

          const uniqueParts = message.parts.filter((part) => {
            if (part.type === "text" && part.text) {
              if (seenTexts.has(part.text)) return false;
              seenTexts.add(part.text);
              return true;
            }
            if (part.type === "activity") {
              // Don't deduplicate activity messages
              return true;
            }
            if (part.type === "tool-generatePRD" || part.type === "tool-updatePRD") {
              const key = `${part.type}-${part.markdown?.slice(0, 50) || ""}`;
              if (seenToolCalls.has(key)) return false;
              seenToolCalls.add(key);
              return true;
            }
            return true;
          });

          return (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex gap-3 items-start"}>
              {message.role === "assistant" && <span className="w-2 h-2 rounded-full shrink-0 mt-1.5 bg-success" />}
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

                  if (part.type === "activity") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground font-mono"
                      >
                        <MagnifyingGlassIcon weight="bold" className="size-3 animate-pulse" />
                        <span>{part.message}</span>
                      </div>
                    );
                  }

                  if (part.type === "tool-generatePRD") {
                    return (
                      <ToolResponse key={`${message.id}-${i}`} toolName="PRD Generated">
                        <span className="text-sm">PRD generated — check the editor</span>
                      </ToolResponse>
                    );
                  }

                  if (part.type === "tool-updatePRD") {
                    const changeSummary = part.changeSummary || "Changes proposed";
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

                  // Render tool-use events (other tools being called)
                  if (part.type === "tool-use") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground font-mono"
                      >
                        <MagnifyingGlassIcon weight="bold" className="size-3" />
                        <span>Tool: {part.name}</span>
                      </div>
                    );
                  }

                  // Render file search results (Glob/Grep)
                  if (part.type === "file-search-result") {
                    const displayFiles = part.files.slice(0, 3);
                    const remaining = part.count - displayFiles.length;
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground font-mono"
                      >
                        <MagnifyingGlassIcon weight="bold" className="size-3 shrink-0" />
                        <span>
                          Found: {displayFiles.join(", ")}
                          {remaining > 0 && ` (+${remaining} more)`}
                        </span>
                      </div>
                    );
                  }

                  // Render file read results
                  if (part.type === "file-read-result") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground font-mono"
                      >
                        <FileIcon weight="bold" className="size-3 shrink-0" />
                        <span>
                          Read: {part.path}
                          {part.lineCount && ` (${part.lineCount} lines)`}
                        </span>
                      </div>
                    );
                  }

                  // Render bash command results
                  if (part.type === "bash-result") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="rounded-md bg-zinc-900 border border-zinc-700 overflow-hidden"
                      >
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
                          <TerminalIcon weight="bold" className="size-3 text-zinc-400" />
                          <span className="text-xs font-mono text-zinc-400">{part.command || "Command output"}</span>
                          {part.exitCode !== undefined && part.exitCode !== 0 && (
                            <span className="text-xs font-mono text-red-400 ml-auto">exit {part.exitCode}</span>
                          )}
                        </div>
                        {part.output && (
                          <pre className="p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                            {part.output.length > 500 ? part.output.slice(0, 500) + "..." : part.output}
                          </pre>
                        )}
                      </div>
                    );
                  }

                  // Render raw/debug messages as JSON
                  if (part.type === "raw") {
                    return (
                      <div key={`${message.id}-${i}`} className="rounded-md bg-muted p-2 overflow-x-auto">
                        <div className="text-xs font-mono text-muted-foreground mb-1">[{part.messageType}]</div>
                        <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                          {JSON.stringify(part.data, null, 2)}
                        </pre>
                      </div>
                    );
                  }

                  // Render clarification questions from AskUserQuestion tool
                  if (part.type === "clarification") {
                    return (
                      <ClarificationCard
                        key={`${message.id}-${i}`}
                        questions={part.questions}
                        onSubmit={(responses) => handleClarificationSubmit(responses, part.questions)}
                        disabled={isLoading}
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
            <p className="text-sm pt-0.5 font-medium text-muted-foreground/50 animate-thinking-pulse">
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
      <div className="border-t border-border p-3 bg-card">
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
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    onClick={handleStop}
                    title="Stop"
                    className="size-7"
                  >
                    <StopIcon weight="bold" className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    disabled={!input.trim()}
                    title="Send (Enter)"
                    className="size-7"
                  >
                    <PaperPlaneRightIcon weight="bold" className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
