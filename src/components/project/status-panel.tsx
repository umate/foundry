'use client';

import { useState } from 'react';
import { GearSix, Lightbulb, Target, Play, CheckCircle } from '@phosphor-icons/react';
import { Feature, FeatureStatus, STATUS_LABELS } from '@/types/feature';
import { FeatureCard } from './feature-card';

interface StatusPanelProps {
  status: FeatureStatus;
  features: Feature[];
  onFeatureUpdated: () => void;
  onFeatureClick: (featureId: string) => void;
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
  onFeatureUpdated,
  onFeatureClick,
}: StatusPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const featureId = e.dataTransfer.getData('featureId');
    const sourceStatus = e.dataTransfer.getData('sourceStatus');

    if (sourceStatus === status) return; // Same column, no change

    await fetch(`/api/features/${featureId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    onFeatureUpdated();
  };

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

      {/* Feature List - scrollable drop zone */}
      <div
        className={`flex-1 overflow-y-auto transition-colors ${isDragOver ? 'bg-secondary/10' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {features.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              No features
            </p>
          </div>
        ) : (
          <div>
            {features.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onFeatureClick={onFeatureClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
