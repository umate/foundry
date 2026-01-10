"use client";

import Link from "next/link";
import { PlusIcon, GearIcon, TrashIcon } from "@phosphor-icons/react";
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
  onDeleteFeature?: () => void;
}

export function AppHeader({ currentProjectId, currentProjectName, featureName, onAddIdea, onCreateProject, onOpenSettings, onDeleteFeature }: AppHeaderProps) {
  return (
    <header className="h-12 border-b border-foreground/20 bg-card px-4 flex items-center justify-between shrink-0">
      {/* Left: Logo + Project Selector + Feature Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="font-mono text-base font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">Foundry</Link>
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
