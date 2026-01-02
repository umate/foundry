'use client';

import { FeaturesByStatus, STATUS_ORDER, FeatureStatus, Feature } from '@/types/feature';
import { StatusPanel } from './status-panel';

interface PanelBoardProps {
  features: FeaturesByStatus;
  projectId: string;
  onFeatureUpdated: () => void;
}

export function PanelBoard({
  features,
  projectId,
  onFeatureUpdated,
}: PanelBoardProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {STATUS_ORDER.map((status) => (
        <div key={status} className="flex-1 min-w-0 border-r border-foreground/5 last:border-r-0">
          <StatusPanel
            status={status}
            features={features[status]}
            projectId={projectId}
            onFeatureUpdated={onFeatureUpdated}
          />
        </div>
      ))}
    </div>
  );
}
