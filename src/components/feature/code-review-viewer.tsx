"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowsClockwise, WarningCircle, GitDiff, CaretRight, CaretDown, File, MagnifyingGlass } from "@phosphor-icons/react";
import { CommitForm } from "./commit-form";
import { CodeReviewSuggestions, type Suggestion } from "./code-review-suggestions";
import { useBackgroundStream } from "@/components/project/background-stream-context";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription
} from "@/components/ui/empty";

interface FileDiff {
  filename: string;
  additions: number;
  deletions: number;
  chunks: string;
  staged: boolean;
  untracked?: boolean;
}

interface DiffResponse {
  files: FileDiff[];
  totalAdditions: number;
  totalDeletions: number;
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
}

interface CodeReviewViewerProps {
  projectId: string;
  featureId?: string;
  onFeatureCompleted?: () => void;
  hasRemote?: boolean;
  onRefreshStatus?: () => void;
}

function DiffStats({ additions, deletions }: { additions: number; deletions: number }) {
  const total = additions + deletions;
  if (total === 0) return null;

  // Max 5 blocks like GitHub
  const maxBlocks = 5;
  const addBlocks = Math.round((additions / total) * maxBlocks);
  const delBlocks = maxBlocks - addBlocks;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-success font-mono text-xs">+{additions}</span>
      <span className="text-destructive font-mono text-xs">-{deletions}</span>
      <div className="flex gap-px ml-1">
        {Array.from({ length: addBlocks }).map((_, i) => (
          <div key={`add-${i}`} className="w-2 h-2 bg-success rounded-sm" />
        ))}
        {Array.from({ length: delBlocks }).map((_, i) => (
          <div key={`del-${i}`} className="w-2 h-2 bg-destructive rounded-sm" />
        ))}
      </div>
    </div>
  );
}

function FileDiffItem({ file, isExpanded, onToggle }: { file: FileDiff; isExpanded: boolean; onToggle: () => void }) {
  const renderDiffLines = () => {
    const lines = file.chunks.split("\n");
    return (
      <div className="font-mono text-xs border-t border-border">
        {lines.map((line, i) => {
          let className = "px-3 py-0.5 ";

          if (line.startsWith("+") && !line.startsWith("+++")) {
            className += "bg-success/20 text-success";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            className += "bg-destructive/20 text-destructive";
          } else if (line.startsWith("@@")) {
            className += "bg-muted text-muted-foreground";
          } else if (line.startsWith("diff --git")) {
            className += "bg-accent text-accent-foreground font-semibold py-1";
          } else {
            className += "text-foreground/70";
          }

          return (
            <div key={i} className={className}>
              <pre className="whitespace-pre-wrap break-all">{line || " "}</pre>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        {isExpanded ? (
          <CaretDown weight="bold" className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <CaretRight weight="bold" className="size-3 shrink-0 text-muted-foreground" />
        )}
        <File weight="duotone" className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-mono text-xs truncate flex-1 text-left">{file.filename}</span>
        {file.staged && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
            staged
          </span>
        )}
        {file.untracked && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-success bg-success/10 px-1.5 py-0.5 rounded-sm">
            new
          </span>
        )}
        <DiffStats additions={file.additions} deletions={file.deletions} />
      </button>
      {isExpanded && renderDiffLines()}
    </div>
  );
}

export function CodeReviewViewer({ projectId, featureId, onFeatureCompleted, hasRemote, onRefreshStatus }: CodeReviewViewerProps) {
  const [data, setData] = useState<DiffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Code review state
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewLoadingMessage, setReviewLoadingMessage] = useState<string>();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reviewActive, setReviewActive] = useState(false);

  // Background stream for sending to chat
  const { sendMessage } = useBackgroundStream();

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/git/diff?projectId=${projectId}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to fetch diff");
        setData(null);
      } else {
        setData(result);
      }
    } catch {
      setError("Failed to connect to server");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch on mount
  useEffect(() => {
    fetchDiff();
  }, [fetchDiff]);

  const toggleFile = (filename: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  // Start AI code review
  const startCodeReview = useCallback(async () => {
    setReviewLoading(true);
    setReviewActive(true);
    setSuggestions([]);
    setReviewLoadingMessage(`Analyzing ${data?.files.length || 0} file${(data?.files.length || 0) !== 1 ? "s" : ""}...`);

    try {
      const response = await fetch(`/api/git/review?projectId=${projectId}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to run code review");
        setReviewActive(false);
      } else {
        setSuggestions(result.suggestions || []);
      }
    } catch {
      setError("Failed to connect to server");
      setReviewActive(false);
    } finally {
      setReviewLoading(false);
      setReviewLoadingMessage(undefined);
    }
  }, [projectId, data?.files.length]);

  // Clear code review
  const clearReview = useCallback(() => {
    setReviewActive(false);
    setSuggestions([]);
  }, []);

  // Submit selected suggestions to chat
  const handleSubmitSuggestions = useCallback(async (selectedSuggestions: Suggestion[]) => {
    if (!featureId || selectedSuggestions.length === 0) return;

    try {
      // Format the prompt on the backend to decouple frontend from prompt engineering
      const response = await fetch("/api/git/review/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: selectedSuggestions }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to format prompt:", error);
        return;
      }

      const { prompt } = await response.json();

      // Send to chat via background stream
      sendMessage(featureId, { text: prompt }, {
        featureTitle: "Code Review",
      });

      // Clear the review after submitting
      clearReview();
    } catch (error) {
      console.error("Failed to submit code review:", error);
    }
  }, [featureId, sendMessage, clearReview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="font-mono text-sm text-muted-foreground animate-pulse">
          Loading changes...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarningCircle weight="duotone" className="text-destructive" />
            </EmptyMedia>
            <EmptyTitle>Unable to load diff</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div className="flex justify-center mt-4">
          <Button variant="outline" size="sm" onClick={fetchDiff}>
            <ArrowsClockwise weight="bold" className="size-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.files.length === 0) {
    return (
      <div className="p-4">
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitDiff weight="duotone" />
            </EmptyMedia>
            <EmptyTitle>No uncommitted changes</EmptyTitle>
            <EmptyDescription>
              All changes have been committed. Make some edits to see them here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div className="flex justify-center mt-4">
          <Button variant="outline" size="sm" onClick={fetchDiff}>
            <ArrowsClockwise weight="bold" className="size-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {data.files.length} file{data.files.length !== 1 ? "s" : ""} changed
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allExpanded = data.files.every(f => expandedFiles.has(f.filename));
              if (allExpanded) {
                setExpandedFiles(new Set());
              } else {
                setExpandedFiles(new Set(data.files.map(f => f.filename)));
              }
            }}
            className="h-6 px-2 text-xs font-mono"
          >
            {data.files.every(f => expandedFiles.has(f.filename)) ? "Collapse All" : "Expand All"}
          </Button>
          <DiffStats additions={data.totalAdditions} deletions={data.totalDeletions} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={startCodeReview}
            className="h-7 gap-1.5"
            disabled={!data || data.files.length === 0 || reviewLoading}
          >
            <MagnifyingGlass weight="bold" className="size-4" />
            <span className="font-mono uppercase tracking-wider text-xs">Review</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchDiff}
            className="size-7"
            title="Refresh"
          >
            <ArrowsClockwise weight="bold" className="size-4" />
          </Button>
        </div>
      </div>

      {/* Code Review Suggestions */}
      {reviewActive && (
        <CodeReviewSuggestions
          suggestions={suggestions}
          isLoading={reviewLoading}
          loadingMessage={reviewLoadingMessage}
          fileCount={data.files.length}
          onSubmit={handleSubmitSuggestions}
          onClear={clearReview}
        />
      )}

      {/* File list */}
      <div className="flex-1 overflow-auto">
        {data.files.map((file) => (
          <FileDiffItem
            key={`${file.filename}-${file.staged}`}
            file={file}
            isExpanded={expandedFiles.has(file.filename)}
            onToggle={() => toggleFile(file.filename)}
          />
        ))}
      </div>

      {/* Inline commit form */}
      {data && data.files.length > 0 && (
        <CommitForm
          projectId={projectId}
          featureId={featureId}
          diffSummary={{
            files: data.files.length,
            additions: data.totalAdditions,
            deletions: data.totalDeletions,
          }}
          onSuccess={() => {
            onRefreshStatus?.();
          }}
          onFeatureCompleted={onFeatureCompleted}
          onPushSuccess={onRefreshStatus}
          hasRemote={hasRemote}
        />
      )}
    </div>
  );
}
