'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CaretDown, Plus, FolderSimple, Check } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  currentProjectId?: string;
  currentProjectName?: string;
  onCreateProject: () => void;
}

export function ProjectSelector({
  currentProjectId,
  currentProjectName,
  onCreateProject,
}: ProjectSelectorProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  const handleSelectProject = (projectId: string) => {
    if (projectId !== currentProjectId) {
      router.push(`/projects/${projectId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-3 h-9">
          <FolderSimple weight="bold" className="size-4" />
          <span className="font-mono text-sm max-w-[200px] truncate">
            {currentProjectName || 'Select Project'}
          </span>
          <CaretDown weight="bold" className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {loading ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : projects.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            No projects yet
          </div>
        ) : (
          projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => handleSelectProject(project.id)}
              className="gap-2 cursor-pointer"
            >
              {project.id === currentProjectId ? (
                <Check weight="bold" className="size-4" />
              ) : (
                <span className="size-4" />
              )}
              <span className="font-mono text-sm truncate">{project.name}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onCreateProject}
          className="gap-2 cursor-pointer"
        >
          <Plus weight="bold" className="size-4" />
          <span className="font-mono text-sm">
            New Project
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
