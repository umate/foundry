'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';
import { Button } from '@/components/ui/button';

export default function NewProjectPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleSuccess = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Simple header for context */}
      <header className="h-12 border-b border-foreground/20 bg-card px-4 flex items-center shrink-0">
        <span className="font-mono text-base font-bold uppercase tracking-wider">
          Foundry
        </span>
      </header>

      {/* Centered content area with dialog */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-mono text-2xl font-bold uppercase tracking-wider mb-2">
            Welcome to Foundry
          </h1>
          <p className="text-muted-foreground mb-4">
            Create your first project to get started
          </p>
          <Button onClick={() => setOpen(true)}>
            <PlusIcon weight="bold" className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <CreateProjectDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
