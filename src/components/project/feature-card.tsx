'use client';

import { Lightbulb, Play, CheckCircle, Target } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Feature, FeatureStatus } from '@/types/feature';
import { useDrag } from './drag-context';
import { useBackgroundStream } from './background-stream-context';
import { SubtaskProgress } from './subtask-progress';
import { StreamIndicator } from './stream-indicator';

interface FeatureCardProps {
  feature: Feature;
  onFeatureClick: (featureId: string) => void;
}

const getFeatureIcon = (status: FeatureStatus) => {
  switch (status) {
    case 'idea':
      return <Lightbulb className="size-4 text-secondary shrink-0" />;
    case 'scoped':
      return <Target className="size-4 text-secondary shrink-0" />;
    case 'current':
      return <Play className="size-4 text-secondary shrink-0" />;
    case 'done':
      return <CheckCircle className="size-4 text-secondary shrink-0" />;
  }
};

export function FeatureCard({
  feature,
  onFeatureClick,
}: FeatureCardProps) {
  const { setIsDragging, setDraggedFeatureId } = useDrag();
  const { isStreaming } = useBackgroundStream();
  const hasActiveStream = isStreaming(feature.id);

  const handleCardClick = () => {
    onFeatureClick(feature.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('featureId', feature.id);
    e.dataTransfer.setData('featureTitle', feature.title);
    e.dataTransfer.setData('sourceStatus', feature.status);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    setDraggedFeatureId(feature.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedFeatureId(null);
  };

  const completedTasks = feature.subtasks?.filter(t => t.completed).length ?? 0;
  const totalTasks = feature.subtasks?.length ?? 0;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className="relative p-3 cursor-grab active:cursor-grabbing hover:bg-card transition-colors group border-b border-foreground/5"
    >
      {/* Stream Indicator */}
      {hasActiveStream && <StreamIndicator className="absolute top-2 right-2" />}

      {/* Header: Icon + Title */}
      <div className="flex items-start gap-2 mb-1">
        <div className="mt-0.5">{getFeatureIcon(feature.status)}</div>
        <span className="flex-1 font-sans-serif text-sm font-medium line-clamp-2 leading-tight">
          {feature.title}
        </span>
      </div>

      {/* Summary or Description */}
      {(feature.summary || feature.description) && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-6">
          {feature.summary || feature.description}
        </p>
      )}

      {/* Footer: Progress + Request Count */}
      <div className="flex items-center justify-between pl-6">
        <div className="flex items-center gap-2">
          {totalTasks > 0 && (
            <SubtaskProgress completed={completedTasks} total={totalTasks} />
          )}
        </div>

        {feature.requestCount > 0 && (
          <Badge variant="outline" className="h-5 text-[10px] shrink-0">
            {feature.requestCount} {feature.requestCount === 1 ? 'request' : 'requests'}
          </Badge>
        )}
      </div>
    </div>
  );
}
