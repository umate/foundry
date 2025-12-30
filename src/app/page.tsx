'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';

interface Project {
  id: string;
  name: string;
  description: string | null;
  featureCounts: {
    idea: number;
    scoped: number;
    ready: number;
    done: number;
  };
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadProjects = async () => {
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
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleProjectCreated = () => {
    setCreateDialogOpen(false);
    loadProjects();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E1D8] flex items-center justify-center">
        <p className="font-mono text-black/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E1D8] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-mono text-4xl font-bold text-black uppercase tracking-wider">
            Foundry
          </h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus weight="bold" className="mr-2" />
            New Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="font-mono text-black/60 mb-4">No projects yet</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus weight="bold" className="mr-2" />
              Create Your First Project
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const totalFeatures = Object.values(project.featureCounts).reduce((a, b) => a + b, 0);

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="p-6 hover:border-[#E85102] transition-colors cursor-pointer h-full">
                    <h3 className="font-mono text-xl font-bold text-black mb-2 uppercase tracking-wider">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-black/70 mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap mt-auto">
                      {project.featureCounts.idea > 0 && (
                        <Badge variant="secondary">
                          {project.featureCounts.idea} IDEA
                        </Badge>
                      )}
                      {project.featureCounts.scoped > 0 && (
                        <Badge variant="secondary">
                          {project.featureCounts.scoped} SCOPED
                        </Badge>
                      )}
                      {project.featureCounts.ready > 0 && (
                        <Badge variant="default">
                          {project.featureCounts.ready} READY
                        </Badge>
                      )}
                      {project.featureCounts.done > 0 && (
                        <Badge variant="outline">
                          {project.featureCounts.done} DONE
                        </Badge>
                      )}
                      {totalFeatures === 0 && (
                        <Badge variant="outline">NO FEATURES</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}
