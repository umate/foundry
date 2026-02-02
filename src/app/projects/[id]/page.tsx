'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { PanelBoard } from '@/components/project/panel-board';
import { AddIdeaDialog } from '@/components/project/add-idea-dialog';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';
import { ProjectSettingsDialog } from '@/components/project/project-settings-dialog';
import { FeatureChatPanel } from '@/components/project/feature-chat-panel';
import { CodeReviewSheet } from '@/components/project/code-review-sheet';
import { BackgroundStreamProvider, useBackgroundStream } from '@/components/project/background-stream-context';
import { FeaturesByStatus, Feature, mapDbStatusToUi } from '@/types/feature';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  stack: string | null;
  repoPath: string | null;
  widgetApiKey: string | null;
  features: {
    idea: Feature[];
    scoped: Feature[];
    current: Feature[];
    done: Feature[];
  };
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codeReviewOpen, setCodeReviewOpen] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Auto-open panel from URL query param
  useEffect(() => {
    const featureParam = searchParams.get('feature');
    if (featureParam) {
      setSelectedFeatureId(featureParam);
    }
  }, [searchParams]);

  const loadProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        // Map feature statuses from DB to UI format
        const mappedFeatures: FeaturesByStatus = {
          idea: data.features.idea.map((f: Feature) => ({
            ...f,
            status: mapDbStatusToUi(f.status as 'idea' | 'scoped' | 'ready' | 'done'),
          })),
          scoped: data.features.scoped.map((f: Feature) => ({
            ...f,
            status: mapDbStatusToUi(f.status as 'idea' | 'scoped' | 'ready' | 'done'),
          })),
          current: data.features.current.map((f: Feature) => ({
            ...f,
            status: mapDbStatusToUi(f.status as 'idea' | 'scoped' | 'ready' | 'done'),
          })),
          done: data.features.done.map((f: Feature) => ({
            ...f,
            status: mapDbStatusToUi(f.status as 'idea' | 'scoped' | 'ready' | 'done'),
          })),
        };
        setProject({ ...data, features: mappedFeatures });
      } else if (response.status === 404) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleIdeaAdded = () => {
    setAddIdeaOpen(false);
    loadProject();
  };

  const handleFeatureUpdated = () => {
    loadProject();
  };

  const handleFeatureClick = (featureId: string) => {
    setSelectedFeatureId(featureId);
  };

  const handlePanelClose = () => {
    setSelectedFeatureId(null);
    // Clear URL param when closing panel
    if (searchParams.get('feature')) {
      router.replace(`/projects/${id}`);
    }
  };

  const handleProjectCreated = (newProjectId: string) => {
    setCreateProjectOpen(false);
    router.push(`/projects/${newProjectId}`);
  };

  const handleProjectUpdated = (updated: { id: string; name: string; description: string | null; stack: string | null; repoPath: string | null; widgetApiKey: string | null }) => {
    setProject(prev => prev ? { ...prev, ...updated } : prev);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <AppHeader
          onAddIdea={() => {}}
          onCreateProject={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <BackgroundStreamProvider>
      <ProjectPageContent
        project={project}
        selectedFeatureId={selectedFeatureId}
        setSelectedFeatureId={setSelectedFeatureId}
        addIdeaOpen={addIdeaOpen}
        setAddIdeaOpen={setAddIdeaOpen}
        createProjectOpen={createProjectOpen}
        setCreateProjectOpen={setCreateProjectOpen}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        codeReviewOpen={codeReviewOpen}
        setCodeReviewOpen={setCodeReviewOpen}
        handleIdeaAdded={handleIdeaAdded}
        handleFeatureUpdated={handleFeatureUpdated}
        handleFeatureClick={handleFeatureClick}
        handlePanelClose={handlePanelClose}
        handleProjectCreated={handleProjectCreated}
        handleProjectUpdated={handleProjectUpdated}
      />
    </BackgroundStreamProvider>
  );
}

// Inner component that can use the background stream context
function ProjectPageContent({
  project,
  selectedFeatureId,
  setSelectedFeatureId,
  addIdeaOpen,
  setAddIdeaOpen,
  createProjectOpen,
  setCreateProjectOpen,
  settingsOpen,
  setSettingsOpen,
  codeReviewOpen,
  setCodeReviewOpen,
  handleIdeaAdded,
  handleFeatureUpdated,
  handleFeatureClick,
  handlePanelClose,
  handleProjectCreated,
  handleProjectUpdated,
}: {
  project: ProjectData;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  addIdeaOpen: boolean;
  setAddIdeaOpen: (open: boolean) => void;
  createProjectOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  codeReviewOpen: boolean;
  setCodeReviewOpen: (open: boolean) => void;
  handleIdeaAdded: () => void;
  handleFeatureUpdated: () => void;
  handleFeatureClick: (featureId: string) => void;
  handlePanelClose: () => void;
  handleProjectCreated: (newProjectId: string) => void;
  handleProjectUpdated: (updated: { id: string; name: string; description: string | null; stack: string | null; repoPath: string | null; widgetApiKey: string | null }) => void;
}) {
  const { setOpenFeaturePanel } = useBackgroundStream();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Register the callback to open feature panel from toast
  useEffect(() => {
    setOpenFeaturePanel(setSelectedFeatureId);
  }, [setOpenFeaturePanel, setSelectedFeatureId]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader
        currentProjectId={project.id}
        currentProjectName={project.name}
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        onAddIdea={() => setAddIdeaOpen(true)}
        onCreateProject={() => setCreateProjectOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCodeReview={() => setCodeReviewOpen(true)}
      />

      <PanelBoard
        features={project.features}
        searchQuery={searchQuery}
        onFeatureUpdated={handleFeatureUpdated}
        onFeatureClick={handleFeatureClick}
        onAddIdea={() => setAddIdeaOpen(true)}
      />

      <AddIdeaDialog
        open={addIdeaOpen}
        onOpenChange={setAddIdeaOpen}
        projectId={project.id}
        onSuccess={handleIdeaAdded}
        onFeatureCreated={setSelectedFeatureId}
      />

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={handleProjectCreated}
      />

      <ProjectSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        project={project}
        onUpdate={handleProjectUpdated}
      />

      <CodeReviewSheet
        open={codeReviewOpen}
        onOpenChange={setCodeReviewOpen}
        projectId={project.id}
      />

      <FeatureChatPanel
        featureId={selectedFeatureId}
        projectId={project.id}
        project={{
          name: project.name,
          description: project.description,
          stack: project.stack,
        }}
        onClose={handlePanelClose}
        onFeatureUpdated={handleFeatureUpdated}
      />
    </div>
  );
}
