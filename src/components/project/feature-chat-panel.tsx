"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ListChecks, Play, CheckCircle, Trash, X } from "@phosphor-icons/react";
import { useTrackOpenPanel, useBackgroundStream } from "@/components/project/background-stream-context";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureChat } from "@/components/feature/feature-chat";
import { SubtaskList } from "./subtask-list";
import { SpecEditor } from "@/components/feature/spec-editor";
import { CodeReviewViewer } from "@/components/feature/code-review-viewer";
import { CollapsibleSideBar } from "@/components/ui/collapsible-side-bar";
import { FeatureStatus, STATUS_LABELS, SubTask } from "@/types/feature";
import type { FeatureMessage } from "@/db/schema";
import type { MDXEditorMethods } from "@mdxeditor/editor";

interface FeatureChatPanelProps {
  featureId: string | null;
  projectId: string;
  project: {
    name: string;
    description: string | null;
    stack: string | null;
  };
  onClose: () => void;
  onFeatureUpdated: () => void;
}

interface FeatureData {
  id: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  specMarkdown: string | null;
  initialIdea: string | null;
  subtasks: SubTask[];
}

export function FeatureChatPanel({ featureId, projectId, project, onClose, onFeatureUpdated }: FeatureChatPanelProps) {
  // Track this panel as open to suppress toasts for the current feature
  useTrackOpenPanel(featureId);

  const editorRef = useRef<MDXEditorMethods>(null);
  const [feature, setFeature] = useState<FeatureData | null>(null);
  const [messages, setMessages] = useState<FeatureMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPanel, setOpenPanel] = useState<'spec' | 'code-review' | null>(null);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);

  // Get background stream for sending implementation messages
  const { sendMessage: bgSendMessage } = useBackgroundStream();

  // Spec state
  const [specContent, setSpecContent] = useState("");
  const [proposedMarkdown, setProposedMarkdown] = useState<string | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Session reset key
  const [messagesKey, setMessagesKey] = useState(0);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOpen = featureId !== null;

  // Handle escape key - close sidebar first, then panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openPanel !== null) {
          setOpenPanel(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openPanel, onClose]);

  // Load feature data when featureId changes
  useEffect(() => {
    if (!featureId) {
      setFeature(null);
      setMessages([]);
      setLoading(false);
      setOpenPanel(null);
      return;
    }

    const loadFeature = async () => {
      setLoading(true);
      try {
        // Load feature data
        const featureRes = await fetch(`/api/features/${featureId}`);
        if (featureRes.ok) {
          const featureData = await featureRes.json();
          setFeature({
            id: featureData.id,
            title: featureData.title,
            description: featureData.description,
            status: featureData.status === "ready" ? "current" : featureData.status,
            specMarkdown: featureData.specMarkdown,
            initialIdea: featureData.initialIdea,
            subtasks: featureData.subtasks || []
          });
          setSpecContent(featureData.specMarkdown || "");
        }

        // Load messages
        const messagesRes = await fetch(`/api/features/${featureId}/messages`);
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(messagesData.messages || []);
        }
      } catch (error) {
        console.error("Failed to load feature:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFeature();
  }, [featureId]);

  // Handle spec generation from chat - saves immediately
  const handleSpecGenerated = useCallback(async (markdown: string) => {
    setSpecContent(markdown);
    if (editorRef.current) {
      editorRef.current.setMarkdown(markdown);
    }

    // Save immediately instead of waiting for auto-save
    if (!featureId || !markdown.trim()) return;

    try {
      const response = await fetch(`/api/features/${featureId}/spec`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specMarkdown: markdown })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedFeature = data.feature;
        const uiStatus = updatedFeature.status === "ready" ? "current" : updatedFeature.status;
        setFeature((prev) => (prev ? { ...prev, status: uiStatus, specMarkdown: markdown } : null));
        onFeatureUpdated();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to save generated spec:", response.status, errorData);
        // Set unsaved so auto-save can retry
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error("Failed to save generated spec:", error);
      // Set unsaved so auto-save can retry
      setHasUnsavedChanges(true);
    }
  }, [featureId, onFeatureUpdated]);

  // Handle pending change from updateSpec tool
  const handlePendingChange = useCallback(
    (proposed: string) => {
      setOriginalMarkdown(specContent);
      setProposedMarkdown(proposed);
    },
    [specContent]
  );

  // Handle accepting the proposed change
  const handleAcceptChange = useCallback(() => {
    if (proposedMarkdown) {
      setSpecContent(proposedMarkdown);
      setHasUnsavedChanges(true);
    }
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
  }, [proposedMarkdown]);

  // Handle rejecting the proposed change
  const handleRejectChange = useCallback(() => {
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
  }, []);

  // Handle session reset
  const handleSessionReset = useCallback(() => {
    setMessages([]);
    setMessagesKey((prev) => prev + 1);
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
    // Clear initialIdea to prevent auto-send on remount
    setFeature((prev) => (prev ? { ...prev, initialIdea: null } : null));
  }, []);

  // Handle status transition
  const handleStatusTransition = useCallback(
    async (newStatus: "ready" | "done") => {
      if (!featureId) return;

      try {
        const response = await fetch(`/api/features/${featureId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          // Update local state with UI-friendly status
          setFeature((prev) =>
            prev
              ? {
                  ...prev,
                  status: newStatus === "ready" ? "current" : "done"
                }
              : null
          );
          onFeatureUpdated();
        }
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    },
    [featureId, onFeatureUpdated]
  );

  // Handle Start button - validates spec, updates status, sends implementation message
  const handleStart = useCallback(async () => {
    // Check if spec is empty
    if (!specContent.trim()) {
      toast.warning("No spec to implement", {
        description: "Please generate a spec before starting implementation."
      });
      return;
    }

    if (!featureId || !feature) return;

    // Update status to ready
    await handleStatusTransition("ready");

    // Create implementation prompt
    const implementationPrompt = `The spec is ready. Let's implement this feature:\n\n${specContent}`;

    // Save user message to DB
    try {
      await fetch(`/api/features/${featureId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            role: "user",
            content: { parts: [{ type: "text", text: implementationPrompt }] }
          }
        })
      });
    } catch (error) {
      console.error("Failed to save implementation message:", error);
    }

    // Send message via background stream
    bgSendMessage(featureId, { text: implementationPrompt }, {
      currentSpecMarkdown: specContent,
      featureTitle: feature.title,
      onSpecGenerated: undefined,
      onPendingChange: undefined,
    });
  }, [specContent, featureId, feature, handleStatusTransition, bgSendMessage]);

  // Handle feature deletion (archive)
  const handleDeleteFeature = useCallback(async () => {
    if (!featureId) return;

    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" })
      });

      if (response.ok) {
        setShowDeleteDialog(false);
        onClose();
        onFeatureUpdated();
      }
    } catch (error) {
      console.error("Failed to archive feature:", error);
    }
  }, [featureId, onClose, onFeatureUpdated]);

  // Save spec
  const saveSpec = useCallback(async () => {
    if (!featureId || !specContent.trim()) return;

    setSaveStatus("saving");
    try {
      const response = await fetch(`/api/features/${featureId}/spec`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specMarkdown: specContent })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedFeature = data.feature;

        // Update local state if status changed (idea → scoped auto-transition)
        if (updatedFeature.status && updatedFeature.status !== feature?.status) {
          const uiStatus = updatedFeature.status === "ready" ? "current" : updatedFeature.status;
          setFeature((prev) => (prev ? { ...prev, status: uiStatus, specMarkdown: specContent } : null));
          onFeatureUpdated();
        } else {
          // Still update specMarkdown in local state
          setFeature((prev) => (prev ? { ...prev, specMarkdown: specContent } : null));
        }

        setHasUnsavedChanges(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to save spec:", response.status, errorData);
        setSaveStatus("idle");
      }
    } catch (error) {
      console.error("Failed to save spec:", error);
      setSaveStatus("idle");
    }
  }, [featureId, specContent, feature?.status, onFeatureUpdated]);

  // Auto-save spec
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      saveSpec();
    }, 2000);

    return () => clearTimeout(timer);
  }, [specContent, hasUnsavedChanges, saveSpec]);

  // Handle spec content change
  const handleSpecChange = useCallback((markdown: string) => {
    setSpecContent(markdown);
    setHasUnsavedChanges(true);
  }, []);

  // Handle subtasks update
  const handleSubtasksChange = useCallback(
    async (subtasks: SubTask[]) => {
      if (!featureId) return;

      // Optimistic update
      setFeature((prev) => (prev ? { ...prev, subtasks } : null));

      try {
        await fetch(`/api/features/${featureId}/subtasks`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtasks })
        });
        onFeatureUpdated();
      } catch (error) {
        console.error("Failed to update subtasks:", error);
      }
    },
    [featureId, onFeatureUpdated]
  );

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget) {
      if (openPanel !== null) {
        setOpenPanel(null);
      } else {
        onClose();
      }
    }
  };

  const hasSpec = !!feature?.specMarkdown || !!specContent;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Single shared backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={handleBackdropClick} />

      {/* Panel container - positioned on right */}
      <div className="absolute inset-y-0 right-0 flex">
        {/* Spec Panel - Collapsible side bar */}
        <CollapsibleSideBar
          label="SPEC"
          isExpanded={openPanel === 'spec'}
          onToggle={() => setOpenPanel(openPanel === 'spec' ? null : 'spec')}
          hasContent={hasSpec}
        >
          <SpecEditor
            ref={editorRef}
            content={proposedMarkdown ?? specContent}
            onChange={handleSpecChange}
            saveStatus={saveStatus}
            diffMarkdown={originalMarkdown ?? undefined}
            viewMode={originalMarkdown ? "diff" : "rich-text"}
            projectContext={project}
            featureTitle={feature?.title}
          />
        </CollapsibleSideBar>

        {/* Code Review Panel - Collapsible side bar (only when current or done) */}
        {(feature?.status === "current" || feature?.status === "done") && (
          <CollapsibleSideBar
            label="CODE REVIEW"
            isExpanded={openPanel === 'code-review'}
            onToggle={() => setOpenPanel(openPanel === 'code-review' ? null : 'code-review')}
            hasContent={true}
          >
            <CodeReviewViewer
              projectId={projectId}
              featureId={featureId}
              onFeatureCompleted={() => {
                setFeature((prev) => prev ? { ...prev, status: "done" } : null);
                onFeatureUpdated();
              }}
            />
          </CollapsibleSideBar>
        )}

        {/* Chat Panel - Right side (always visible when panel is open) */}
        <div
          className={`bg-background border-l border-border flex flex-col animate-in fade-in duration-200 ${
            openPanel !== null ? "w-[600px]" : "w-full sm:w-[600px]"
          }`}
        >
          {loading ? (
            <div className="flex flex-col h-full">
              {/* Skeleton Header */}
              <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </div>
              {/* Skeleton Chat Area */}
              <div className="flex-1 p-4 space-y-4">
                <div className="flex gap-3">
                  <Skeleton className="size-8 rounded-sm shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="space-y-2 flex-1 max-w-[80%]">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2 ml-auto" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="size-8 rounded-sm shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
              {/* Skeleton Footer */}
              <div className="border-t border-border p-3 shrink-0">
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </div>
            </div>
          ) : feature ? (
            <>
              {/* Header */}
              <div className="px-4 py-2 border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h2 className="text-base font-semibold truncate">{feature.title}</h2>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {STATUS_LABELS[feature.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Status transition buttons */}
                    {feature.status === "scoped" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleStart}
                        className="h-7 gap-1.5"
                      >
                        <Play weight="bold" className="size-3.5" />
                        Start
                      </Button>
                    )}
                    {feature.status === "current" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusTransition("done")}
                        className="h-7 gap-1.5"
                      >
                        <CheckCircle weight="bold" className="size-3.5" />
                        Complete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                      className="size-8"
                      title="Tasks"
                    >
                      <ListChecks weight="bold" className="size-4" />
                    </Button>
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          title="Delete feature"
                        >
                          <Trash weight="bold" className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Feature?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will archive &ldquo;{feature.title}&rdquo; and remove it from your project. You can
                            restore it later from archived features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel asChild>
                            <Button variant="outline">Cancel</Button>
                          </AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <Button variant="destructive" onClick={handleDeleteFeature}>
                              Delete
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" size="icon" onClick={onClose} className="size-8">
                      <X weight="bold" className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <FeatureChat
                  key={messagesKey}
                  projectId={projectId}
                  featureId={feature.id}
                  featureTitle={feature.title}
                  initialIdea={feature.initialIdea || undefined}
                  initialMessages={messages}
                  onSpecGenerated={handleSpecGenerated}
                  onPendingChange={handlePendingChange}
                  onAcceptChange={handleAcceptChange}
                  onRejectChange={handleRejectChange}
                  onSessionReset={handleSessionReset}
                  currentSpecMarkdown={specContent}
                  hasPendingChange={proposedMarkdown !== null}
                  hasSavedSpec={!!feature.specMarkdown}
                />
              </div>

              {/* Subtasks Panel (expandable) */}
              {subtasksExpanded && (
                <div className="border-t border-border p-3 shrink-0">
                  <SubtaskList subtasks={feature.subtasks} onSubtasksChange={handleSubtasksChange} />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-end px-4 py-3 border-b border-border">
                <Button variant="ghost" size="icon" onClick={onClose} className="size-8">
                  <X weight="bold" className="size-4" />
                </Button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <p className="font-mono text-sm text-muted-foreground">Feature not found</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
