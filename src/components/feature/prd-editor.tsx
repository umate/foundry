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
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { forwardRef, useState, useEffect } from 'react';
import { Check } from '@phosphor-icons/react';

interface PRDEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  isLocked?: boolean;
  placeholder?: string;
  saveStatus?: 'idle' | 'saving' | 'saved';
}

export const PRDEditor = forwardRef<MDXEditorMethods, PRDEditorProps>(
  function PRDEditor({ content, onChange, isLocked = false, placeholder, saveStatus = 'idle' }, ref) {
    // Avoid hydration mismatch by only rendering the editor on the client
    // (UndoRedo shows platform-specific shortcuts like ⌘Z vs Ctrl+Z)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) {
      return (
        <div className="relative h-full bg-white">
          <div className="p-4 font-mono text-sm text-muted-foreground">Loading editor...</div>
        </div>
      );
    }

    return (
      <div className={`relative h-full bg-white flex flex-col ${isLocked ? 'pointer-events-none' : ''}`}>
        {isLocked && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground animate-pulse">
              AI is generating...
            </div>
          </div>
        )}
        <MDXEditor
          ref={ref}
          markdown={content}
          onChange={onChange}
          placeholder={placeholder || 'PRD will appear here...'}
          readOnly={isLocked}
          contentEditableClassName="prd-editor-content font-mono text-sm prose prose-sm max-w-none p-4"
          plugins={[
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
