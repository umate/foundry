"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  GitCommit,
  SpinnerGap,
  CloudArrowUp,
  CheckCircle,
  WarningCircle
} from "@phosphor-icons/react";

interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  featureId?: string;
  diffSummary: {
    files: number;
    additions: number;
    deletions: number;
  };
  onSuccess?: () => void;
  onFeatureCompleted?: () => void;
}

type DialogState = "editing" | "committing" | "committingAndPushing" | "committed" | "pushing" | "pushed";

interface RemoteInfo {
  hasRemote: boolean;
  remotes: { name: string; url: string }[];
  branch: string | null;
}

interface PushResult {
  remote: string;
  branch: string;
}

export function CommitDialog({
  open,
  onOpenChange,
  projectId,
  featureId,
  diffSummary,
  onSuccess,
  onFeatureCompleted
}: CommitDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasGeneratedRef = useRef(false);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>("editing");
  const [remoteInfo, setRemoteInfo] = useState<RemoteInfo | null>(null);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  const [commitHash, setCommitHash] = useState<string | null>(null);

  const generateMessage = useCallback(async () => {
    setGenerating(true);
    setError("");

    try {
      const response = await fetch(
        `/api/git/generate-commit-message?projectId=${projectId}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate commit message");
      }

      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate message");
    } finally {
      setGenerating(false);
    }
  }, [projectId]);

  // Check for remote when dialog opens
  const checkRemote = useCallback(async () => {
    try {
      const response = await fetch(`/api/git/push?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setRemoteInfo(data);
      }
    } catch {
      // Silently fail - push option just won't be available
      setRemoteInfo(null);
    }
  }, [projectId]);

  // Generate commit message and check remote when dialog opens
  useEffect(() => {
    if (open && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateMessage();
      checkRemote();
    }
    if (!open) {
      hasGeneratedRef.current = false;
      // Reset state when dialog closes
      setDialogState("editing");
      setRemoteInfo(null);
      setPushResult(null);
      setCommitHash(null);
    }
  }, [open, generateMessage, checkRemote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setCommitting(true);
    setError("");

    try {
      const response = await fetch("/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: message.trim()
        })
      });

      if (!response.ok) {
        let errorMessage = "Failed to commit changes";
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch {
          // Response was not JSON (e.g., HTML error page)
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Mark feature as done if featureId provided
      if (featureId) {
        try {
          await fetch(`/api/features/${featureId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "done" })
          });
          onFeatureCompleted?.();
        } catch {
          // Feature completion is non-critical, don't block commit success
          console.error("Failed to mark feature as done");
        }
      }

      // Store commit hash and close dialog
      setCommitHash(result.commitHash);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit");
    } finally {
      setCommitting(false);
    }
  };

  const handleCancel = () => {
    setMessage("");
    setError("");
    onOpenChange(false);
  };

  const handlePush = async () => {
    setDialogState("pushing");
    setError("");

    try {
      const response = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });

      if (!response.ok) {
        let errorMessage = "Failed to push changes";
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch {
          // Response was not JSON (e.g., HTML error page)
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setPushResult({ remote: result.remote, branch: result.branch });
      onOpenChange(false); // Close dialog on successful push
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to push");
      setDialogState("committed"); // Go back to committed state on error
    }
  };

  const handleClose = () => {
    setMessage("");
    setError("");
    onOpenChange(false);
  };

  const handleCommitAndPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setDialogState("committingAndPushing");
    setError("");

    try {
      // First, commit
      const commitResponse = await fetch("/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: message.trim()
        })
      });

      if (!commitResponse.ok) {
        let errorMessage = "Failed to commit changes";
        try {
          const commitResult = await commitResponse.json();
          errorMessage = commitResult.error || errorMessage;
        } catch {
          // Response was not JSON (e.g., HTML error page)
        }
        throw new Error(errorMessage);
      }

      const commitResult = await commitResponse.json();

      // Mark feature as done if featureId provided
      if (featureId) {
        try {
          await fetch(`/api/features/${featureId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "done" })
          });
          onFeatureCompleted?.();
        } catch {
          // Feature completion is non-critical, don't block commit success
          console.error("Failed to mark feature as done");
        }
      }

      setCommitHash(commitResult.commitHash);
      onSuccess?.();

      // Now, push
      try {
        const pushResponse = await fetch("/api/git/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId })
        });

        if (!pushResponse.ok) {
          let errorMessage = "Failed to push changes";
          try {
            const pushResult = await pushResponse.json();
            errorMessage = pushResult.error || errorMessage;
          } catch {
            // Response was not JSON (e.g., HTML error page)
          }
          // Commit succeeded but push failed - show committed state with error
          setError(errorMessage);
          setDialogState("committed");
          return;
        }

        const pushResult = await pushResponse.json();
        setPushResult({ remote: pushResult.remote, branch: pushResult.branch });
        onOpenChange(false); // Close dialog on successful push
      } catch (pushErr) {
        // Network error or other issue during push - commit already succeeded
        setError(
          pushErr instanceof Error ? pushErr.message : "Failed to push changes"
        );
        setDialogState("committed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit");
      setDialogState("editing");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      e.metaKey &&
      message.trim() &&
      !committing &&
      !generating
    ) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const isLoading = generating || committing || dialogState === "committingAndPushing";

  // Render post-commit states (committing, committingAndPushing, committed, pushing, pushed)
  if (dialogState !== "editing" && dialogState !== "committing") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider flex items-center gap-2">
              {dialogState === "pushed" ? (
                <>
                  <CheckCircle weight="bold" className="text-success" />
                  Pushed Successfully
                </>
              ) : dialogState === "pushing" ? (
                <>
                  <SpinnerGap weight="bold" className="animate-spin" />
                  Pushing...
                </>
              ) : dialogState === "committingAndPushing" ? (
                <>
                  <SpinnerGap weight="bold" className="animate-spin" />
                  Committing & Pushing...
                </>
              ) : (
                <>
                  <CheckCircle weight="bold" className="text-success" />
                  Committed Successfully
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {dialogState === "pushed" && pushResult ? (
                <>
                  Changes pushed to{" "}
                  <span className="font-mono text-foreground">
                    {pushResult.remote}/{pushResult.branch}
                  </span>
                </>
              ) : dialogState === "pushing" ? (
                "Pushing changes to remote repository..."
              ) : dialogState === "committingAndPushing" ? (
                "Committing changes and pushing to remote..."
              ) : (
                <>
                  Commit{" "}
                  <span className="font-mono text-foreground">
                    {commitHash?.slice(0, 7)}
                  </span>{" "}
                  created successfully
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {dialogState === "committed" && (
              <div className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 flex items-start gap-2">
                    <WarningCircle
                      weight="bold"
                      className="size-4 text-destructive shrink-0 mt-0.5"
                    />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {remoteInfo?.hasRemote && (
                  <div className="bg-muted/30 border rounded-md p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Push your changes to{" "}
                      <span className="font-mono text-foreground">
                        {remoteInfo.remotes[0]?.name}/{remoteInfo.branch}
                      </span>
                      ?
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handlePush} className="flex-1">
                        <CloudArrowUp weight="bold" className="size-4 mr-2" />
                        Push to Remote
                      </Button>
                      <Button variant="outline" onClick={handleClose}>
                        Done
                      </Button>
                    </div>
                  </div>
                )}

                {!remoteInfo?.hasRemote && (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      No remote repository configured. You can push manually
                      later.
                    </p>
                    <Button onClick={handleClose}>Done</Button>
                  </div>
                )}
              </div>
            )}

            {dialogState === "pushing" && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SpinnerGap weight="bold" className="size-5 animate-spin" />
                  <span className="font-mono text-sm">
                    Pushing to {remoteInfo?.remotes[0]?.name}...
                  </span>
                </div>
              </div>
            )}

            {dialogState === "committingAndPushing" && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <SpinnerGap weight="bold" className="size-5 animate-spin" />
                  <span className="font-mono text-sm">
                    Committing and pushing to {remoteInfo?.remotes[0]?.name}...
                  </span>
                </div>
              </div>
            )}

            {dialogState === "pushed" && (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center size-12 rounded-full bg-success/10 mb-4">
                  <CheckCircle
                    weight="bold"
                    className="size-6 text-success"
                  />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Your changes are now live on the remote repository.
                </p>
                <Button onClick={handleClose}>Done</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render editing state (original form)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider flex items-center gap-2">
            <GitCommit weight="bold" />
            Commit Changes
          </DialogTitle>
          <DialogDescription>
            {diffSummary.files} file{diffSummary.files !== 1 ? "s" : ""} changed (
            <span className="text-success">+{diffSummary.additions}</span>{" "}
            <span className="text-destructive">-{diffSummary.deletions}</span>)
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {generating ? (
              <div className="flex items-center justify-center h-48 border rounded-md bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SpinnerGap weight="bold" className="size-4 animate-spin" />
                  <span className="font-mono text-sm">Generating message...</span>
                </div>
              </div>
            ) : (
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Commit message..."
                rows={8}
                required
                disabled={isLoading}
                className="resize-none min-h-[200px]"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Cmd+Enter</kbd> to commit
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            {remoteInfo?.hasRemote ? (
              <>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isLoading || !message.trim()}
                >
                  {committing ? "Committing..." : "Commit"}
                </Button>
                <Button
                  type="button"
                  onClick={handleCommitAndPush}
                  disabled={isLoading || !message.trim()}
                >
                  <CloudArrowUp weight="bold" className="size-4 mr-2" />
                  {dialogState === "committingAndPushing" ? "Pushing..." : "Commit & Push"}
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={isLoading || !message.trim()}>
                {committing ? "Committing..." : "Commit"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
