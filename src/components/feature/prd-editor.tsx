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

interface PRDEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  isLocked?: boolean;
  placeholder?: string;
}

export const PRDEditor = forwardRef<MDXEditorMethods, PRDEditorProps>(
  function PRDEditor({ content, onChange, isLocked = false, placeholder }, ref) {
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
      <div className={`relative h-full bg-white ${isLocked ? 'pointer-events-none' : ''}`}>
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
                <div className="flex items-center gap-1 flex-wrap">
                  <UndoRedo />
                  <BlockTypeSelect />
                  <BoldItalicUnderlineToggles />
                  <ListsToggle />
                  <CreateLink />
                  <InsertTable />
                </div>
              ),
            }),
          ]}
        />
      </div>
    );
  }
);
