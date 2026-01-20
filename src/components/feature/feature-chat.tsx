"use client";

import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import { useFeatureStream } from "@/components/project/background-stream-context";
import type { DisplayMessage, ClarificationQuestion, MessagePart } from "@/lib/hooks/use-claude-code-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PaperPlaneRightIcon, StopIcon, MagnifyingGlassIcon, FileIcon, FloppyDiskIcon, PencilIcon, WarningIcon, ImageIcon, XIcon } from "@phosphor-icons/react";
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
import remarkGfm from "remark-gfm";
import type { FeatureMessage } from "@/db/schema";
import { PendingChangeCard } from "./pending-change-card";
import { ClarificationCard } from "./clarification-card";
import { BashResultCard } from "./bash-result-card";
import { TodoListCard } from "./todo-list-card";
import type { PendingImage } from "@/components/ui/image-upload";
import { uploadImages, validateImageFile, type UploadedImage } from "@/lib/image-utils";

// DB message content - stores full parts array (mirrors DisplayMessage.parts)
type MessageContent = {
  parts: MessagePart[];
};

interface FeatureChatProps {
  projectId: string;
  featureId: string;
  featureTitle?: string;
  initialIdea?: string;
  initialMessages?: FeatureMessage[];
  /** Called when AI generates initial spec (markdown) */
  onSpecGenerated: (markdown: string) => void;
  /** Called when AI proposes changes to existing spec */
  onPendingChange: (markdown: string, changeSummary: string) => void;
  /** Called when user accepts pending change */
  onAcceptChange: () => void;
  /** Called when user rejects pending change */
  onRejectChange: () => void;
  /** Current spec markdown to send to AI for context */
  currentSpecMarkdown?: string;
  /** Whether there's a pending change awaiting review */
  hasPendingChange?: boolean;
  hasSavedSpec?: boolean;
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

// Convert DB messages to display format (handles both new and legacy formats)
function dbToDisplayMessages(dbMessages: FeatureMessage[]): DisplayMessage[] {
  return dbMessages.map((msg) => {
    const content = msg.content as Record<string, unknown>;

    // New format: { parts: [...] } - direct mapping
    if (Array.isArray(content.parts)) {
      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        parts: content.parts as MessagePart[]
      };
    }

    // Legacy format fallback (for existing data)
    const parts: MessagePart[] = [];
    if ("text" in content && typeof content.text === "string") {
      parts.push({ type: "text", text: content.text });
    } else if (content.toolName === "generateSpec" && typeof content.markdown === "string") {
      parts.push({ type: "tool-generateSpec", markdown: content.markdown });
    } else if (content.toolName === "updateSpec" && typeof content.markdown === "string") {
      parts.push({
        type: "tool-updateSpec",
        markdown: content.markdown,
        changeSummary: (content.changeSummary as string) || ""
      });
    }

    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts
    };
  });
}

// Extract saveable content from a display message - saves all parts
function extractMessageContent(msg: DisplayMessage): MessageContent | null {
  if (msg.parts.length === 0) return null;
  return { parts: msg.parts };
}

// localStorage helpers for thinking mode preference
const THINKING_MODE_KEY = "foundry:thinkingMode";

function getStoredThinkingMode(projectId: string): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(THINKING_MODE_KEY);
  const map = stored ? JSON.parse(stored) : {};
  return map[projectId] ?? true;
}

function setStoredThinkingMode(projectId: string, enabled: boolean) {
  const stored = localStorage.getItem(THINKING_MODE_KEY);
  const map = stored ? JSON.parse(stored) : {};
  map[projectId] = enabled;
  localStorage.setItem(THINKING_MODE_KEY, JSON.stringify(map));
}

export function FeatureChat({
  projectId,
  featureId,
  featureTitle,
  initialIdea,
  initialMessages = [],
  onSpecGenerated,
  onPendingChange,
  onAcceptChange,
  onRejectChange,
  currentSpecMarkdown,
  hasPendingChange = false,
  hasSavedSpec = false,
  onSessionReset
}: FeatureChatProps) {
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  // Track resolved updateSpec tool calls: key is message-part key, value is resolution status
  const [resolvedChanges, setResolvedChanges] = useState<Map<string, "accepted" | "rejected">>(new Map());
  const [thinkingPhraseIndex, setThinkingPhraseIndex] = useState(0);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(() =>
    getStoredThinkingMode(projectId)
  );
  // Progressive message loading
  const MESSAGES_PER_PAGE = 5;
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSentInitialIdeaRef = useRef(false);
  const hasNotifiedSpecRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
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

  // Mark hydrated messages as already saved to prevent re-saving on stream complete
  useEffect(() => {
    for (const msg of hydratedMessages) {
      savedMessageIdsRef.current.add(msg.id);
    }
  }, [hydratedMessages]);

  // Persist thinking mode preference to localStorage
  useEffect(() => {
    setStoredThinkingMode(projectId, thinkingEnabled);
  }, [projectId, thinkingEnabled]);

  // Wrapper to include spec callbacks when sending messages
  const sendMessage = useCallback(
    (content: { text: string; images?: UploadedImage[] }) => {
      // Convert UploadedImage to the format expected by the context
      const images = content.images?.map((img) => ({
        id: img.id,
        filename: img.filename,
        mimeType: img.mimeType
      }));

      contextSendMessage({ text: content.text, images }, {
        currentSpecMarkdown,
        featureTitle,
        thinkingEnabled,
        onSpecGenerated: hasSavedSpec ? undefined : onSpecGenerated,
        onPendingChange: hasPendingChange ? undefined : onPendingChange
      });
    },
    [
      contextSendMessage,
      currentSpecMarkdown,
      featureTitle,
      thinkingEnabled,
      hasSavedSpec,
      onSpecGenerated,
      hasPendingChange,
      onPendingChange
    ]
  );

  // Use context messages, or hydrated messages if context is empty
  const messages: DisplayMessage[] = useMemo(() => {
    return contextMessages.length > 0 ? contextMessages : hydratedMessages;
  }, [contextMessages, hydratedMessages]);

  // Progressive loading: only show last N messages
  const visibleMessages = useMemo(() => {
    if (messages.length <= visibleCount) {
      return messages;
    }
    return messages.slice(-visibleCount);
  }, [messages, visibleCount]);

  const hasMoreMessages = messages.length > visibleCount;

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

  // Instant scroll on mount, smooth scroll on new messages
  useLayoutEffect(() => {
    if (isInitialMount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      isInitialMount.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isInitialMount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
      saveMessage("user", { parts: [{ type: "text", text: initialIdea }] });
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

  // Watch for spec generation in hydrated messages (from DB reload)
  useEffect(() => {
    if (hasNotifiedSpecRef.current) return;
    if (hasSavedSpec) return;

    for (const message of hydratedMessages) {
      if (message.role === "assistant" && message.parts) {
        for (const part of message.parts) {
          if (part.type === "tool-generateSpec" && part.markdown) {
            hasNotifiedSpecRef.current = true;
            onSpecGenerated(part.markdown);
            return;
          }
        }
      }
    }
  }, [hydratedMessages, onSpecGenerated, hasSavedSpec]);

  // Image handling
  const handleFilesSelected = useCallback((files: File[]) => {
    setImageError(null);
    const newImages: PendingImage[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setImageError(validation.error || "Invalid file");
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newImages.push({
        id: crypto.randomUUID(),
        file,
        previewUrl
      });
    }

    setPendingImages((prev) => [...prev, ...newImages]);
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      // Revoke URL for removed image
      const removed = prev.find((img) => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return updated;
    });
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFilesSelected(imageFiles);
    }
  }, [handleFilesSelected]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape cancels generation
    if (e.key === "Escape" && isLoading) {
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      handleStop();
      return;
    }
    // Enter sends, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey && !isLoading && (input.trim() || pendingImages.length > 0)) {
      e.preventDefault();
      handleSendWithImages();
    }
  };

  const handleSendWithImages = async () => {
    if ((!input.trim() && pendingImages.length === 0) || isLoading || isUploadingImages) return;

    const textContent = input.trim();
    const imagesToUpload = [...pendingImages];

    // Clear input and images immediately for responsiveness
    setInput("");
    setPendingImages([]);

    // Build message parts for saving to DB
    const parts: MessagePart[] = [];
    if (textContent) {
      parts.push({ type: "text", text: textContent });
    }

    let uploadedImages: UploadedImage[] = [];

    if (imagesToUpload.length > 0) {
      setIsUploadingImages(true);
      try {
        uploadedImages = await uploadImages(imagesToUpload.map((img) => img.file));

        // Add image parts
        for (const img of uploadedImages) {
          parts.push({ type: "image", imageId: img.id, filename: img.filename, mimeType: img.mimeType });
        }

        // Revoke preview URLs
        imagesToUpload.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "Failed to upload images");
        // Restore images on error
        setPendingImages(imagesToUpload);
        setInput(textContent);
        setIsUploadingImages(false);
        return;
      }
      setIsUploadingImages(false);
    }

    // Save and send message
    saveMessage("user", { parts });
    sendMessage({ text: textContent, images: uploadedImages });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendWithImages();
  };

  const handleSpecAction = useCallback(() => {
    const message = hasSavedSpec
      ? "Based on everything discussed so far, please update the spec to reflect the changes."
      : "Based on everything discussed so far, please generate the spec for this feature.";

    saveMessage("user", { parts: [{ type: "text", text: message }] });
    sendMessage({ text: message });
  }, [hasSavedSpec, saveMessage, sendMessage]);

  const handleClarificationSubmit = useCallback(
    (responses: Map<number, string | string[]>, questions: ClarificationQuestion[]) => {
      // Format: "Q: {question}\nA: {answer}"
      const lines: string[] = [];

      questions.forEach((q, index) => {
        const selection = responses.get(index);
        if (selection) {
          const answer = Array.isArray(selection) ? selection.join(", ") : selection;
          lines.push(`Q: ${q.question}\nA: ${answer}`);
        }
      });

      const responseText = lines.join("\n\n");

      if (responseText) {
        saveMessage("user", { parts: [{ type: "text", text: responseText }] });
        sendMessage({ text: responseText });
      }
    },
    [saveMessage, sendMessage]
  );

  // Load more messages when button clicked
  const handleLoadMoreMessages = useCallback(() => {
    if (!hasMoreMessages) return;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    setVisibleCount(prev => Math.min(prev + MESSAGES_PER_PAGE, messages.length));
    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - prevScrollHeight;
      }
    });
  }, [hasMoreMessages, messages.length]);

  const handleResetSession = async () => {
    try {
      const response = await fetch(`/api/features/${featureId}/messages`, {
        method: "DELETE"
      });
      if (response.ok) {
        // Clear local refs to prevent stale state
        savedMessageIdsRef.current.clear();
        hasSentInitialIdeaRef.current = false;
        hasNotifiedSpecRef.current = false;
        // Clear local state
        setResolvedChanges(new Map());
        setVisibleCount(MESSAGES_PER_PAGE);
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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load more button */}
        {hasMoreMessages && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLoadMoreMessages}
          >
            Load {messages.length - visibleCount} earlier messages
          </Button>
        )}

        {messages.length === 0 && !initialIdea && (
          <Empty className="h-full border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PaperPlaneRightIcon weight="duotone" />
              </EmptyMedia>
              <EmptyTitle>Start a conversation</EmptyTitle>
              <EmptyDescription>Ask questions about the spec or request changes to refine it further.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {visibleMessages.map((message) => {
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
            if (part.type === "tool-generateSpec" || part.type === "tool-updateSpec") {
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
              <div className={message.role === "user" ? "max-w-[80%] space-y-3" : "flex-1 min-w-0 space-y-3"}>
                {uniqueParts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className={message.role === "user" ? "rounded-md py-0.5 px-2 bg-background" : ""}
                      >
                        <div className="text-sm markdown-content max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  }

                  if (part.type === "image" && part.filename) {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className={message.role === "user" ? "rounded-md overflow-hidden bg-background" : ""}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/images/${part.filename}`}
                          alt="Attached image"
                          className="max-w-full max-h-48 rounded-sm object-contain"
                        />
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

                  if (part.type === "tool-generateSpec") {
                    return (
                      <ToolResponse key={`${message.id}-${i}`} toolName="Spec Generated">
                        <span className="text-sm">Spec generated — check the editor</span>
                      </ToolResponse>
                    );
                  }

                  if (part.type === "tool-updateSpec") {
                    const changeSummary = part.changeSummary || "Changes proposed";
                    const updateKey = `${message.id}-${i}`;
                    const resolution = resolvedChanges.get(updateKey);

                    // Show status text if already resolved in this session
                    if (resolution) {
                      return (
                        <ToolResponse key={updateKey} toolName="Spec Update">
                          <span className="text-sm">
                            {resolution === "accepted" ? "Changes applied" : "Changes discarded"}
                          </span>
                        </ToolResponse>
                      );
                    }

                    // If no pending change (resolved in previous session or from DB), show as applied
                    if (!hasPendingChange) {
                      return (
                        <ToolResponse key={updateKey} toolName="Spec Update">
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

                  // Render file write results
                  if (part.type === "file-write-result") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground font-mono"
                      >
                        <FloppyDiskIcon weight="bold" className="size-3 shrink-0" />
                        <span>Wrote: {part.path}</span>
                      </div>
                    );
                  }

                  // Render file edit results
                  if (part.type === "file-edit-result") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground font-mono"
                      >
                        <PencilIcon weight="bold" className="size-3 shrink-0" />
                        <span>Edited: {part.path}</span>
                      </div>
                    );
                  }

                  // Render bash command results
                  if (part.type === "bash-result") {
                    return (
                      <BashResultCard
                        key={`${message.id}-${i}`}
                        command={part.command}
                        output={part.output}
                        exitCode={part.exitCode}
                      />
                    );
                  }

                  // Render tool errors
                  if (part.type === "tool-error") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="flex items-center gap-2 text-xs text-destructive/80 font-mono"
                      >
                        <WarningIcon weight="bold" className="size-3 shrink-0" />
                        <span className="truncate">{part.error}</span>
                      </div>
                    );
                  }

                  // Render raw/debug messages compactly
                  if (part.type === "raw") {
                    // Try to extract a compact summary
                    const data = part.data;
                    let summary = "Result";
                    if (typeof data === "string") {
                      summary = data.slice(0, 80) + (data.length > 80 ? "..." : "");
                    } else if (data && typeof data === "object") {
                      if ("filePath" in data) {
                        const filePath = (data as { filePath: string }).filePath;
                        summary = `File: ${filePath.split("/").pop()}`;
                      } else if ("error" in data) {
                        summary = String((data as { error: unknown }).error).slice(0, 80);
                      }
                    }

                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="text-xs text-muted-foreground/60 font-mono truncate"
                      >
                        [{part.messageType}] {summary}
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

                  // Render todo list from TodoWrite tool
                  if (part.type === "todo-list") {
                    return (
                      <TodoListCard
                        key={`${message.id}-${i}`}
                        todos={part.todos}
                      />
                    );
                  }

                  // Fallback: render any unknown part types as JSON for debugging
                  return (
                    <div key={`${message.id}-${i}`} className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2 overflow-x-auto">
                      <div className="text-xs font-mono text-amber-600 dark:text-amber-400 mb-1">
                        [Unsupported: {part.type || "unknown"}]
                      </div>
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground">
                        {JSON.stringify(part, null, 2)}
                      </pre>
                    </div>
                  );
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
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) handleFilesSelected(files);
                    e.target.value = "";
                  }}
                />

                {/* Image error display */}
                {imageError && (
                  <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border-b border-destructive/20">
                    {imageError}
                    <button
                      type="button"
                      onClick={() => setImageError(null)}
                      className="ml-2 underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Image previews */}
                {pendingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border-b border-border">
                    {pendingImages.map((img) => (
                      <div key={img.id} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.previewUrl}
                          alt="Pending upload"
                          className="h-16 w-16 object-cover rounded-sm border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute -top-1.5 -right-1.5 p-0.5 bg-destructive text-destructive-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon weight="bold" className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Textarea - padding-bottom creates space for buttons */}
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Type your response... (paste or drag images)"
                  className="min-h-[80px] resize-none border-0 focus-visible:ring-0 pb-10"
                  rows={3}
                />

                {/* Bottom toolbar - positioned inside container */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  {/* Left: Thinking toggle + Image upload */}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Switch
                        checked={thinkingEnabled}
                        onCheckedChange={setThinkingEnabled}
                        disabled={isLoading}
                        className="scale-75"
                      />
                      <span className="text-xs font-mono text-muted-foreground">Thinking</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isUploadingImages}
                      className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      title="Attach images"
                    >
                      <ImageIcon weight="bold" className="size-3.5" />
                    </button>
                  </div>

                {/* Right: Reset, Spec action, and Send/Stop */}
                <div className="flex items-center gap-2">
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
                          This will permanently delete all chat messages for this feature. Your spec and feature data will
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

                  <button
                    type="button"
                    onClick={handleSpecAction}
                    disabled={isLoading}
                    className="px-2 py-0.5 rounded-sm text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {hasSavedSpec ? "Update Spec" : "Generate Spec"}
                  </button>

                  {isLoading || isUploadingImages ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={handleStop}
                      disabled={isUploadingImages}
                      title={isUploadingImages ? "Uploading..." : "Stop"}
                      className="size-7"
                    >
                      <StopIcon weight="bold" className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant={(input.trim() || pendingImages.length > 0) ? "secondary" : "default"}
                      size="icon-sm"
                      disabled={!input.trim() && pendingImages.length === 0}
                      title="Send (Enter)"
                      className="size-7"
                    >
                      <PaperPlaneRightIcon weight="bold" className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
              </div>
          </form>
        )}
      </div>
    </div>
  );
}
