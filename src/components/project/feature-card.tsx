'use client';

import { Lightbulb, Play, CheckCircle, Target } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Feature, FeatureStatus } from '@/types/feature';
import { useDrag } from './drag-context';
import { useBackgroundStream } from './background-stream-context';
import { StreamIndicator } from './stream-indicator';
import { FeatureActionButton } from './feature-action-button';

interface FeatureCardProps {
  feature: Feature;
  onFeatureClick: (featureId: string) => void;
  onFeatureUpdated?: () => void;
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
  onFeatureUpdated,
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
          {(feature.messageCount ?? 0) > 0 && (
            <span className="text-[10px] text-muted-foreground/60 font-mono ml-2">
              · {feature.messageCount} msgs
            </span>
          )}
        </span>
      </div>

      {/* Summary or Description */}
      {(feature.summary || feature.description) && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-6">
          {feature.summary || feature.description}
        </p>
      )}

      {/* Footer: Request Count */}
      {feature.requestCount > 0 && (
        <div className="pl-6">
          <Badge variant="outline" className="h-5 text-[10px] shrink-0">
            {feature.requestCount} {feature.requestCount === 1 ? 'request' : 'requests'}
          </Badge>
        </div>
      )}

      {/* Action Button */}
      <div className="absolute bottom-2 right-2">
        <FeatureActionButton
          feature={feature}
          onFeatureUpdated={onFeatureUpdated ?? (() => {})}
          onOpenPanel={onFeatureClick}
        />
      </div>
    </div>
  );
}
