'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpecEditor } from './spec-editor';
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
import { Button } from '@/components/ui/button';
import type { Feature, FeatureMessage, Project } from '@/db/schema';
import type { MDXEditorMethods } from '@mdxeditor/editor';

interface FeaturePageClientProps {
  feature: Feature;
  project: Project;
  initialMessages?: FeatureMessage[];
}

export function FeaturePageClient({ feature, project, initialMessages = [] }: FeaturePageClientProps) {
  const router = useRouter();
  const editorRef = useRef<MDXEditorMethods>(null);

  const [currentTitle, setCurrentTitle] = useState(feature.title);
  const [specContent, setSpecContent] = useState(feature.specMarkdown || '');
  const [isLocked, setIsLocked] = useState(!feature.specMarkdown);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        <div className="w-[60%] border-r border-border bg-card overflow-y-auto">
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

        {/* Right Panel - Chat (40%) */}
        <div className="w-[40%] bg-card flex flex-col">
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
            onSessionReset={handleSessionReset}
            currentSpecMarkdown={specContent}
            hasPendingChange={proposedMarkdown !== null}
            hasSavedSpec={!!feature.specMarkdown}
          />
        </div>
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
    </div>
  );
}
