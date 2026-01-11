"use client";

import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollapsibleSideBarProps {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  hasContent: boolean;
  children: React.ReactNode;
  expandedWidth?: string;
}

export function CollapsibleSideBar({
  label,
  isExpanded,
  onToggle,
  hasContent,
  children,
  expandedWidth = "w-[calc(100vw-600px)] max-w-[50vw]"
}: CollapsibleSideBarProps) {
  if (!hasContent) return null;

  if (isExpanded) {
    return (
      <div className={cn("bg-card border-r border-border flex flex-col", expandedWidth)}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">{label}</h2>
          <Button variant="ghost" size="icon" onClick={onToggle} className="size-8">
            <X weight="bold" className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className="w-10 bg-muted border-r border-border flex items-center justify-center cursor-pointer hover:bg-muted/80 shrink-0"
    >
      <span className="font-mono text-xs uppercase tracking-wider [writing-mode:vertical-rl] rotate-180">
        {label}
      </span>
    </button>
  );
}
