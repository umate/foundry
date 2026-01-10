'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderIcon, ArrowLeftIcon, HouseIcon } from '@phosphor-icons/react';

interface FolderPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onSelect: (path: string) => void;
}

interface DirectoryEntry {
  name: string;
  path: string;
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryEntry[];
}

export function FolderPickerDialog({
  open,
  onOpenChange,
  value,
  onSelect,
}: FolderPickerDialogProps) {
  const [currentPath, setCurrentPath] = useState(value || '');
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualPath, setManualPath] = useState('');

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/filesystem/browse?path=${encodeURIComponent(path)}`);
      if (!response.ok) throw new Error('Failed to load directory');

      const data: BrowseResponse = await response.json();
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setDirectories(data.directories);
      setManualPath(data.currentPath);
    } catch (err) {
      setError('Could not access directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadDirectory(value || '');
    }
  }, [open, value, loadDirectory]);

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  const handleGoHome = () => {
    loadDirectory('');
  };

  const handleManualNavigate = () => {
    if (manualPath.trim()) {
      loadDirectory(manualPath.trim());
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-mono uppercase tracking-wider">
            Select Folder
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 px-4 overflow-hidden">
          {/* Manual path input */}
          <div className="flex gap-2">
            <Input
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="/path/to/folder"
              className="font-mono text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleManualNavigate()}
            />
            <Button variant="outline" size="sm" onClick={handleManualNavigate}>
              Go
            </Button>
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoHome}
              className="gap-1"
            >
              <HouseIcon weight="bold" className="h-4 w-4" />
              Home
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoUp}
              disabled={!parentPath}
              className="gap-1"
            >
              <ArrowLeftIcon weight="bold" className="h-4 w-4" />
              Up
            </Button>
          </div>

          {/* Current path display */}
          <div className="bg-muted rounded-md p-2">
            <p className="font-mono text-sm text-muted-foreground truncate">
              {currentPath}
            </p>
          </div>

          {/* Directory listing */}
          <div className="border rounded-md flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground font-mono">Loading...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-red-500 font-mono">{error}</p>
              </div>
            ) : directories.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground font-mono">No subfolders</p>
              </div>
            ) : (
              <div className="divide-y">
                {directories.map((dir) => (
                  <button
                    key={dir.path}
                    onClick={() => handleNavigate(dir.path)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted transition-colors text-left min-w-0"
                  >
                    <FolderIcon weight="fill" className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="font-mono text-sm truncate">{dir.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect}>
            Select This Folder
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
