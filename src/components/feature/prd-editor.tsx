'use client';

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  tablePlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  ListsToggle,
  UndoRedo,
  linkPlugin,
  linkDialogPlugin,
  diffSourcePlugin,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { forwardRef, useState, useEffect } from 'react';
import { Check, Copy, Robot } from '@phosphor-icons/react';

type ViewMode = 'rich-text' | 'source' | 'diff';

interface ProjectContext {
  name: string;
  description: string | null;
  stack: string | null;
}

interface PRDEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  isLocked?: boolean;
  placeholder?: string;
  saveStatus?: 'idle' | 'saving' | 'saved';
  /** The original content to compare against (for diff mode) */
  diffMarkdown?: string;
  /** Current view mode - defaults to 'rich-text' */
  viewMode?: ViewMode;
  /** Project context for "Copy for Agent" feature */
  projectContext?: ProjectContext;
  /** Feature title for "Copy for Agent" feature */
  featureTitle?: string;
}

export const PRDEditor = forwardRef<MDXEditorMethods, PRDEditorProps>(
  function PRDEditor({
    content,
    onChange,
    isLocked = false,
    placeholder,
    saveStatus = 'idle',
    diffMarkdown,
    viewMode = 'rich-text',
    projectContext,
    featureTitle,
  }, ref) {
    // Avoid hydration mismatch by only rendering the editor on the client
    // (UndoRedo shows platform-specific shortcuts like ⌘Z vs Ctrl+Z)
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedForAgent, setCopiedForAgent] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration mismatch pattern: intentional setState for client-only rendering
    useEffect(() => setMounted(true), []);

    const handleCopyMarkdown = async () => {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyForAgent = async () => {
      const agentPrompt = `# Project Context

**Product**: ${projectContext?.name || 'Unknown'}
**Description**: ${projectContext?.description || 'No description'}
**Tech Stack**: ${projectContext?.stack || 'Not specified'}

---

# Feature: ${featureTitle || 'Untitled Feature'}

${content}

---

# Instructions

We are working on implementing this feature. Please:
1. Review the PRD above carefully
2. Ask any clarifying questions if needed
3. Guide me through the planning process for implementation`;

      await navigator.clipboard.writeText(agentPrompt);
      setCopiedForAgent(true);
      setTimeout(() => setCopiedForAgent(false), 2000);
    };

    if (!mounted) {
      return (
        <div className="relative h-full bg-card">
          <div className="p-4 font-mono text-sm text-muted-foreground">Loading editor...</div>
        </div>
      );
    }

    return (
      <div className={`relative h-full bg-card flex flex-col ${isLocked ? 'pointer-events-none' : ''}`}>
        {isLocked && (
          <div className="absolute inset-0 bg-card/50 z-10 flex items-center justify-center">
            <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground animate-pulse">
              AI is generating...
            </div>
          </div>
        )}
        <MDXEditor
          key={`editor-${viewMode}-${diffMarkdown ? 'diff' : 'no-diff'}`}
          ref={ref}
          markdown={content}
          onChange={onChange}
          placeholder={placeholder || 'PRD will appear here...'}
          readOnly={isLocked}
          contentEditableClassName="prd-editor-content font-serif text-base prose prose-base max-w-none p-4"
          plugins={[
            // Only include diffSourcePlugin when we have diff content to show
            // This ensures the editor properly switches back to rich-text when diff is cleared
            ...(diffMarkdown ? [diffSourcePlugin({
              diffMarkdown: diffMarkdown,
              viewMode: viewMode,
              readOnlyDiff: true,
            })] : []),
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),
            tablePlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <div className="flex items-center gap-3 flex-wrap w-full">
                  <UndoRedo />
                  <div className="w-px h-4 bg-border" />
                  <BlockTypeSelect />
                  <div className="w-px h-4 bg-border" />
                  <BoldItalicUnderlineToggles />
                  <ListsToggle />
                  <div className="w-px h-4 bg-border" />
                  <CreateLink />
                  <InsertTable />
                  <div className="w-px h-4 bg-border" />
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy as Markdown"
                  >
                    {copied ? (
                      <Check className="size-4" weight="bold" />
                    ) : (
                      <Copy className="size-4" weight="bold" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyForAgent}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy for AI Agent"
                  >
                    {copiedForAgent ? (
                      <Check className="size-4" weight="bold" />
                    ) : (
                      <Robot className="size-4" weight="bold" />
                    )}
                  </button>
                  <div className="flex-1" />
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider animate-pulse">
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1">
                      <Check className="size-3" weight="bold" /> Saved
                    </span>
                  )}
                </div>
              ),
            }),
          ]}
        />
      </div>
    );
  }
);
