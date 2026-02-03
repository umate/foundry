"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  GitCommitIcon,
  SpinnerGapIcon,
  CloudArrowUpIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

interface CommitFormProps {
  projectId: string;
  featureId?: string;
  diffSummary: {
    files: number;
    additions: number;
    deletions: number;
  };
  onSuccess?: () => void;
  onFeatureCompleted?: () => void;
  onPushSuccess?: () => void;
  onComplete?: () => void;
  hasRemote?: boolean;
}

export function CommitForm({
  projectId,
  featureId,
  diffSummary,
  onSuccess,
  onFeatureCompleted,
  onPushSuccess,
  onComplete,
  hasRemote,
}: CommitFormProps) {
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const hasGeneratedRef = useRef(false);

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
      setError(
        err instanceof Error ? err.message : "Failed to generate message"
      );
    } finally {
      setGenerating(false);
    }
  }, [projectId]);

  // Auto-generate on mount (once)
  useEffect(() => {
    if (!hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateMessage();
    }
  }, [generateMessage]);

  const handleCommit = async (andPush: boolean = false) => {
    if (!message.trim() || committing) return;
    setCommitting(true);
    setError("");

    try {
      // Commit
      const commitResponse = await fetch("/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, message: message.trim() }),
      });
      if (!commitResponse.ok) {
        const result = await commitResponse.json().catch(() => ({}));
        throw new Error(
          result.error || "Failed to commit changes"
        );
      }

      // Mark feature as done if featureId provided
      if (featureId) {
        try {
          await fetch(`/api/features/${featureId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "done" }),
          });
          onFeatureCompleted?.();
        } catch {
          console.error("Failed to mark feature as done");
        }
      }

      // Reset form and notify
      setMessage("");
      hasGeneratedRef.current = false;
      onSuccess?.();

      // Optionally push
      if (andPush) {
        const pushResponse = await fetch("/api/git/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (!pushResponse.ok) {
          const result = await pushResponse.json().catch(() => ({}));
          toast.error(result.error || "Committed but failed to push");
        } else {
          toast.success("Committed and pushed");
          onPushSuccess?.();
        }
      } else {
        toast.success("Changes committed");
      }

      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit");
    } finally {
      setCommitting(false);
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
      handleCommit(false);
    }
  };

  const isLoading = generating || committing;

  return (
    <div className="border-t border-border bg-background px-4 py-3 shrink-0">
      {/* Summary line */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Commit {diffSummary.files} file
          {diffSummary.files !== 1 ? "s" : ""}{" "}
          <span className="text-success">+{diffSummary.additions}</span>{" "}
          <span className="text-destructive">-{diffSummary.deletions}</span>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={generateMessage}
          disabled={isLoading}
          title="Regenerate message"
        >
          <ArrowsClockwiseIcon weight="bold" className="size-3" />
        </Button>
      </div>

      {/* Message textarea */}
      {generating ? (
        <div className="flex items-center justify-center h-[140px] border rounded-sm bg-muted/30 mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <SpinnerGapIcon
              weight="bold"
              className="size-4 animate-spin"
            />
            <span className="font-mono text-xs">
              Generating message...
            </span>
          </div>
        </div>
      ) : (
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Commit message..."
          rows={6}
          disabled={isLoading}
          className="resize-none min-h-[140px] text-sm mb-2"
        />
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-sm p-2 mb-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-[10px] text-muted-foreground font-mono mr-auto">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">
            Cmd+Enter
          </kbd>{" "}
          to commit
        </span>
        {hasRemote ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCommit(false)}
              disabled={isLoading || !message.trim()}
              className="h-7 gap-1.5"
            >
              {committing ? (
                <SpinnerGapIcon
                  weight="bold"
                  className="size-3 animate-spin"
                />
              ) : (
                <GitCommitIcon weight="bold" className="size-3" />
              )}
              <span className="font-mono uppercase tracking-wider text-xs">
                Commit
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCommit(true)}
              disabled={isLoading || !message.trim()}
              className="h-7 gap-1.5"
            >
              {committing ? (
                <SpinnerGapIcon
                  weight="bold"
                  className="size-3 animate-spin"
                />
              ) : (
                <CloudArrowUpIcon weight="bold" className="size-3" />
              )}
              <span className="font-mono uppercase tracking-wider text-xs">
                Commit & Push
              </span>
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCommit(false)}
            disabled={isLoading || !message.trim()}
            className="h-7 gap-1.5"
          >
            {committing ? (
              <SpinnerGapIcon
                weight="bold"
                className="size-3 animate-spin"
              />
            ) : (
              <GitCommitIcon weight="bold" className="size-3" />
            )}
            <span className="font-mono uppercase tracking-wider text-xs">
              Commit
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
