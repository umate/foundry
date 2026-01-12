'use client';

import { useState, useRef } from 'react';
import { GearSix, Lightbulb, Target, Play, CheckCircle } from '@phosphor-icons/react';
import { Feature, FeatureStatus, STATUS_LABELS } from '@/types/feature';
import { FeatureCard } from './feature-card';

interface StatusPanelProps {
  status: FeatureStatus;
  features: Feature[];
  onFeatureUpdated: () => void;
  onFeatureClick: (featureId: string) => void;
}

interface DropIndicator {
  index: number;
  position: 'before' | 'after';
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

// Calculate new sortOrder based on position between features
// Uses midpoint strategy with large gaps (1000) for insertions
function calculateNewSortOrder(
  features: Feature[],
  targetIndex: number,
  position: 'before' | 'after',
  draggedFeatureId: string
): number {
  // Filter out the dragged feature from calculations
  const otherFeatures = features.filter(f => f.id !== draggedFeatureId);

  // Adjust target index since we removed the dragged feature
  const adjustedIndex = position === 'before' ? targetIndex : targetIndex + 1;
  const insertIndex = Math.min(adjustedIndex, otherFeatures.length);

  const prevFeature = otherFeatures[insertIndex - 1];
  const nextFeature = otherFeatures[insertIndex];

  const prevOrder = prevFeature?.sortOrder ?? 0;
  const nextOrder = nextFeature?.sortOrder ?? (prevOrder + 2000);

  // If inserting at top, go higher than current max
  if (insertIndex === 0) {
    const maxOrder = otherFeatures[0]?.sortOrder ?? 0;
    return maxOrder + 1000;
  }

  // If inserting at bottom
  if (insertIndex >= otherFeatures.length) {
    const minOrder = otherFeatures[otherFeatures.length - 1]?.sortOrder ?? 1000;
    return Math.max(0, minOrder - 1000);
  }

  // Insert between two features - use midpoint
  return Math.floor((prevOrder + nextOrder) / 2);
}

export function StatusPanel({
  status,
  features,
  onFeatureUpdated,
  onFeatureClick,
}: StatusPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDropIndicator(null);
    }
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const cardElement = cardRefs.current.get(index);
    if (!cardElement) return;

    const rect = cardElement.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';

    setDropIndicator({ index, position });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDropIndicator(null);

    const featureId = e.dataTransfer.getData('featureId');
    const sourceStatus = e.dataTransfer.getData('sourceStatus');

    // Cross-column move: update status (sortOrder auto-set by API)
    if (sourceStatus !== status) {
      await fetch(`/api/features/${featureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onFeatureUpdated();
      return;
    }

    // Same-column reorder: update sortOrder
    if (dropIndicator) {
      const newSortOrder = calculateNewSortOrder(
        features,
        dropIndicator.index,
        dropIndicator.position,
        featureId
      );

      await fetch(`/api/features/${featureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: newSortOrder }),
      });
      onFeatureUpdated();
    }
  };

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(index, el);
    } else {
      cardRefs.current.delete(index);
    }
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
            {features.map((feature, index) => (
              <div key={feature.id} className="relative">
                {/* Drop indicator line - before */}
                {dropIndicator?.index === index && dropIndicator?.position === 'before' && (
                  <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-full z-10 shadow-sm shadow-primary/50" />
                )}
                <div
                  ref={setCardRef(index)}
                  onDragOver={(e) => handleCardDragOver(e, index)}
                >
                  <FeatureCard
                    feature={feature}
                    onFeatureClick={onFeatureClick}
                  />
                </div>
                {/* Drop indicator line - after */}
                {dropIndicator?.index === index && dropIndicator?.position === 'after' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full z-10 shadow-sm shadow-primary/50" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
