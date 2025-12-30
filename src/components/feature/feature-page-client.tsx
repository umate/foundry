'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PRDEditor } from './prd-editor';
import { FeatureChat } from './feature-chat';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { prdToMarkdown } from '@/lib/prd-markdown';
import type { MiniPRD } from '@/lib/ai/agents/idea-agent';
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

  const [prdContent, setPrdContent] = useState(feature.prdMarkdown || '');
  const [isLocked, setIsLocked] = useState(!feature.prdMarkdown);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Handle PRD generation from chat
  const handlePRDGenerated = useCallback((prd: MiniPRD) => {
    const markdown = prdToMarkdown(prd);
    setPrdContent(markdown);
    setIsLocked(false);
    setHasUnsavedChanges(true);

    // Update editor content
    if (editorRef.current) {
      editorRef.current.setMarkdown(markdown);
    }
  }, []);

  // Handle editor content changes
  const handleContentChange = useCallback((markdown: string) => {
    setPrdContent(markdown);
    setHasUnsavedChanges(true);
  }, []);

  // Save PRD to API
  const handleSave = useCallback(async () => {
    if (!prdContent.trim()) return;

    setSaveStatus('saving');
    try {
      const response = await fetch(`/api/features/${feature.id}/prd`, {
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
  }, [feature.id, prdContent]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges || isLocked) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [prdContent, hasUnsavedChanges, isLocked, handleSave]);

  return (
    <div className="h-screen bg-[#E5E1D8] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <ArrowLeft weight="bold" />
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{project.name}</span>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-mono text-sm font-bold uppercase tracking-wider">
              {feature.title || 'New Feature'}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <main className="flex-1 flex min-h-0">
        {/* Left Panel - Editor (60%) */}
        <div className="w-[60%] border-r border-border bg-white overflow-y-auto">
          <PRDEditor
            ref={editorRef}
            content={prdContent}
            onChange={handleContentChange}
            isLocked={isLocked}
            placeholder="The AI will generate a PRD here based on your conversation..."
            saveStatus={saveStatus}
          />
        </div>

        {/* Right Panel - Chat (40%) */}
        <div className="w-[40%] bg-white flex flex-col">
          <FeatureChat
            projectId={project.id}
            featureId={feature.id}
            initialIdea={feature.initialIdea || undefined}
            initialMessages={initialMessages}
            onPRDGenerated={handlePRDGenerated}
            hasSavedPrd={!!feature.prdMarkdown}
          />
        </div>
      </main>
    </div>
  );
}
