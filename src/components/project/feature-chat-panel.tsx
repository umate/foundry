'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, ListChecks, Trash, X } from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureChat } from '@/components/feature/feature-chat';
import { SubtaskList } from './subtask-list';
import { PRDEditor } from '@/components/feature/prd-editor';
import { FeatureStatus, STATUS_LABELS, SubTask } from '@/types/feature';
import type { FeatureMessage } from '@/db/schema';
import type { MDXEditorMethods } from '@mdxeditor/editor';

interface FeatureChatPanelProps {
  featureId: string | null;
  projectId: string;
  project: {
    name: string;
    description: string | null;
    stack: string | null;
  };
  onClose: () => void;
  onFeatureUpdated: () => void;
}

interface FeatureData {
  id: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  prdMarkdown: string | null;
  initialIdea: string | null;
  subtasks: SubTask[];
}

export function FeatureChatPanel({
  featureId,
  projectId,
  project,
  onClose,
  onFeatureUpdated,
}: FeatureChatPanelProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [feature, setFeature] = useState<FeatureData | null>(null);
  const [messages, setMessages] = useState<FeatureMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [specOpen, setSpecOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);

  // PRD state
  const [prdContent, setPrdContent] = useState('');
  const [proposedMarkdown, setProposedMarkdown] = useState<string | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Session reset key
  const [messagesKey, setMessagesKey] = useState(0);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOpen = featureId !== null;

  // Handle escape key - close spec first, then panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (specOpen) {
          setSpecOpen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, specOpen, onClose]);

  // Load feature data when featureId changes
  useEffect(() => {
    if (!featureId) {
      setFeature(null);
      setMessages([]);
      setLoading(false);
      setSpecOpen(false);
      return;
    }

    const loadFeature = async () => {
      setLoading(true);
      try {
        // Load feature data
        const featureRes = await fetch(`/api/features/${featureId}`);
        if (featureRes.ok) {
          const featureData = await featureRes.json();
          setFeature({
            id: featureData.id,
            title: featureData.title,
            description: featureData.description,
            status: featureData.status === 'ready' ? 'current' : featureData.status,
            prdMarkdown: featureData.prdMarkdown,
            initialIdea: featureData.initialIdea,
            subtasks: featureData.subtasks || [],
          });
          setPrdContent(featureData.prdMarkdown || '');
        }

        // Load messages
        const messagesRes = await fetch(`/api/features/${featureId}/messages`);
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(messagesData.messages || []);
        }
      } catch (error) {
        console.error('Failed to load feature:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeature();
  }, [featureId]);

  // Handle PRD generation from chat
  const handlePRDGenerated = useCallback((markdown: string) => {
    setPrdContent(markdown);
    setHasUnsavedChanges(true);
    if (editorRef.current) {
      editorRef.current.setMarkdown(markdown);
    }
  }, []);

  // Handle pending change from updatePRD tool
  const handlePendingChange = useCallback((proposed: string) => {
    setOriginalMarkdown(prdContent);
    setProposedMarkdown(proposed);
  }, [prdContent]);

  // Handle accepting the proposed change
  const handleAcceptChange = useCallback(() => {
    if (proposedMarkdown) {
      setPrdContent(proposedMarkdown);
      setHasUnsavedChanges(true);
    }
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
  }, [proposedMarkdown]);

  // Handle rejecting the proposed change
  const handleRejectChange = useCallback(() => {
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
  }, []);

  // Handle session reset
  const handleSessionReset = useCallback(() => {
    setMessages([]);
    setMessagesKey(prev => prev + 1);
    setProposedMarkdown(null);
    setOriginalMarkdown(null);
  }, []);

  // Handle feature deletion (archive)
  const handleDeleteFeature = useCallback(async () => {
    if (!featureId) return;

    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      if (response.ok) {
        setShowDeleteDialog(false);
        onClose();
        onFeatureUpdated();
      }
    } catch (error) {
      console.error('Failed to archive feature:', error);
    }
  }, [featureId, onClose, onFeatureUpdated]);

  // Save PRD
  const savePrd = useCallback(async () => {
    if (!featureId || !prdContent.trim()) return;

    setSaveStatus('saving');
    try {
      const response = await fetch(`/api/features/${featureId}/prd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdMarkdown: prdContent }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
      }
    } catch (error) {
      console.error('Failed to save PRD:', error);
      setSaveStatus('idle');
    }
  }, [featureId, prdContent]);

  // Auto-save PRD
  useEffect(() => {
    if (!hasUnsavedChanges || !feature?.prdMarkdown) return;

    const timer = setTimeout(() => {
      savePrd();
    }, 2000);

    return () => clearTimeout(timer);
  }, [prdContent, hasUnsavedChanges, savePrd, feature?.prdMarkdown]);

  // Handle spec content change
  const handleSpecChange = useCallback((markdown: string) => {
    setPrdContent(markdown);
    setHasUnsavedChanges(true);
  }, []);

  // Handle subtasks update
  const handleSubtasksChange = useCallback(async (subtasks: SubTask[]) => {
    if (!featureId) return;

    // Optimistic update
    setFeature(prev => prev ? { ...prev, subtasks } : null);

    try {
      await fetch(`/api/features/${featureId}/subtasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks }),
      });
      onFeatureUpdated();
    } catch (error) {
      console.error('Failed to update subtasks:', error);
    }
  }, [featureId, onFeatureUpdated]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget) {
      if (specOpen) {
        setSpecOpen(false);
      } else {
        onClose();
      }
    }
  };

  const hasPrd = !!feature?.prdMarkdown || !!prdContent;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Single shared backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={handleBackdropClick}
      />

      {/* Panel container - positioned on right */}
      <div className="absolute inset-y-0 right-0 flex">
        {/* Spec Panel - Left side (only when open) */}
        {specOpen && (
          <div className="w-[calc(100vw-600px)] max-w-[50vw] bg-card border-r border-border flex flex-col animate-in slide-in-from-left duration-300">
            {/* Spec Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
                Spec
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSpecOpen(false)}
                className="size-8"
              >
                <X weight="bold" className="size-4" />
              </Button>
            </div>

            {/* Spec Editor */}
            <div className="flex-1 overflow-hidden">
              <PRDEditor
                ref={editorRef}
                content={proposedMarkdown ?? prdContent}
                onChange={handleSpecChange}
                saveStatus={saveStatus}
                diffMarkdown={originalMarkdown ?? undefined}
                viewMode={originalMarkdown ? 'diff' : 'rich-text'}
                projectContext={project}
                featureTitle={feature?.title}
              />
            </div>
          </div>
        )}

        {/* Chat Panel - Right side (always visible when panel is open) */}
        <div
          className={`bg-background border-l border-border flex flex-col animate-in slide-in-from-right duration-300 ${
            specOpen ? 'w-[600px]' : 'w-full sm:w-[600px]'
          }`}
        >
          {loading ? (
            <div className="flex flex-col h-full">
              {/* Skeleton Header */}
              <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </div>
              {/* Skeleton Chat Area */}
              <div className="flex-1 p-4 space-y-4">
                <div className="flex gap-3">
                  <Skeleton className="size-8 rounded-sm shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="space-y-2 flex-1 max-w-[80%]">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2 ml-auto" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="size-8 rounded-sm shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
              {/* Skeleton Footer */}
              <div className="border-t border-border p-3 shrink-0">
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </div>
            </div>
          ) : feature ? (
            <>
              {/* Header */}
              <div className="px-4 py-2 border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h2 className="text-base font-sans truncate">
                      {feature.title}
                    </h2>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {STATUS_LABELS[feature.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                      className="size-8"
                      title="Tasks"
                    >
                      <ListChecks weight="bold" className="size-4" />
                    </Button>
                    <Button
                      variant={specOpen ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setSpecOpen(!specOpen)}
                      disabled={!hasPrd && !prdContent}
                      className="size-8"
                      title={specOpen ? 'Hide Spec' : hasPrd ? 'View Spec' : 'No Spec Yet'}
                    >
                      <FileText weight="bold" className="size-4" />
                    </Button>
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          title="Delete feature"
                        >
                          <Trash weight="bold" className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Feature?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will archive &ldquo;{feature.title}&rdquo; and remove it from your project. You can restore it later from archived features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel asChild>
                            <Button variant="outline">Cancel</Button>
                          </AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <Button variant="destructive" onClick={handleDeleteFeature}>
                              Delete
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="size-8"
                    >
                      <X weight="bold" className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <FeatureChat
                  key={messagesKey}
                  projectId={projectId}
                  featureId={feature.id}
                  featureTitle={feature.title}
                  initialIdea={feature.initialIdea || undefined}
                  initialMessages={messages}
                  onPRDGenerated={handlePRDGenerated}
                  onPendingChange={handlePendingChange}
                  onAcceptChange={handleAcceptChange}
                  onRejectChange={handleRejectChange}
                  onSessionReset={handleSessionReset}
                  currentPrdMarkdown={prdContent}
                  hasPendingChange={proposedMarkdown !== null}
                  hasSavedPrd={!!feature.prdMarkdown}
                />
              </div>

              {/* Subtasks Panel (expandable) */}
              {subtasksExpanded && (
                <div className="border-t border-border p-3 shrink-0">
                  <SubtaskList
                    subtasks={feature.subtasks}
                    onSubtasksChange={handleSubtasksChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-end px-4 py-3 border-b border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="size-8"
                >
                  <X weight="bold" className="size-4" />
                </Button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <p className="font-mono text-sm text-muted-foreground">Feature not found</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
