"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CodeReviewViewer } from "@/components/feature/code-review-viewer";

interface CodeReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  hasRemote?: boolean;
  onRefreshStatus?: () => void;
}

export function CodeReviewSheet({
  open,
  onOpenChange,
  projectId,
  hasRemote,
  onRefreshStatus,
}: CodeReviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="font-mono uppercase tracking-wider">
            Changes
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto flex flex-col">
          <CodeReviewViewer
            projectId={projectId}
            hasRemote={hasRemote}
            onRefreshStatus={onRefreshStatus}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
