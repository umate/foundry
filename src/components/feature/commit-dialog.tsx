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
import { GitCommit, SpinnerGap } from "@phosphor-icons/react";

interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  diffSummary: {
    files: number;
    additions: number;
    deletions: number;
  };
  onSuccess?: () => void;
}

export function CommitDialog({
  open,
  onOpenChange,
  projectId,
  diffSummary,
  onSuccess
}: CommitDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasGeneratedRef = useRef(false);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");

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

  // Generate commit message when dialog opens
  useEffect(() => {
    if (open && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateMessage();
    }
    if (!open) {
      hasGeneratedRef.current = false;
    }
  }, [open, generateMessage]);

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to commit changes");
      }

      // Success - close dialog and refresh
      setMessage("");
      onOpenChange(false);
      onSuccess?.();
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

  const isLoading = generating || committing;

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
              <div className="flex items-center justify-center h-32 border rounded-md bg-muted/30">
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
                rows={5}
                required
                disabled={isLoading}
                className="resize-none min-h-[120px]"
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
            <Button type="submit" disabled={isLoading || !message.trim()}>
              {committing ? "Committing..." : "Commit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
