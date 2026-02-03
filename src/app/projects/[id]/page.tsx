'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { PanelBoard } from '@/components/project/panel-board';
import { AddIdeaDialog } from '@/components/project/add-idea-dialog';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';
import { ProjectSettingsDialog } from '@/components/project/project-settings-dialog';
import { FeatureChatPanel } from '@/components/project/feature-chat-panel';
import { CodeReviewSheet } from '@/components/project/code-review-sheet';
import { BackgroundStreamProvider, useBackgroundStream } from '@/components/project/background-stream-context';
import { DevServerProvider, useOptionalDevServer } from '@/components/project/dev-server-context';
import { DevServerDrawer } from '@/components/project/dev-server-drawer';
import { CommitDialog } from '@/components/feature/commit-dialog';
import { UncommittedChangesDialog } from '@/components/layout/uncommitted-changes-dialog';
import { FeaturesByStatus, Feature, mapDbStatusToUi } from '@/types/feature';
import type { BranchStatus } from '@/components/layout/branch-switcher';
import { toast } from 'sonner';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  stack: string | null;
  repoPath: string | null;
  widgetApiKey: string | null;
  packageManager: string | null;
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

  const handleProjectUpdated = (updated: { id: string; name: string; description: string | null; stack: string | null; repoPath: string | null; widgetApiKey: string | null; packageManager: string | null }) => {
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

  const content = (
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
  );

  return (
    <BackgroundStreamProvider>
      {project.repoPath ? (
        <DevServerProvider projectId={project.id}>
          {content}
        </DevServerProvider>
      ) : (
        content
      )}
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
  handleProjectUpdated: (updated: { id: string; name: string; description: string | null; stack: string | null; repoPath: string | null; widgetApiKey: string | null; packageManager: string | null }) => void;
}) {
  const { setOpenFeaturePanel } = useBackgroundStream();
  const devServer = useOptionalDevServer();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Branch management state
  const [branchStatus, setBranchStatus] = useState<BranchStatus | null>(null);
  const [uncommittedDialogOpen, setUncommittedDialogOpen] = useState(false);
  const [pendingTargetBranch, setPendingTargetBranch] = useState<string | null>(null);
  const [branchCommitDialogOpen, setBranchCommitDialogOpen] = useState(false);
  const [branchDiffSummary, setBranchDiffSummary] = useState<{ files: number; additions: number; deletions: number }>({ files: 0, additions: 0, deletions: 0 });
  const [isPushing, setIsPushing] = useState(false);
  const autoPullAttemptedRef = useRef(false);

  // Register the callback to open feature panel from toast
  useEffect(() => {
    setOpenFeaturePanel(setSelectedFeatureId);
  }, [setOpenFeaturePanel, setSelectedFeatureId]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load branch status on mount and when project changes
  const loadBranchStatus = useCallback(async () => {
    if (!project.repoPath) return;
    try {
      const response = await fetch(`/api/git/status?projectId=${project.id}`);
      if (response.ok) {
        const data = await response.json();
        setBranchStatus(data);
      }
    } catch (error) {
      console.error('Failed to load branch status:', error);
    }
  }, [project.id, project.repoPath]);

  useEffect(() => {
    loadBranchStatus();
  }, [loadBranchStatus]);

  // Refresh branch status when window regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBranchStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadBranchStatus]);

  // Auto-pull when behind remote and tree is clean (one-shot per load)
  useEffect(() => {
    if (!branchStatus || autoPullAttemptedRef.current) return;
    if (
      branchStatus.uncommittedCount === 0 &&
      branchStatus.commitsBehind > 0 &&
      branchStatus.hasRemote
    ) {
      autoPullAttemptedRef.current = true;
      fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })
        .then((response) => {
          if (response.ok) {
            loadBranchStatus();
          }
        })
        .catch(() => {
          // Silent failure — auto-pull is best-effort
        });
    }
  }, [branchStatus, project.id, loadBranchStatus]);

  // Handle push from header button
  const handlePush = useCallback(async () => {
    if (isPushing) return;
    setIsPushing(true);
    try {
      const response = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (response.ok) {
        toast.success('Pushed to remote');
        loadBranchStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to push');
      }
    } catch {
      toast.error('Failed to push');
    } finally {
      setIsPushing(false);
    }
  }, [isPushing, project.id, loadBranchStatus]);

  // Handle "needs commit" from branch switcher (uncommitted changes guard)
  const handleBranchNeedsCommit = useCallback((targetBranch: string) => {
    setPendingTargetBranch(targetBranch);
    setUncommittedDialogOpen(true);
  }, []);

  // Handle "commit first" from the uncommitted changes dialog
  const handleCommitFirst = useCallback(async () => {
    setUncommittedDialogOpen(false);
    // Fetch diff summary for the commit dialog
    try {
      const response = await fetch(`/api/git/diff?projectId=${project.id}`);
      if (response.ok) {
        const data = await response.json();
        setBranchDiffSummary({
          files: data.files?.length ?? 0,
          additions: data.totalAdditions ?? 0,
          deletions: data.totalDeletions ?? 0,
        });
        setBranchCommitDialogOpen(true);
      } else {
        toast.error('Failed to load changes');
      }
    } catch {
      toast.error('Failed to load changes');
    }
  }, [project.id]);

  // Handle after "discard and switch" from the uncommitted changes dialog
  const handleDiscardAndSwitch = useCallback(async () => {
    if (!pendingTargetBranch) return;
    setUncommittedDialogOpen(false);
    try {
      const response = await fetch('/api/git/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, branch: pendingTargetBranch }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Switched to ${data.branch}`);
        loadBranchStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to switch branch');
      }
    } catch {
      toast.error('Failed to switch branch');
    } finally {
      setPendingTargetBranch(null);
    }
  }, [pendingTargetBranch, project.id, loadBranchStatus]);

  // Handle after commit succeeds in the branch commit dialog — auto-checkout pending branch
  const handleBranchCommitSuccess = useCallback(async () => {
    setBranchCommitDialogOpen(false);
    if (pendingTargetBranch) {
      try {
        const response = await fetch('/api/git/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, branch: pendingTargetBranch }),
        });
        if (response.ok) {
          const data = await response.json();
          toast.success(`Committed and switched to ${data.branch}`);
        } else {
          const error = await response.json();
          toast.error(error.error || 'Committed, but failed to switch branch');
        }
      } catch {
        toast.error('Committed, but failed to switch branch');
      } finally {
        setPendingTargetBranch(null);
      }
    }
    loadBranchStatus();
  }, [pendingTargetBranch, project.id, loadBranchStatus]);

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
        repoPath={project.repoPath}
        branchStatus={branchStatus}
        onRefreshBranchStatus={loadBranchStatus}
        onBranchNeedsCommit={handleBranchNeedsCommit}
        onPush={handlePush}
        isPushing={isPushing}
        devServerStatus={devServer?.state.status}
        onStartDevServer={devServer?.start}
        onStopDevServer={devServer?.stop}
        onOpenDevServerLogs={devServer?.openDrawer}
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
        hasRemote={branchStatus?.hasRemote}
        onRefreshStatus={loadBranchStatus}
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

      {/* Branch management dialogs */}
      <UncommittedChangesDialog
        open={uncommittedDialogOpen}
        onOpenChange={setUncommittedDialogOpen}
        targetBranch={pendingTargetBranch || ''}
        projectId={project.id}
        onCommitFirst={handleCommitFirst}
        onDiscardAndSwitch={handleDiscardAndSwitch}
      />

      <CommitDialog
        open={branchCommitDialogOpen}
        onOpenChange={setBranchCommitDialogOpen}
        projectId={project.id}
        diffSummary={branchDiffSummary}
        onSuccess={handleBranchCommitSuccess}
      />

      {/* Dev Server Drawer */}
      {devServer && <DevServerDrawer />}
    </div>
  );
}
