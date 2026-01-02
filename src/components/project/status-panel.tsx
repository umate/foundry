'use client';

import { GearSix, Lightbulb, Target, Play, CheckCircle } from '@phosphor-icons/react';
import { Feature, FeatureStatus, STATUS_LABELS } from '@/types/feature';
import { CompactFeatureRow } from './compact-feature-row';

interface StatusPanelProps {
  status: FeatureStatus;
  features: Feature[];
  projectId: string;
  onFeatureUpdated: () => void;
}

const getStatusIcon = (status: FeatureStatus) => {
  switch (status) {
    case 'idea':
      return <Lightbulb weight="bold" className="size-4" />;
    case 'scoped':
      return <Target weight="bold" className="size-4" />;
    case 'current':
      return <Play weight="bold" className="size-4" />;
    case 'done':
      return <CheckCircle weight="bold" className="size-4" />;
  }
};

export function StatusPanel({
  status,
  features,
  projectId,
  onFeatureUpdated,
}: StatusPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-card/30">
      {/* Panel Header - Pivotal Tracker style */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-foreground/20 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          {getStatusIcon(status)}
          <span className="font-mono text-xs font-bold uppercase tracking-wider">
            {STATUS_LABELS[status]}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {features.length}
          </span>
        </div>
        <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <GearSix className="size-3.5" />
        </button>
      </div>

      {/* Feature List - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {features.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              No features
            </p>
          </div>
        ) : (
          <div className="divide-y divide-foreground/5">
            {features.map((feature) => (
              <CompactFeatureRow
                key={feature.id}
                feature={feature}
                projectId={projectId}
                onUpdated={onFeatureUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
