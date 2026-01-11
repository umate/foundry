"use client";

import { useState, useRef } from "react";
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
import { Lightbulb } from "@phosphor-icons/react/dist/ssr";

interface AddIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
  onFeatureCreated?: (featureId: string) => void;
}

export function AddIdeaDialog({ open, onOpenChange, projectId, onSuccess, onFeatureCreated }: AddIdeaDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [ideaText, setIdeaText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey && ideaText.trim() && !loading) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Create feature
      const response = await fetch(`/api/projects/${projectId}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaText: ideaText.trim(),
          createOnly: true
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create feature");
      }

      const { featureId } = await response.json();

      // Step 2: Generate title/description
      await fetch(`/api/features/${featureId}/generate-title`, {
        method: "POST"
      });

      // Step 3: Reset form and close dialog
      setIdeaText("");
      onOpenChange(false);

      // Step 4: Notify parent to reload and open sidebar
      onSuccess?.();
      onFeatureCreated?.(featureId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create feature");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIdeaText("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider flex items-center gap-2">
            <Lightbulb weight="bold" />
            New Idea
          </DialogTitle>
          <DialogDescription>
            Describe your feature idea. You&apos;ll refine it with AI on the next page.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="I want to add a feature that..."
              rows={8}
              required
              className="resize-none min-h-[160px] max-h-[240px] overflow-y-auto"
            />
            <p className="text-xs text-muted-foreground">
              Be as detailed or brief as you like. The AI will help you flesh it out.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !ideaText.trim()}
              shortcut={{ key: "enter", meta: true }}
            >
              {loading ? "Generating..." : "Start Refining"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
