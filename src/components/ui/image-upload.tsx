"use client";

import { useCallback, useState, useRef } from "react";
import { ImageIcon, XIcon, UploadIcon, SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

export interface UploadedImageData {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  createdAt: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

interface ImageUploadProps {
  onImagesChange: (images: PendingImage[]) => void;
  images: PendingImage[];
  disabled?: boolean;
  className?: string;
  maxImages?: number;
  variant?: "button" | "dropzone";
}

// Button-only variant for use alongside textareas
export function ImageUploadButton({
  onImagesChange,
  images = [],
  disabled = false,
  className,
  maxImages = 5,
}: Omit<ImageUploadProps, "variant">) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Invalid type. Allowed: PNG, JPEG, GIF, WebP`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Max size: 5MB`;
    }
    return null;
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxImages - images.length;

      if (remaining <= 0) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const filesToAdd = fileArray.slice(0, remaining);
      const newImages: PendingImage[] = [];
      const errors: string[] = [];

      for (const file of filesToAdd) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        newImages.push({
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      if (errors.length > 0) {
        setError(errors.join("; "));
      } else {
        setError(null);
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    },
    [images, maxImages, onImagesChange, validateFile]
  );

  const removeImage = useCallback(
    (id: string) => {
      const image = images.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      onImagesChange(images.filter((img) => img.id !== id));
      setError(null);
    },
    [images, onImagesChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = ""; // Reset input
    }
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
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
        addFiles(imageFiles);
      }
    },
    [addFiles]
  );

  // Expose paste handler for parent components
  const handleContainerPaste = useCallback(
    (e: React.ClipboardEvent) => {
      handlePaste(e.nativeEvent);
    },
    [handlePaste]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || images.length >= maxImages}
          title="Attach images"
        >
          <ImageIcon weight="bold" className="size-4" />
        </Button>

        {images.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {images.length}/{maxImages} images
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {images.length > 0 && (
        <ImageThumbnailGrid images={images} onRemove={removeImage} disabled={disabled} />
      )}

      {/* Hidden div to handle paste events when used with a textarea */}
      <div className="hidden" onPaste={handleContainerPaste} />
    </div>
  );
}

// Dropzone variant that wraps content
interface ImageDropzoneProps extends Omit<ImageUploadProps, "variant"> {
  children: React.ReactNode;
  onPasteCapture?: (e: React.ClipboardEvent) => void;
}

export function ImageDropzone({
  onImagesChange,
  images = [],
  disabled = false,
  className,
  maxImages = 5,
  children,
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Invalid type. Allowed: PNG, JPEG, GIF, WebP`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Max size: 5MB`;
    }
    return null;
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxImages - images.length;

      if (remaining <= 0) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const filesToAdd = fileArray.slice(0, remaining);
      const newImages: PendingImage[] = [];
      const errors: string[] = [];

      for (const file of filesToAdd) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        newImages.push({
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      if (errors.length > 0) {
        setError(errors.join("; "));
      } else {
        setError(null);
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    },
    [images, maxImages, onImagesChange, validateFile]
  );

  const removeImage = useCallback(
    (id: string) => {
      const image = images.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      onImagesChange(images.filter((img) => img.id !== id));
      setError(null);
    },
    [images, onImagesChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length > 0) {
      addFiles(imageFiles);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
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
      addFiles(imageFiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-md">
          <div className="flex flex-col items-center gap-2 text-primary">
            <UploadIcon weight="bold" className="size-8" />
            <span className="text-sm font-mono">Drop images here</span>
          </div>
        </div>
      )}

      {/* Content */}
      {children}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="mt-2">
          <ImageThumbnailGrid images={images} onRemove={removeImage} disabled={disabled} />
        </div>
      )}

      {/* Upload button */}
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || images.length >= maxImages}
        >
          <ImageIcon weight="bold" className="size-4" />
          <span>Add Image</span>
        </Button>
        {images.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {images.length}/{maxImages}
          </span>
        )}
      </div>
    </div>
  );
}

// Thumbnail grid component
interface ImageThumbnailGridProps {
  images: PendingImage[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

function ImageThumbnailGrid({ images, onRemove, disabled }: ImageThumbnailGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative group size-16 rounded-sm overflow-hidden border border-border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.previewUrl}
            alt={image.file.name}
            className="size-full object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(image.id)}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-sm bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove image"
            >
              <XIcon weight="bold" className="size-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Display component for showing already-uploaded images
interface UploadedImageDisplayProps {
  images: { filename: string; url: string }[];
  className?: string;
}

export function UploadedImageDisplay({ images, className }: UploadedImageDisplayProps) {
  if (images.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {images.map((image) => (
        <div
          key={image.filename}
          className="size-16 rounded-sm overflow-hidden border border-border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.filename}
            className="size-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

// Upload helper function
export async function uploadImages(images: PendingImage[]): Promise<UploadedImageData[]> {
  if (images.length === 0) return [];

  const formData = new FormData();
  for (const image of images) {
    formData.append("images", image.file);
  }

  const response = await fetch("/api/images", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload images");
  }

  const data = await response.json();
  return data.images;
}

// Loading state component
export function ImageUploadingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <SpinnerIcon className="size-3 animate-spin" weight="bold" />
      <span>Uploading images...</span>
    </div>
  );
}
