'use client';

import { Lightbulb, Target, Play, CheckCircle, PlusIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Feature, FeaturesByStatus, FeatureStatus, STATUS_LABELS, SIDEBAR_STATUS_ORDER } from '@/types/feature';
import { useBackgroundStream } from './background-stream-context';
import { StreamIndicator } from './stream-indicator';

interface FeatureSidebarProps {
  features: FeaturesByStatus;
  searchQuery?: string;
  selectedFeatureId: string | null;
  onFeatureClick: (featureId: string) => void;
  onAddIdea?: () => void;
  onFeatureUpdated: () => void;
}

function matchesSearch(feature: Feature, query: string): boolean {
  const q = query.toLowerCase();
  return (
    feature.title.toLowerCase().includes(q) ||
    (feature.description?.toLowerCase().includes(q) ?? false) ||
    (feature.summary?.toLowerCase().includes(q) ?? false)
  );
}

const getStatusIcon = (status: FeatureStatus) => {
  switch (status) {
    case 'idea':
      return <Lightbulb weight="bold" className="size-3.5" />;
    case 'scoped':
      return <Target weight="bold" className="size-3.5" />;
    case 'current':
      return <Play weight="bold" className="size-3.5" />;
    case 'done':
      return <CheckCircle weight="bold" className="size-3.5" />;
  }
};

const getFeatureIcon = (status: FeatureStatus) => {
  switch (status) {
    case 'idea':
      return <Lightbulb className="size-3.5 text-secondary shrink-0" />;
    case 'scoped':
      return <Target className="size-3.5 text-secondary shrink-0" />;
    case 'current':
      return <Play className="size-3.5 text-secondary shrink-0" />;
    case 'done':
      return <CheckCircle className="size-3.5 text-secondary shrink-0" />;
  }
};

function SidebarFeatureCard({
  feature,
  isSelected,
  onClick,
}: {
  feature: Feature;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { isStreaming } = useBackgroundStream();
  const hasActiveStream = isStreaming(feature.id);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 transition-colors relative ${
        isSelected
          ? 'bg-card border-l-2 border-secondary'
          : 'border-l-2 border-transparent hover:bg-card/50'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0 mt-0.5">{getFeatureIcon(feature.status)}</div>
        <span className="text-sm font-medium truncate flex-1">{feature.title}</span>
        {hasActiveStream && <StreamIndicator className="shrink-0" />}
      </div>
      {(feature.summary || feature.description) && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 pl-5.5">
          {feature.summary || feature.description}
        </p>
      )}
    </button>
  );
}

export function FeatureSidebar({
  features,
  searchQuery,
  selectedFeatureId,
  onFeatureClick,
  onAddIdea,
}: FeatureSidebarProps) {
  const filteredFeatures = searchQuery
    ? {
        idea: features.idea.filter((f) => matchesSearch(f, searchQuery)),
        scoped: features.scoped.filter((f) => matchesSearch(f, searchQuery)),
        current: features.current.filter((f) => matchesSearch(f, searchQuery)),
        done: features.done.filter((f) => matchesSearch(f, searchQuery)),
      }
    : features;

  return (
    <div className="w-72 shrink-0 border-r border-border flex flex-col bg-background">
      {/* Add Idea button */}
      {onAddIdea && (
        <div className="p-2 border-b border-border shrink-0">
          <Button variant="outline" size="sm" onClick={onAddIdea} className="w-full">
            <PlusIcon weight="bold" />
            Add Idea
          </Button>
        </div>
      )}

      {/* Scrollable feature list grouped by status */}
      <div className="flex-1 overflow-y-auto">
        {SIDEBAR_STATUS_ORDER.map((status) => {
          const statusFeatures = filteredFeatures[status];
          return (
            <div key={status}>
              {/* Status group header */}
              <div className="h-8 px-3 flex items-center gap-2 bg-card/50 border-b border-foreground/5 sticky top-0 z-10">
                {getStatusIcon(status)}
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                  {STATUS_LABELS[status]}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {statusFeatures.length}
                </span>
              </div>

              {/* Feature cards */}
              {statusFeatures.length > 0 && (
                <div>
                  {statusFeatures.map((feature) => (
                    <SidebarFeatureCard
                      key={feature.id}
                      feature={feature}
                      isSelected={feature.id === selectedFeatureId}
                      onClick={() => onFeatureClick(feature.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
