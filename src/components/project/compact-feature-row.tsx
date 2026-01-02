'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, Play, Check, Target, CheckCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Feature, FeatureStatus } from '@/types/feature';

interface CompactFeatureRowProps {
  feature: Feature;
  projectId: string;
  onUpdated: () => void;
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

export function CompactFeatureRow({
  feature,
  projectId,
  onUpdated,
}: CompactFeatureRowProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRowClick = () => {
    router.push(`/projects/${projectId}/features/${feature.id}`);
  };

  // Status transition logic
  const getNextStatus = (): FeatureStatus | null => {
    switch (feature.status) {
      case 'idea':
        return 'scoped';
      case 'scoped':
        return 'current';
      case 'current':
        return 'done';
      case 'done':
        return null;
    }
  };

  const getActionLabel = () => {
    switch (feature.status) {
      case 'idea':
        return 'Scope';
      case 'scoped':
        return 'Start';
      case 'current':
        return 'Finish';
      case 'done':
        return null;
    }
  };

  const getActionIcon = () => {
    switch (feature.status) {
      case 'idea':
        return <Target weight="bold" className="size-3" />;
      case 'scoped':
        return <Play weight="bold" className="size-3" />;
      case 'current':
        return <Check weight="bold" className="size-3" />;
      default:
        return null;
    }
  };

  const handleStatusChange = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't navigate when clicking button
    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    setLoading(true);
    try {
      await fetch(`/api/features/${feature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = getActionLabel();

  return (
    <div
      className="h-8 px-3 flex items-center gap-2 cursor-pointer hover:bg-card transition-colors group"
      onClick={handleRowClick}
    >
      {/* Type Icon */}
      {getFeatureIcon(feature.status)}

      {/* Title - truncate */}
      <span className="flex-1 font-mono text-sm truncate">{feature.title}</span>

      {/* Request Count Badge (if any) */}
      {feature.requestCount > 0 && (
        <Badge variant="outline" className="h-5 text-[10px] shrink-0">
          {feature.requestCount}
        </Badge>
      )}

      {/* Inline Action Button */}
      {actionLabel && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleStatusChange}
          disabled={loading}
          className="h-6 text-[10px] px-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {getActionIcon()}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
