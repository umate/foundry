"use client";

import { Button } from "@/components/ui/button";
import { Check, X, GitDiff } from "@phosphor-icons/react";

interface PendingChangeCardProps {
  changeSummary: string;
  onAccept: () => void;
  onReject: () => void;
}

export function PendingChangeCard({ changeSummary, onAccept, onReject }: PendingChangeCardProps) {
  return (
    <div className="rounded-md border-2 border-secondary bg-secondary/10 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <GitDiff weight="bold" className="size-5 text-secondary mt-0.5 shrink-0" />
        <div className="space-y-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-secondary">
            Suggested Edits
          </div>
          <p className="text-sm text-foreground">{changeSummary}</p>
          <p className="text-xs text-muted-foreground">
            Review the changes in the editor, then accept or reject.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onAccept}
          size="sm"
          className="flex-1"
        >
          <Check weight="bold" className="size-4" />
          Accept
        </Button>
        <Button
          onClick={onReject}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <X weight="bold" className="size-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}
