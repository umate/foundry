'use client';

import { useState } from 'react';
import { FolderIcon } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FolderPickerDialog } from '@/components/ui/folder-picker-dialog';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (projectId: string) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          repoPath: repoPath.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const project = await response.json();

      // If description is empty and repoPath is set, try to extract from README
      if (!description.trim() && repoPath.trim()) {
        try {
          await fetch(`/api/projects/${project.id}/extract-description`, {
            method: 'POST',
          });
        } catch {
          // Silently ignore - description extraction is optional
        }
      }

      // Reset form
      setName('');
      setDescription('');
      setRepoPath('');
      onSuccess(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider">
            New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project to organize your features and ideas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium font-mono uppercase tracking-wider">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              required
              maxLength={200}
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
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium font-mono uppercase tracking-wider">
              Working Directory
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
              Local path to project repository
            </p>
          </div>

          <FolderPickerDialog
            open={folderPickerOpen}
            onOpenChange={setFolderPickerOpen}
            value={repoPath}
            onSelect={setRepoPath}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
