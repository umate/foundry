'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lightbulb } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureList } from '@/components/project/feature-list';
import { AddIdeaDialog } from '@/components/project/add-idea-dialog';

interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'scoped' | 'ready' | 'done';
  priority: number;
  requestCount: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  stack: string | null;
  features: {
    idea: Feature[];
    scoped: Feature[];
    ready: Feature[];
    done: Feature[];
  };
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else if (response.status === 404) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const handleIdeaAdded = () => {
    setAddIdeaOpen(false);
    loadProject();
  };

  const handleFeatureUpdated = () => {
    loadProject();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E1D8] flex items-center justify-center">
        <p className="font-mono text-black/60">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const totalFeatures = Object.values(project.features).flat().length;

  return (
    <div className="min-h-screen bg-[#E5E1D8] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mb-4"
          >
            <ArrowLeft weight="bold" className="mr-2" />
            Back to Projects
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-mono text-4xl font-bold text-black uppercase tracking-wider mb-2">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-lg text-black/70 mb-2">{project.description}</p>
              )}
              {project.stack && (
                <p className="text-sm text-black/60">Tech stack: {project.stack}</p>
              )}
              <div className="mt-2">
                <Badge variant="outline">{totalFeatures} features</Badge>
              </div>
            </div>

            <Button onClick={() => setAddIdeaOpen(true)}>
              <Lightbulb weight="bold" className="mr-2" />
              Add Idea
            </Button>
          </div>
        </div>

        <FeatureList
          features={project.features}
          projectId={project.id}
          onFeatureUpdated={handleFeatureUpdated}
        />
      </div>

      <AddIdeaDialog
        open={addIdeaOpen}
        onOpenChange={setAddIdeaOpen}
        projectId={project.id}
        onSuccess={handleIdeaAdded}
      />
    </div>
  );
}
