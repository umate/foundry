"use client";

import { useState } from "react";
import { Check, PaperPlaneTilt, SpinnerGap, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Suggestion {
  file: string;
  lines?: string;
  severity: "high" | "medium" | "low";
  comment: string;
}

interface CodeReviewSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  loadingMessage?: string;
  fileCount?: number;
  onSubmit: (selectedSuggestions: Suggestion[]) => void;
  onClear: () => void;
}

export function CodeReviewSuggestions({
  suggestions,
  isLoading,
  loadingMessage,
  fileCount,
  onSubmit,
  onClear,
}: CodeReviewSuggestionsProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(suggestions.map((_, i) => i)) // All selected by default
  );

  const toggleSelection = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const selected = suggestions.filter((_, i) => selectedIndices.has(i));
    if (selected.length > 0) {
      onSubmit(selected);
    }
  };

  const selectAll = () => {
    setSelectedIndices(new Set(suggestions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedIndices(new Set());
  };

  if (isLoading) {
    return (
      <div className="border-t border-border bg-muted/30 px-4 py-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <SpinnerGap weight="bold" className="size-6 animate-spin text-muted-foreground" />
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-sm text-foreground">
              Reviewing code...
            </span>
            {loadingMessage && (
              <span className="font-mono text-xs text-muted-foreground">
                {loadingMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="border-t border-border bg-muted/30 px-4 py-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <Check weight="bold" className="size-6 text-success" />
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-sm text-foreground">
              No issues found
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              Your code looks good!
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="mt-2 h-7 font-mono uppercase tracking-wider text-xs"
          >
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  const selectedCount = selectedIndices.size;
  const allSelected = selectedCount === suggestions.length;

  return (
    <div className="border-t border-border bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <MagnifyingGlass weight="bold" className="size-4 text-muted-foreground" />
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Code Review
          </span>
          <span className="font-mono text-xs text-foreground">
            ({suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={allSelected ? deselectAll : selectAll}
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <button
            onClick={onClear}
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Suggestions list */}
      <div className="max-h-64 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <label
            key={index}
            className={cn(
              "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-b-0",
              selectedIndices.has(index) && "bg-muted/30"
            )}
          >
            <Checkbox
              checked={selectedIndices.has(index)}
              onCheckedChange={() => toggleSelection(index)}
              className="mt-0.5 shrink-0"
            />
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    suggestion.severity === "high"
                      ? "destructive"
                      : suggestion.severity === "medium"
                      ? "secondary"
                      : "outline"
                  }
                  className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0 h-4"
                >
                  {suggestion.severity}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {suggestion.file}
                  {suggestion.lines && `:${suggestion.lines}`}
                </span>
              </div>
              <span className="text-sm text-foreground leading-snug">
                {suggestion.comment}
              </span>
            </div>
          </label>
        ))}
      </div>

      {/* Footer with submit button */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
        <span className="font-mono text-xs text-muted-foreground">
          {selectedCount} selected
        </span>
        <Button
          onClick={handleSubmit}
          disabled={selectedCount === 0}
          size="sm"
          className="h-7 gap-1.5"
        >
          <PaperPlaneTilt weight="bold" className="size-4" />
          <span className="font-mono uppercase tracking-wider text-xs">
            Submit to Chat
          </span>
        </Button>
      </div>
    </div>
  );
}
