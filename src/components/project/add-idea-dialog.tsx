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
import {
  ImageDropzone,
  type PendingImage,
  uploadImages,
  ImageUploadingIndicator
} from "@/components/ui/image-upload";

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
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIdeaText("");
      setLoading(false);
      setLoadingAction(null);
      setError("");
      // Clean up pending image URLs
      pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setPendingImages([]);
      setIsUploadingImages(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Step 1: Upload images if any
      let imageIds: string[] = [];
      if (pendingImages.length > 0) {
        setIsUploadingImages(true);
        const uploadedImages = await uploadImages(pendingImages);
        imageIds = uploadedImages.map(img => img.id);
        setIsUploadingImages(false);
      }

      // Step 2: Create feature with image IDs
      const response = await fetch(`/api/projects/${projectId}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaText: ideaText.trim(),
          createOnly: true,
          imageIds
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create feature");
      }

      const { featureId } = await response.json();

      // Step 3: Generate title/description (wait for it to complete)
      await fetch(`/api/features/${featureId}/generate-title`, {
        method: "POST"
      });

      // Step 4: Reset form and close dialog
      setIdeaText("");
      pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setPendingImages([]);
      setLoading(false);
      setLoadingAction(null);
      onOpenChange(false);

      // Refresh the list but don't open sidebar
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create feature");
      setLoading(false);
      setLoadingAction(null);
      setIsUploadingImages(false);
    }
  };

  const handleAddAndRefine = async () => {
    setError("");
    setLoading(true);
    setLoadingAction("refine");

    try {
      // Step 1: Upload images if any
      let imageIds: string[] = [];
      if (pendingImages.length > 0) {
        setIsUploadingImages(true);
        const uploadedImages = await uploadImages(pendingImages);
        imageIds = uploadedImages.map(img => img.id);
        setIsUploadingImages(false);
      }

      // Step 2: Create feature with image IDs
      const response = await fetch(`/api/projects/${projectId}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaText: ideaText.trim(),
          createOnly: true,
          imageIds
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create feature");
      }

      const { featureId } = await response.json();

      // Step 3: Generate title/description
      await fetch(`/api/features/${featureId}/generate-title`, {
        method: "POST"
      });

      // Step 4: Reset form and close dialog
      setIdeaText("");
      pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setPendingImages([]);
      setLoading(false);
      setLoadingAction(null);
      onOpenChange(false);

      // Step 5: Notify parent to reload and open sidebar
      onSuccess?.();
      onFeatureCreated?.(featureId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create feature");
      setLoading(false);
      setLoadingAction(null);
      setIsUploadingImages(false);
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
            <ImageDropzone
              images={pendingImages}
              onImagesChange={setPendingImages}
              disabled={loading}
              maxImages={5}
            >
              <Textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="I want to add a feature that..."
                required
                className="resize-none min-h-[40vh]"
              />
            </ImageDropzone>
            <p className="text-xs text-muted-foreground">
              Be as detailed or brief as you like. The AI will help you flesh it out.
              Drag & drop or paste images to include visual context.
            </p>
          </div>

          {isUploadingImages && <ImageUploadingIndicator />}

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
