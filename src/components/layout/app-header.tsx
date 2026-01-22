"use client";

import Link from "next/link";
import Image from "next/image";
import { PlusIcon, GearIcon, TrashIcon, GitDiffIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ProjectSelector } from "./project-selector";
import { ThemeToggle } from "./theme-toggle";

interface AppHeaderProps {
  currentProjectId?: string;
  currentProjectName?: string;
  featureName?: string;
  onAddIdea: () => void;
  onCreateProject: () => void;
  onOpenSettings?: () => void;
  onOpenCodeReview?: () => void;
  onDeleteFeature?: () => void;
}

export function AppHeader({ currentProjectId, currentProjectName, featureName, onAddIdea, onCreateProject, onOpenSettings, onOpenCodeReview, onDeleteFeature }: AppHeaderProps) {
  return (
    <header className="h-12 border-b border-foreground/20 bg-card px-4 flex items-center justify-between shrink-0">
      {/* Left: Logo + Project Selector + Feature Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image src="/foundry-logo-full.png" alt="Foundry" width={100} height={24} className="h-6 w-auto" />
        </Link>
        <span className="text-foreground/30">|</span>
        <ProjectSelector
          currentProjectId={currentProjectId}
          currentProjectName={currentProjectName}
          onCreateProject={onCreateProject}
        />
        {featureName && (
          <>
            <span className="text-foreground/30">/</span>
            <span className="font-mono text-sm text-foreground/70 truncate max-w-[400px]">
              {featureName}
            </span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {currentProjectId && onOpenCodeReview && (
          <Button variant="ghost" size="icon" onClick={onOpenCodeReview} title="Code Review">
            <GitDiffIcon weight="bold" className="h-4 w-4" />
          </Button>
        )}
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
