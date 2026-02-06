"use client";

import Link from "next/link";
import Image from "next/image";
import {
  GearIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XIcon,
  CircleIcon,
  ArrowUpIcon,
  SpinnerGapIcon,
  GitDiffIcon,
  PlayIcon,
  TerminalIcon
} from "@phosphor-icons/react";
import type { DevServerStatus } from "@/lib/dev-server-manager";
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
  onAddIdea?: () => void;
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
  // Dev server props
  devServerStatus?: DevServerStatus;
  onStartDevServer?: () => void;
  onStopDevServer?: () => void;
  onOpenDevServerLogs?: () => void;
}

export function AppHeader({
  currentProjectId,
  currentProjectName,
  featureName,
  searchQuery,
  onSearchChange,
  onAddIdea,
  onCreateProject,
  onOpenSettings,
  onOpenCodeReview,
  onDeleteFeature,
  repoPath,
  branchStatus,
  onRefreshBranchStatus,
  onBranchNeedsCommit,
  onPush,
  isPushing,
  devServerStatus,
  onStartDevServer,
  onStopDevServer,
  onOpenDevServerLogs
}: AppHeaderProps) {
  return (
    <header className="h-12 border-b border-foreground/20 bg-card px-4 flex items-center justify-between shrink-0">
      {/* Left: Logo + Project Selector + Git Controls + Feature Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image
            src="/foundry-logo-full.png"
            alt="Foundry"
            width={100}
            height={24}
            className="h-6 w-auto dark:hidden"
          />
          <Image
            src="/foundry-logo-inverted.png"
            alt="Foundry"
            width={100}
            height={24}
            className="h-6 w-auto hidden dark:block"
          />
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

            {/* Push indicator */}
            {branchStatus.commitsAhead > 0 && branchStatus.hasRemote && onPush && (
              <>
                <span className="text-foreground/30">|</span>
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
                      <ArrowUpIcon weight="bold" className="size-4 text-secondary/75" />
                      <span className="font-mono text-xs uppercase tracking-wider">Push</span>
                      <span className="font-mono text-[10px] py-0.25 px-1.25 rounded-full bg-secondary/80 text-secondary-foreground ml-1">
                        {branchStatus.commitsAhead}
                      </span>
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Uncommitted changes indicator */}
            {onOpenCodeReview && (
              <>
                <span className="text-foreground/30">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenCodeReview}
                  className="gap-1.5 h-7 px-2"
                  title={
                    branchStatus.uncommittedCount > 0
                      ? `${branchStatus.uncommittedCount} uncommitted change${
                          branchStatus.uncommittedCount !== 1 ? "s" : ""
                        }`
                      : "View code changes"
                  }
                >
                  <GitDiffIcon weight="bold" className="size-4 text-secondary/75" />
                  {branchStatus.uncommittedCount > 0 && (
                    <>
                      <span className="font-mono text-xs uppercase tracking-wider">Changes</span>
                      <span className="font-mono text-[10px] py-0.25 px-1.25 rounded-full bg-secondary/80 text-secondary-foreground ml-1">
                        {branchStatus.uncommittedCount}
                      </span>
                    </>
                  )}
                </Button>
              </>
            )}
          </>
        )}
        {featureName && (
          <>
            <span className="text-foreground/30">/</span>
            <span className="font-mono text-sm text-foreground/70 truncate max-w-[400px]">{featureName}</span>
          </>
        )}
      </div>

      {/* Center: Search Bar */}
      {/* <div className="flex items-center">
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
      </div> */}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Dev Server Controls */}
        {currentProjectId && repoPath && (
          <>
            {/* Start/Stop Server Button */}
            {devServerStatus === "running" || devServerStatus === "starting" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStopDevServer}
                className="gap-1.5 h-7 px-2"
                title="Stop development server"
              >
                <CircleIcon
                  weight="fill"
                  className={`size-2 ${
                    devServerStatus === "running"
                      ? "text-green-500 animate-pulse-slow"
                      : "text-yellow-500 animate-pulse"
                  }`}
                />
                <span className="font-mono text-xs uppercase tracking-wider">
                  {devServerStatus === "starting" ? "Starting..." : "Server"}
                </span>
              </Button>
            ) : devServerStatus === "error" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartDevServer}
                className="gap-1.5 h-7 px-2"
                title="Restart development server"
              >
                <CircleIcon weight="fill" className="size-2 text-red-500" />
                <span className="font-mono text-xs uppercase tracking-wider">Error</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartDevServer}
                className="gap-1.5 h-7 px-2"
                title="Start development server"
              >
                <PlayIcon weight="bold" className="size-3.5" />
                <span className="font-mono text-xs uppercase tracking-wider">Start Server</span>
              </Button>
            )}

            {/* Terminal/Console Button - always visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenDevServerLogs}
              className="h-7 w-7"
              title="View server console"
            >
              <TerminalIcon weight="bold" className="size-4" />
            </Button>
          </>
        )}
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
      </div>
    </header>
  );
}
