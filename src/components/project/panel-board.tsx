'use client';

import { Feature, FeaturesByStatus, STATUS_ORDER } from '@/types/feature';
import { StatusPanel } from './status-panel';
import { DragProvider } from './drag-context';
import { TrashDropZone } from './trash-drop-zone';

interface PanelBoardProps {
  features: FeaturesByStatus;
  searchQuery?: string;
  onFeatureUpdated: () => void;
  onFeatureClick: (featureId: string) => void;
  onAddIdea?: () => void;
}

function matchesSearch(feature: Feature, query: string): boolean {
  const q = query.toLowerCase();
  return (
    feature.title.toLowerCase().includes(q) ||
    (feature.description?.toLowerCase().includes(q) ?? false) ||
    (feature.summary?.toLowerCase().includes(q) ?? false)
  );
}

export function PanelBoard({
  features,
  searchQuery,
  onFeatureUpdated,
  onFeatureClick,
  onAddIdea,
}: PanelBoardProps) {
  const filteredFeatures = searchQuery
    ? {
        idea: features.idea.filter((f) => matchesSearch(f, searchQuery)),
        scoped: features.scoped.filter((f) => matchesSearch(f, searchQuery)),
        current: features.current.filter((f) => matchesSearch(f, searchQuery)),
        done: features.done.filter((f) => matchesSearch(f, searchQuery)),
      }
    : features;

  const handleArchive = async (featureId: string) => {
    await fetch(`/api/features/${featureId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });
    onFeatureUpdated();
  };

  return (
    <DragProvider>
      <div className="flex-1 flex overflow-hidden">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="flex-1 min-w-0 border-r border-foreground/5 last:border-r-0">
            <StatusPanel
              status={status}
              features={filteredFeatures[status]}
              onFeatureUpdated={onFeatureUpdated}
              onFeatureClick={onFeatureClick}
              onAddIdea={status === 'idea' ? onAddIdea : undefined}
            />
          </div>
        ))}
      </div>
      <TrashDropZone onArchive={handleArchive} />
    </DragProvider>
  );
}
