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
}

export function CodeReviewSheet({
  open,
  onOpenChange,
  projectId,
}: CodeReviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="font-mono uppercase tracking-wider">
            Code Review
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto">
          <CodeReviewViewer projectId={projectId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
