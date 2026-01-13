"use client";

import { useState, useRef, useEffect } from "react";
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
  const [loadingAction, setLoadingAction] = useState<"save" | "refine" | null>(null);
  const [error, setError] = useState("");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIdeaText("");
      setLoading(false);
      setLoadingAction(null);
      setError("");
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey && ideaText.trim() && !loading) {
      e.preventDefault();
      handleAddAndRefine();
    }
  };

  const handleSaveForLater = async () => {
    setError("");
    setLoading(true);
    setLoadingAction("save");

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

      // Step 2: Generate title/description (wait for it to complete)
      await fetch(`/api/features/${featureId}/generate-title`, {
        method: "POST"
      });

      // Step 3: Reset form and close dialog
      setIdeaText("");
      setLoading(false);
      setLoadingAction(null);
      onOpenChange(false);

      // Refresh the list but don't open sidebar
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create feature");
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const handleAddAndRefine = async () => {
    setError("");
    setLoading(true);
    setLoadingAction("refine");

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
      setLoading(false);
      setLoadingAction(null);
      onOpenChange(false);

      // Step 4: Notify parent to reload and open sidebar
      onSuccess?.();
      onFeatureCreated?.(featureId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create feature");
      setLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider flex items-center gap-2">
            <Lightbulb weight="bold" />
            New Idea
          </DialogTitle>
          <DialogDescription>
            Describe your feature idea. Save it for later or start refining with AI right away.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="I want to add a feature that..."
              required
              className="resize-none min-h-[40vh]"
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
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveForLater}
              disabled={loading || !ideaText.trim()}
            >
              {loadingAction === "save" ? "Saving..." : "Save for Later"}
            </Button>
            <Button
              type="button"
              onClick={handleAddAndRefine}
              disabled={loading || !ideaText.trim()}
              shortcut={{ key: "enter", meta: true }}
            >
              {loadingAction === "refine" ? "Creating..." : "Add & Refine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
