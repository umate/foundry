"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Play, CheckCircle, Trash, X } from "@phosphor-icons/react";
import { useTrackOpenPanel, useBackgroundStream } from "@/components/project/background-stream-context";
import { ModeProvider } from "@/components/providers/mode-provider";
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
import { FeatureChat } from "@/components/feature/feature-chat";
import { SpecEditor } from "@/components/feature/spec-editor";
import { WireframeViewer } from "@/components/feature/wireframe-viewer";
import { CodeReviewViewer } from "@/components/feature/code-review-viewer";
import { CollapsibleSideBar } from "@/components/ui/collapsible-side-bar";
import { FeatureStatus, STATUS_LABELS } from "@/types/feature";
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
  wireframe: string | null;
  initialIdea: string | null;
}

export function FeatureChatPanel({ featureId, projectId, project, onClose, onFeatureUpdated }: FeatureChatPanelProps) {
  // Track this panel as open to suppress toasts for the current feature
  useTrackOpenPanel(featureId);

  const editorRef = useRef<MDXEditorMethods>(null);
  const [feature, setFeature] = useState<FeatureData | null>(null);
  const [messages, setMessages] = useState<FeatureMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPanel, setOpenPanel] = useState<'spec' | 'wireframe' | 'code-review' | null>(null);

  // Get background stream for sending implementation messages
  const { sendMessage: bgSendMessage, getStreamState, clearPendingChange } = useBackgroundStream();

  // Pending change from context (scoped per-feature)
  const pendingChange = featureId ? getStreamState(featureId)?.pendingChange ?? null : null;

  // Spec state
  const [specContent, setSpecContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Wireframe state
  const [wireframeContent, setWireframeContent] = useState("");

  // Session reset key
  const [messagesKey, setMessagesKey] = useState(0);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteSpecDialog, setShowDeleteSpecDialog] = useState(false);
  const [isDeletingSpec, setIsDeletingSpec] = useState(false);

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
            wireframe: featureData.wireframe,
            initialIdea: featureData.initialIdea
          });
          setSpecContent(featureData.specMarkdown || "");
          setWireframeContent(featureData.wireframe || "");
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

  // Handle accepting the proposed change (from context)
  const handleAcceptChange = useCallback(() => {
    if (pendingChange) {
      setSpecContent(pendingChange.proposedMarkdown);
      setHasUnsavedChanges(true);
    }
    if (featureId) clearPendingChange(featureId);
  }, [pendingChange, featureId, clearPendingChange]);

  // Handle rejecting the proposed change (from context)
  const handleRejectChange = useCallback(() => {
    if (featureId) clearPendingChange(featureId);
  }, [featureId, clearPendingChange]);

  // Handle session reset
  const handleSessionReset = useCallback(() => {
    setMessages([]);
    setMessagesKey((prev) => prev + 1);
    if (featureId) clearPendingChange(featureId);
    // Clear initialIdea to prevent auto-send on remount
    setFeature((prev) => (prev ? { ...prev, initialIdea: null } : null));
  }, [featureId, clearPendingChange]);

  // Handle wireframe generation
  const handleWireframeGenerated = useCallback(async (wireframe: string) => {
    if (!feature?.id) return;
    setWireframeContent(wireframe);
    setOpenPanel('wireframe');
    try {
      await fetch(`/api/features/${feature.id}/wireframe`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wireframe }),
      });
    } catch (error) {
      console.error('Failed to save wireframe:', error);
    }
  }, [feature?.id]);

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
          // Close the sheet when marking as done
          if (newStatus === "done") {
            onClose();
          }
        }
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    },
    [featureId, onFeatureUpdated, onClose]
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

  // Handle spec deletion (clear spec and wireframe)
  const handleDeleteSpec = useCallback(async () => {
    if (!featureId) return;

    setIsDeletingSpec(true);
    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specMarkdown: null, wireframe: null })
      });

      if (response.ok) {
        // Clear local state
        setSpecContent("");
        setWireframeContent("");
        if (featureId) clearPendingChange(featureId);
        setFeature((prev) => prev ? { ...prev, specMarkdown: null, wireframe: null } : null);
        setShowDeleteSpecDialog(false);
        setOpenPanel(null); // Close the spec panel
        onFeatureUpdated();
      }
    } catch (error) {
      console.error("Failed to delete spec:", error);
    } finally {
      setIsDeletingSpec(false);
    }
  }, [featureId, clearPendingChange, onFeatureUpdated]);

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
          onDelete={() => setShowDeleteSpecDialog(true)}
        >
          <SpecEditor
            ref={editorRef}
            content={pendingChange?.proposedMarkdown ?? specContent}
            onChange={handleSpecChange}
            saveStatus={saveStatus}
            diffMarkdown={pendingChange?.originalMarkdown ?? undefined}
            viewMode={pendingChange ? "diff" : "rich-text"}
            projectContext={project}
            featureTitle={feature?.title}
          />
        </CollapsibleSideBar>

        {/* Wireframe Panel - Collapsible side bar */}
        {/* {wireframeContent && (
          <CollapsibleSideBar
            label="WIREFRAME"
            isExpanded={openPanel === 'wireframe'}
            onToggle={() => setOpenPanel(openPanel === 'wireframe' ? null : 'wireframe')}
            hasContent={true}
          >
            <WireframeViewer wireframe={wireframeContent} />
          </CollapsibleSideBar>
        )} */}

        {/* Code Review Panel - Collapsible side bar (only when current or done) */}
        {(feature?.status === "current" || feature?.status === "done") && (
          <CollapsibleSideBar
            label="CODE"
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
              <div className="px-3 py-1.5 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-6 w-20" />
                </div>
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
            <ModeProvider featureId={feature.id}>
              {/* Header */}
              <div className="px-3 py-1.5 border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold truncate min-w-0 flex-1">
                    {feature.title}
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground ml-2 font-normal">
                      {STATUS_LABELS[feature.status]}
                    </span>
                  </h2>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Status transition buttons */}
                    {feature.status === "scoped" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStart}
                        className="h-6 gap-1.5 text-[10px]"
                      >
                        <Play weight="bold" className="size-3" />
                        Start
                      </Button>
                    )}
                    {feature.status === "current" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusTransition("done")}
                        className="h-6 gap-1.5 text-[10px]"
                      >
                        <CheckCircle weight="bold" className="size-3" />
                        Complete
                      </Button>
                    )}
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          title="Delete feature"
                        >
                          <Trash weight="bold" className="size-3.5" />
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
                    <Button variant="ghost" size="icon" onClick={onClose} className="size-7">
                      <X weight="bold" className="size-3.5" />
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
                  onAcceptChange={handleAcceptChange}
                  onRejectChange={handleRejectChange}
                  onWireframeGenerated={handleWireframeGenerated}
                  onSessionReset={handleSessionReset}
                  currentSpecMarkdown={specContent}
                  hasPendingChange={pendingChange !== null}
                  hasSavedSpec={!!feature.specMarkdown}
                  onStatusChange={() => handleStatusTransition("ready")}
                />
              </div>

            </ModeProvider>
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

      {/* Delete Spec Confirmation Dialog */}
      <AlertDialog open={showDeleteSpecDialog} onOpenChange={setShowDeleteSpecDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Specification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the spec and wireframe for this feature.
              Your chat history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleDeleteSpec}
                disabled={isDeletingSpec}
              >
                {isDeletingSpec ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
