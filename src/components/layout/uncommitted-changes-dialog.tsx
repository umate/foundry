"use client";

import { useState } from "react";
import { WarningCircleIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface UncommittedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetBranch: string;
  projectId: string;
  onCommitFirst: () => void;
  onDiscardAndSwitch: () => void;
}

export function UncommittedChangesDialog({
  open,
  onOpenChange,
  targetBranch,
  projectId,
  onCommitFirst,
  onDiscardAndSwitch,
}: UncommittedChangesDialogProps) {
  const [isDiscarding, setIsDiscarding] = useState(false);

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      const discardResponse = await fetch("/api/git/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!discardResponse.ok) {
        const error = await discardResponse.json();
        throw new Error(error.error || "Failed to discard changes");
      }

      onDiscardAndSwitch();
    } catch {
      // Error handling will be managed by the parent via onDiscardAndSwitch
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono uppercase tracking-wider flex items-center gap-2">
            <WarningCircleIcon weight="bold" className="size-5 text-secondary" />
            Uncommitted Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have uncommitted changes that need to be resolved before
            switching to{" "}
            <span className="font-mono font-semibold text-foreground">
              {targetBranch}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDiscarding}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDiscard}
            disabled={isDiscarding}
          >
            {isDiscarding && (
              <SpinnerGapIcon
                weight="bold"
                className="size-4 animate-spin"
              />
            )}
            Discard Changes
          </Button>
          <Button onClick={onCommitFirst} disabled={isDiscarding}>
            Commit First
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
