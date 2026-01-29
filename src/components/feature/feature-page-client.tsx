'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpecEditor } from './spec-editor';
import { WireframeViewer } from './wireframe-viewer';
import { FeatureChat } from './feature-chat';
import { AppHeader } from '@/components/layout/app-header';
import { AddIdeaDialog } from '@/components/project/add-idea-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EraserIcon } from '@phosphor-icons/react';
import { ModeProvider, useMode } from '@/components/providers/mode-provider';
import { ModeSwitch } from '@/components/feature/mode-switch';
import type { Feature, FeatureMessage, Project } from '@/db/schema';
import type { MDXEditorMethods } from '@mdxeditor/editor';

interface FeaturePageClientProps {
  feature: Feature;
  project: Project;
  initialMessages?: FeatureMessage[];
}

// Small component that reads from ModeContext — must be rendered inside ModeProvider
function FeaturePageModeToggle() {
  const { mode, setMode } = useMode();
  return <ModeSwitch mode={mode} onModeChange={setMode} />;
}

export function FeaturePageClient({ feature, project, initialMessages = [] }: FeaturePageClientProps) {
  const router = useRouter();
  const editorRef = useRef<MDXEditorMethods>(null);

  const [currentTitle, setCurrentTitle] = useState(feature.title);
  const [specContent, setSpecContent] = useState(feature.specMarkdown || '');
  const [wireframeContent, setWireframeContent] = useState(feature.wireframe || '');
  const [activeTab, setActiveTab] = useState<'spec' | 'wireframe'>('spec');
  const [isLocked, setIsLocked] = useState(!feature.specMarkdown);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSpecDialog, setShowDeleteSpecDialog] = useState(false);
  const [isDeletingSpec, setIsDeletingSpec] = useState(false);

  // Diff mode state
  const [proposedMarkdown, setProposedMarkdown] = useState<string | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState<string | null>(null);

  // Session reset state - used to remount FeatureChat with fresh state
  const [messagesKey, setMessagesKey] = useState(0);
  const [currentMessages, setCurrentMessages] = useState(initialMessages);
  const [currentInitialIdea, setCurrentInitialIdea] = useState(feature.initialIdea);

  // Handle initial spec generation from chat (markdown)
  const handleSpecGenerated = useCallback((markdown: string) => {
    setSpecContent(markdown);
    setIsLocked(false);
    setHasUnsavedChanges(true);

    // Update editor content
    if (editorRef.current) {
      editorRef.current.setMarkdown(markdown);
    }
  }, []);

  // Handle wireframe generation from chat
  const handleWireframeGenerated = useCallback(async (wireframe: string) => {
    setWireframeContent(wireframe);
    setActiveTab('wireframe');

    // Save wireframe to API
    try {
      await fetch(`/api/features/${feature.id}/wireframe`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wireframe }),
      });
    } catch (error) {
      console.error('Failed to save wireframe:', error);
    }
  }, [feature.id]);

  // Handle pending change from updateSpec tool
  const handlePendingChange = useCallback((proposed: string) => {
    setOriginalMarkdown(specContent);
    setProposedMarkdown(proposed);
  }, [specContent]);

  // Handle accepting the proposed change
  const handleAcceptChange = useCallback(() => {
    if (proposedMarkdown) {
      setSpecContent(proposedMarkdown);
      setHasUnsavedChanges(true);
      // Don't call setMarkdown - the key change will remount the editor with new content
    }
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
  }, [proposedMarkdown]);

  // Handle rejecting the proposed change
  const handleRejectChange = useCallback(() => {
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
  }, []);

  // Handle session reset - clears messages and remounts chat
  const handleSessionReset = useCallback(() => {
    setCurrentMessages([]);
    setMessagesKey(prev => prev + 1);
    setCurrentInitialIdea(null); // Clear initialIdea to prevent re-triggering
    // Also clear any pending changes
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
  }, []);

  // Handle feature deletion
  const handleDeleteFeature = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/features/${feature.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push(`/projects/${project.id}`);
      }
    } catch (error) {
      console.error('Failed to delete feature:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [feature.id, project.id, router]);

  // Handle spec deletion (clears specMarkdown and wireframe)
  const handleDeleteSpec = useCallback(async () => {
    setIsDeletingSpec(true);
    try {
      const response = await fetch(`/api/features/${feature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specMarkdown: null, wireframe: null }),
      });

      if (response.ok) {
        // Clear local state
        setSpecContent('');
        setWireframeContent('');
        setIsLocked(true);
        setActiveTab('spec');
        // Clear any pending changes
        setProposedMarkdown(null);
        setOriginalMarkdown(null);
      }
    } catch (error) {
      console.error('Failed to delete spec:', error);
    } finally {
      setIsDeletingSpec(false);
      setShowDeleteSpecDialog(false);
    }
  }, [feature.id]);

  // Handle editor content changes
  const handleContentChange = useCallback((markdown: string) => {
    setSpecContent(markdown);
    setHasUnsavedChanges(true);
  }, []);

  // Save spec to API
  const handleSave = useCallback(async () => {
    if (!specContent.trim()) return;

    setSaveStatus('saving');
    try {
      const response = await fetch(`/api/features/${feature.id}/spec`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specMarkdown: specContent }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
      }
    } catch (error) {
      console.error('Failed to save spec:', error);
      setSaveStatus('idle');
    }
  }, [feature.id, specContent]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges || isLocked) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [specContent, hasUnsavedChanges, isLocked, handleSave]);

  // Generate AI title on first view
  useEffect(() => {
    if (!feature.initialIdea) return;

    fetch(`/api/features/${feature.id}/generate-title`, { method: 'POST' })
      .then(res => res.json())
      .then(data => data.title && setCurrentTitle(data.title))
      .catch(() => {}); // Silent failure
  }, [feature.id, feature.initialIdea]);

  return (
    <div className="h-screen bg-[#E5E1D8] flex flex-col overflow-hidden">
      <AppHeader
        currentProjectId={project.id}
        currentProjectName={project.name}
        featureName={currentTitle || 'New Feature'}
        onAddIdea={() => setAddIdeaOpen(true)}
        onCreateProject={() => router.push('/projects/new')}
        onDeleteFeature={() => setShowDeleteDialog(true)}
      />

      {/* Main Content - Split Layout */}
      <main className="flex-1 flex min-h-0">
        {/* Left Panel - Editor (60%) */}
        <div className="w-[60%] border-r border-border bg-card flex flex-col overflow-hidden">
          {/* Only show tabs if wireframe exists */}
          {wireframeContent ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'spec' | 'wireframe')} className="flex flex-col h-full gap-0">
              <div className="border-b border-border px-4 py-2 flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="spec">Spec</TabsTrigger>
                  <TabsTrigger value="wireframe">Wireframe</TabsTrigger>
                </TabsList>
                {specContent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteSpecDialog(true)}
                    className="size-8 text-muted-foreground hover:text-destructive"
                    title="Clear spec"
                  >
                    <EraserIcon weight="bold" className="size-4" />
                  </Button>
                )}
              </div>
              <TabsContent value="spec" className="flex-1 overflow-y-auto m-0">
                <SpecEditor
                  ref={editorRef}
                  content={proposedMarkdown ?? specContent}
                  onChange={handleContentChange}
                  isLocked={isLocked}
                  placeholder="The AI will generate a spec here based on your conversation..."
                  saveStatus={saveStatus}
                  diffMarkdown={originalMarkdown ?? undefined}
                  viewMode={proposedMarkdown ? 'diff' : 'rich-text'}
                  projectContext={{
                    name: project.name,
                    description: project.description,
                    stack: project.stack,
                  }}
                  featureTitle={feature.title}
                />
              </TabsContent>
              <TabsContent value="wireframe" className="flex-1 overflow-y-auto m-0">
                <WireframeViewer wireframe={wireframeContent} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col h-full">
              {/* Header with delete button when spec exists */}
              {specContent && (
                <div className="border-b border-border px-4 py-2 flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold uppercase tracking-wider">Spec</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteSpecDialog(true)}
                    className="size-8 text-muted-foreground hover:text-destructive"
                    title="Clear spec"
                  >
                    <EraserIcon weight="bold" className="size-4" />
                  </Button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto">
                <SpecEditor
                  ref={editorRef}
                  content={proposedMarkdown ?? specContent}
                  onChange={handleContentChange}
                  isLocked={isLocked}
                  placeholder="The AI will generate a spec here based on your conversation..."
                  saveStatus={saveStatus}
                  diffMarkdown={originalMarkdown ?? undefined}
                  viewMode={proposedMarkdown ? 'diff' : 'rich-text'}
                  projectContext={{
                    name: project.name,
                    description: project.description,
                    stack: project.stack,
                  }}
                  featureTitle={feature.title}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Chat (40%) */}
        <ModeProvider featureId={feature.id}>
          <div className="w-[40%] bg-card flex flex-col">
            {/* Chat header with mode toggle */}
            <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between">
              <span className="font-mono text-sm font-semibold uppercase tracking-wider">Chat</span>
              <FeaturePageModeToggle />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <FeatureChat
                key={messagesKey}
                projectId={project.id}
                featureId={feature.id}
                initialIdea={currentInitialIdea || undefined}
                initialMessages={currentMessages}
                onSpecGenerated={handleSpecGenerated}
                onPendingChange={handlePendingChange}
                onAcceptChange={handleAcceptChange}
                onRejectChange={handleRejectChange}
                onWireframeGenerated={handleWireframeGenerated}
                onSessionReset={handleSessionReset}
                currentSpecMarkdown={specContent}
                hasPendingChange={proposedMarkdown !== null}
                hasSavedSpec={!!feature.specMarkdown}
              />
            </div>
          </div>
        </ModeProvider>
      </main>

      <AddIdeaDialog
        open={addIdeaOpen}
        onOpenChange={setAddIdeaOpen}
        projectId={project.id}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this feature and all associated chat messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isDeleting}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDeleteFeature} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteSpecDialog} onOpenChange={setShowDeleteSpecDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Specification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the spec and wireframe for this feature. Your chat history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isDeletingSpec}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDeleteSpec} disabled={isDeletingSpec}>
                {isDeletingSpec ? 'Clearing...' : 'Clear'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
