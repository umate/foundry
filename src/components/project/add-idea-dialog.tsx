"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
}

export function AddIdeaDialog({ open, onOpenChange, projectId, onSuccess }: AddIdeaDialogProps) {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaText: ideaText.trim(),
          createOnly: true // Create feature without AI processing
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create feature");
      }

      const data = await response.json();

      // Reset form and close dialog
      setIdeaText("");
      onOpenChange(false);
      onSuccess?.();

      // Redirect to feature page
      router.push(`/projects/${projectId}/features/${data.featureId}`);
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="I want to add a feature that..."
              rows={6}
              required
              className="resize-none"
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
            <Button type="submit" disabled={loading || !ideaText.trim()}>
              {loading ? "Creating..." : "Start Refining"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
