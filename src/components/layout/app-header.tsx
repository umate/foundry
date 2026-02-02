"use client";

import Link from "next/link";
import Image from "next/image";
import { PlusIcon, GearIcon, TrashIcon, MagnifyingGlassIcon, XIcon, CircleIcon, ArrowUpIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ProjectSelector } from "./project-selector";
import { ThemeToggle } from "./theme-toggle";
import { BranchSwitcher, type BranchStatus } from "./branch-switcher";

interface AppHeaderProps {
  currentProjectId?: string;
  currentProjectName?: string;
  featureName?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onAddIdea: () => void;
  onCreateProject: () => void;
  onOpenSettings?: () => void;
  onOpenCodeReview?: () => void;
  onDeleteFeature?: () => void;
  repoPath?: string | null;
  branchStatus?: BranchStatus | null;
  onRefreshBranchStatus?: () => void;
  onBranchNeedsCommit?: (targetBranch: string) => void;
  onPush?: () => void;
  isPushing?: boolean;
}

export function AppHeader({ currentProjectId, currentProjectName, featureName, searchQuery, onSearchChange, onAddIdea, onCreateProject, onOpenSettings, onOpenCodeReview, onDeleteFeature, repoPath, branchStatus, onRefreshBranchStatus, onBranchNeedsCommit, onPush, isPushing }: AppHeaderProps) {
  return (
    <header className="h-12 border-b border-foreground/20 bg-card px-4 flex items-center justify-between shrink-0">
      {/* Left: Logo + Project Selector + Git Controls + Feature Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image src="/foundry-logo-full.png" alt="Foundry" width={100} height={24} className="h-6 w-auto dark:hidden" />
          <Image src="/foundry-logo-inverted.png" alt="Foundry" width={100} height={24} className="h-6 w-auto hidden dark:block" />
        </Link>
        <span className="text-foreground/30">|</span>
        <ProjectSelector
          currentProjectId={currentProjectId}
          currentProjectName={currentProjectName}
          onCreateProject={onCreateProject}
        />
        {currentProjectId && repoPath && branchStatus && onRefreshBranchStatus && onBranchNeedsCommit && (
          <>
            <span className="text-foreground/30">|</span>
            <BranchSwitcher
              projectId={currentProjectId}
              branchStatus={branchStatus}
              onRefreshStatus={onRefreshBranchStatus}
              onNeedsCommit={onBranchNeedsCommit}
            />

            {/* Uncommitted changes indicator */}
            {branchStatus.uncommittedCount > 0 && onOpenCodeReview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenCodeReview}
                className="gap-1.5 h-7 px-2"
                title={`${branchStatus.uncommittedCount} uncommitted change${branchStatus.uncommittedCount !== 1 ? "s" : ""}`}
              >
                <CircleIcon weight="fill" className="size-2 text-secondary" />
                <span className="font-mono text-xs">{branchStatus.uncommittedCount}</span>
              </Button>
            )}

            {/* Push indicator */}
            {branchStatus.commitsAhead > 0 && branchStatus.hasRemote && onPush && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPush}
                disabled={isPushing}
                className="gap-1.5 h-7 px-2"
                title={`Push ${branchStatus.commitsAhead} commit${branchStatus.commitsAhead !== 1 ? "s" : ""}`}
              >
                {isPushing ? (
                  <SpinnerGapIcon weight="bold" className="size-3 animate-spin" />
                ) : (
                  <>
                    <ArrowUpIcon weight="bold" className="size-3" />
                    <span className="font-mono text-xs uppercase tracking-wider">Push</span>
                    <CircleIcon weight="fill" className="size-1.5 text-secondary" />
                    <span className="font-mono text-xs">{branchStatus.commitsAhead}</span>
                  </>
                )}
              </Button>
            )}
          </>
        )}
        {featureName && (
          <>
            <span className="text-foreground/30">/</span>
            <span className="font-mono text-sm text-foreground/70 truncate max-w-[400px]">
              {featureName}
            </span>
          </>
        )}
      </div>

      {/* Center: Search Bar */}
      <div className="flex items-center">
        <div className="relative w-72">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-foreground/40" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full h-8 pl-9 pr-8 bg-muted/50 border border-foreground/15 rounded-md text-sm font-mono placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/30 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-foreground/40 hover:text-foreground/70 transition-colors"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {currentProjectId && onOpenSettings && (
          <Button variant="ghost" size="icon" onClick={onOpenSettings}>
            <GearIcon weight="bold" className="h-4 w-4" />
          </Button>
        )}
        {featureName && onDeleteFeature && (
          <Button variant="ghost" size="icon" onClick={onDeleteFeature} title="Delete feature">
            <TrashIcon weight="bold" className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" onClick={onAddIdea} size="sm">
          <PlusIcon weight="bold" />
          Add Idea
        </Button>
      </div>
    </header>
  );
}
