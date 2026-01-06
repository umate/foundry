'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash, PencilSimple } from '@phosphor-icons/react/dist/ssr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EditFeatureDialog } from './edit-feature-dialog';

interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'scoped' | 'current' | 'done';
  priority: number;
  requestCount: number;
}

interface FeatureCardProps {
  feature: Feature;
  projectId: string;
  onUpdated: () => void;
}

export function FeatureCard({ feature, projectId, onUpdated }: FeatureCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this feature?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/features/${feature.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdated();
      }
    } catch (error) {
      console.error('Failed to delete feature:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setEditOpen(false);
    onUpdated();
  };

  const handleCardClick = () => {
    router.push(`/projects/${projectId}/features/${feature.id}`);
  };

  return (
    <>
      <Card
        className="p-4 hover:border-[#E85102]/50 transition-colors cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-mono font-bold text-foreground uppercase tracking-wider mb-1">
              {feature.title}
            </h3>
            {feature.description && (
              <p className="text-sm text-foreground/70 mb-2">{feature.description}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              {feature.requestCount > 0 && (
                <Badge variant="secondary">
                  {feature.requestCount} request{feature.requestCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setEditOpen(true);
              }}
            >
              <PencilSimple weight="bold" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={deleting}
            >
              <Trash weight="bold" />
            </Button>
          </div>
        </div>
      </Card>

      <EditFeatureDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        feature={feature}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
