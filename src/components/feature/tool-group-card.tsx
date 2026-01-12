"use client";

import { useState } from "react";
import {
  WrenchIcon,
  CaretRightIcon,
  CaretDownIcon,
  MagnifyingGlassIcon,
  FileIcon,
  FloppyDiskIcon,
  PencilIcon,
  TerminalIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import type { MessagePart } from "@/lib/hooks/use-claude-code-chat";
import { BashResultCard } from "./bash-result-card";

// Tool part types that can be grouped
type ToolPart = Extract<
  MessagePart,
  | { type: "tool-use" }
  | { type: "file-search-result" }
  | { type: "file-read-result" }
  | { type: "file-write-result" }
  | { type: "file-edit-result" }
  | { type: "bash-result" }
  | { type: "activity" }
>;

interface ToolGroupCardProps {
  parts: ToolPart[];
}

function getToolIcon(part: ToolPart) {
  switch (part.type) {
    case "file-search-result":
      return <MagnifyingGlassIcon weight="bold" className="size-3 shrink-0" />;
    case "file-read-result":
      return <FileIcon weight="bold" className="size-3 shrink-0" />;
    case "file-write-result":
      return <FloppyDiskIcon weight="bold" className="size-3 shrink-0" />;
    case "file-edit-result":
      return <PencilIcon weight="bold" className="size-3 shrink-0" />;
    case "bash-result":
      return <TerminalIcon weight="bold" className="size-3 shrink-0" />;
    case "activity":
      return <CircleNotchIcon weight="bold" className="size-3 shrink-0 animate-spin" />;
    case "tool-use":
      return <WrenchIcon weight="bold" className="size-3 shrink-0" />;
    default:
      return <WrenchIcon weight="bold" className="size-3 shrink-0" />;
  }
}

function getToolLabel(part: ToolPart): string {
  switch (part.type) {
    case "file-search-result":
      return `Found ${part.count} file${part.count !== 1 ? "s" : ""}`;
    case "file-read-result":
      return `Read: ${part.path}`;
    case "file-write-result":
      return `Wrote: ${part.path}`;
    case "file-edit-result":
      return `Edited: ${part.path}`;
    case "bash-result":
      return part.command || "Command";
    case "activity":
      return part.message;
    case "tool-use":
      return part.name;
    default:
      return "Tool";
  }
}

function getToolSummary(parts: ToolPart[]): string {
  const typeNames: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    let name = "";
    switch (part.type) {
      case "file-search-result":
        name = "Search";
        break;
      case "file-read-result":
        name = "Read";
        break;
      case "file-write-result":
        name = "Write";
        break;
      case "file-edit-result":
        name = "Edit";
        break;
      case "bash-result":
        name = "Bash";
        break;
      case "activity":
        name = "Activity";
        break;
      case "tool-use":
        name = part.name;
        break;
    }
    if (name && !seen.has(name)) {
      seen.add(name);
      typeNames.push(name);
    }
  }

  return typeNames.slice(0, 3).join(", ") + (typeNames.length > 3 ? "..." : "");
}

function ToolPartDisplay({ part }: { part: ToolPart }) {
  if (part.type === "bash-result") {
    return (
      <BashResultCard
        command={part.command}
        output={part.output}
        exitCode={part.exitCode}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono py-0.5">
      {getToolIcon(part)}
      <span className="truncate">{getToolLabel(part)}</span>
    </div>
  );
}

export function ToolGroupCard({ parts }: ToolGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (parts.length === 0) return null;

  const summary = getToolSummary(parts);

  return (
    <div className="rounded-md bg-muted/50 border border-border/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 w-full text-left cursor-pointer hover:bg-muted-foreground/10"
      >
        {isExpanded ? (
          <CaretDownIcon weight="bold" className="size-3 text-muted-foreground shrink-0" />
        ) : (
          <CaretRightIcon weight="bold" className="size-3 text-muted-foreground shrink-0" />
        )}
        <WrenchIcon weight="bold" className="size-3 text-muted-foreground shrink-0" />
        <span className="text-xs font-mono text-muted-foreground">
          {parts.length} tool{parts.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs font-mono text-muted-foreground/60 truncate">
          {summary}
        </span>
      </button>
      {isExpanded && (
        <div className="px-3 pb-2 space-y-1 border-t border-border/50">
          {parts.map((part, idx) => (
            <ToolPartDisplay key={idx} part={part} />
          ))}
        </div>
      )}
    </div>
  );
}
