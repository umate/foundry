'use client';

import { useState, useEffect } from 'react';
import { CopyIcon, ArrowsClockwiseIcon, FolderIcon } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FolderPickerDialog } from '@/components/ui/folder-picker-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectBase {
  id: string;
  name: string;
  description: string | null;
  stack: string | null;
  repoPath: string | null;
  widgetApiKey: string | null;
  packageManager: string | null;
}

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectBase;
  onUpdate: (project: ProjectBase) => void;
}

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
  onUpdate,
}: ProjectSettingsDialogProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [stack, setStack] = useState(project.stack || '');
  const [repoPath, setRepoPath] = useState(project.repoPath || '');
  const [packageManager, setPackageManager] = useState(project.packageManager || '');
  const [apiKey, setApiKey] = useState(project.widgetApiKey || '');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState<'key' | 'embed' | 'agent' | null>(null);
  const [error, setError] = useState('');
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description || '');
    setStack(project.stack || '');
    setRepoPath(project.repoPath || '');
    setPackageManager(project.packageManager || '');
    setApiKey(project.widgetApiKey || '');
  }, [project]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          stack: stack.trim() || null,
          repoPath: repoPath.trim() || null,
          packageManager: packageManager || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to update project');

      const updated = await response.json();
      onUpdate(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    setRegenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateApiKey: true }),
      });

      if (!response.ok) throw new Error('Failed to regenerate key');

      const updated = await response.json();
      setApiKey(updated.widgetApiKey || '');
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'embed' | 'agent') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const embedCode = apiKey
    ? `<script>
window.FOUNDRY_API_KEY = "${apiKey}";
</script>
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/foundry-widget.js"></script>`
    : '';

  const agentInstructions = apiKey
    ? `# Widget Integration Task

## Project: ${project.name}

## Widget Embed Code
Add this to your HTML:

\`\`\`html
${embedCode}
\`\`\`

## Instructions
Help me integrate this feedback widget into my project. The widget:
- Collects user feedback with element selection
- Sends data to ${typeof window !== 'undefined' ? window.location.origin : ''}/api/widget/submit
- Can be customized with these window variables:
  - FOUNDRY_POSITION: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  - FOUNDRY_COLOR: hex color for the button (default: '#52525b')

Please:
1. Identify the best place to add the embed code
2. Suggest any customization based on the project's design
3. Help test the integration works correctly`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider">
            Project Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="widget" className="flex-1">Widget</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium font-mono uppercase tracking-wider">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium font-mono uppercase tracking-wider">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium font-mono uppercase tracking-wider">
                Tech Stack
              </label>
              <Input
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                placeholder="Next.js, React, TypeScript, etc."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium font-mono uppercase tracking-wider">
                Codebase Path
              </label>
              <div className="flex gap-2">
                <Input
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  placeholder="/path/to/project"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFolderPickerOpen(true)}
                  type="button"
                >
                  <FolderIcon weight="bold" className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Local path to project repository for AI codebase analysis
              </p>
            </div>

            <FolderPickerDialog
              open={folderPickerOpen}
              onOpenChange={setFolderPickerOpen}
              value={repoPath}
              onSelect={setRepoPath}
            />

            {/* Dev Server Section */}
            {repoPath && (
              <div className="space-y-2 pt-2 border-t border-foreground/10">
                <label className="text-sm font-medium font-mono uppercase tracking-wider">
                  Dev Server
                </label>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Package Manager
                  </label>
                  <Select
                    value={packageManager || 'auto'}
                    onValueChange={(value) => setPackageManager(value === 'auto' ? '' : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="bun">bun</SelectItem>
                      <SelectItem value="npm">npm</SelectItem>
                      <SelectItem value="yarn">yarn</SelectItem>
                      <SelectItem value="pnpm">pnpm</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Override the detected package manager for the dev server
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={loading || !name.trim()}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          {/* Widget Tab */}
          <TabsContent value="widget" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Embed a feedback widget on your site to collect user ideas.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium font-mono uppercase tracking-wider">
                API Key
              </label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono truncate">
                  {apiKey || 'No key generated'}
                </code>
                {apiKey && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiKey, 'key')}
                  >
                    <CopyIcon weight="bold" className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRegenerateKey}
                  disabled={regenerating}
                >
                  <ArrowsClockwiseIcon
                    weight="bold"
                    className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>
              {copied === 'key' && (
                <p className="text-xs text-green-600">Copied!</p>
              )}
            </div>

            {apiKey && (
              <div className="space-y-2">
                <label className="text-sm font-medium font-mono uppercase tracking-wider">
                  Embed Code
                </label>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                    {embedCode}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(embedCode, 'embed')}
                  >
                    <CopyIcon weight="bold" className="h-3 w-3 mr-1" />
                    {copied === 'embed' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}

            {apiKey && (
              <div className="space-y-2">
                <label className="text-sm font-medium font-mono uppercase tracking-wider">
                  AI Coding Setup
                </label>
                <p className="text-xs text-muted-foreground">
                  Copy this prompt to your AI coding tool (Claude Code, Cursor, etc.)
                </p>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap max-h-48">
                    {agentInstructions}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(agentInstructions, 'agent')}
                  >
                    <CopyIcon weight="bold" className="h-3 w-3 mr-1" />
                    {copied === 'agent' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
