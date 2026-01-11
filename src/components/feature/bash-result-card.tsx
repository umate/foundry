"use client";

import { useState } from "react";
import { TerminalIcon, CaretRightIcon, CaretDownIcon } from "@phosphor-icons/react";

interface BashResultCardProps {
  command?: string;
  output: string;
  exitCode?: number;
}

export function BashResultCard({ command, output, exitCode }: BashResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasOutput = output && output.length > 0;
  const displayCommand = command || "Command output";

  return (
    <div className="rounded-md bg-muted border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => hasOutput && setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 w-full text-left ${
          hasOutput ? "cursor-pointer hover:bg-muted-foreground/10" : "cursor-default"
        }`}
        disabled={!hasOutput}
      >
        {hasOutput ? (
          isExpanded ? (
            <CaretDownIcon weight="bold" className="size-3 text-muted-foreground shrink-0" />
          ) : (
            <CaretRightIcon weight="bold" className="size-3 text-muted-foreground shrink-0" />
          )
        ) : (
          <TerminalIcon weight="bold" className="size-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs font-mono text-muted-foreground truncate">{displayCommand}</span>
        {exitCode !== undefined && exitCode !== 0 && (
          <span className="text-xs font-mono text-destructive ml-auto shrink-0">exit {exitCode}</span>
        )}
      </button>
      {isExpanded && hasOutput && (
        <pre className="p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto border-t border-border">
          {output.length > 500 ? output.slice(0, 500) + "..." : output}
        </pre>
      )}
    </div>
  );
}
