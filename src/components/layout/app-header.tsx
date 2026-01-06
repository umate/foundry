"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ProjectSelector } from "./project-selector";
import { ThemeToggle } from "./theme-toggle";

interface AppHeaderProps {
  currentProjectId?: string;
  currentProjectName?: string;
  featureName?: string;
  onAddIdea: () => void;
  onCreateProject: () => void;
}

export function AppHeader({ currentProjectId, currentProjectName, featureName, onAddIdea, onCreateProject }: AppHeaderProps) {
  return (
    <header className="h-12 border-b border-foreground/20 bg-card px-4 flex items-center justify-between shrink-0">
      {/* Left: Logo + Project Selector + Feature Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-base font-bold uppercase tracking-wider">Foundry</span>
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
        <Button variant="outline" onClick={onAddIdea} size="sm">
          <PlusIcon weight="bold" />
          Add Idea
        </Button>
      </div>
    </header>
  );
}
