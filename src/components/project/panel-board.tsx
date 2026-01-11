'use client';

import { FeaturesByStatus, STATUS_ORDER } from '@/types/feature';
import { StatusPanel } from './status-panel';
import { DragProvider } from './drag-context';
import { TrashDropZone } from './trash-drop-zone';

interface PanelBoardProps {
  features: FeaturesByStatus;
  onFeatureUpdated: () => void;
  onFeatureClick: (featureId: string) => void;
}

export function PanelBoard({
  features,
  onFeatureUpdated,
  onFeatureClick,
}: PanelBoardProps) {
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
              features={features[status]}
              onFeatureUpdated={onFeatureUpdated}
              onFeatureClick={onFeatureClick}
            />
          </div>
        ))}
      </div>
      <TrashDropZone onArchive={handleArchive} />
    </DragProvider>
  );
}
