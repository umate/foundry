'use client';

import { useState } from 'react';
import { Compass, Rocket, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useBackgroundStream } from './background-stream-context';
import { Feature } from '@/types/feature';

interface FeatureActionButtonProps {
  feature: Feature & { messageCount?: number };
  onFeatureUpdated: () => void;
  onOpenPanel?: (featureId: string) => void;
}

export function FeatureActionButton({ feature, onFeatureUpdated, onOpenPanel }: FeatureActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const { sendMessage } = useBackgroundStream();
  const hasChat = (feature.messageCount ?? 0) > 0;

  // Don't show button for done features
  if (feature.status === 'done') return null;

  // Determine button config based on state
  const config = getButtonConfig(feature.status, hasChat);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    setLoading(true);
    try {
      if (config.action === 'continue') {
        handleScope();
      } else if (config.action === 'discover') {
        await handleDiscover();
      } else if (config.action === 'build') {
        await handleBuild();
      } else if (config.action === 'done') {
        await handleDone();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScope = () => {
    onOpenPanel?.(feature.id);
    sendMessage(feature.id, { text: "Let's continue scoping this feature." }, {
      featureTitle: feature.title,
      onSpecGenerated: async (markdown) => {
        await fetch(`/api/features/${feature.id}/spec`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ specMarkdown: markdown })
        });
        onFeatureUpdated();
      }
    });
  };

  const handleDiscover = async () => {
    sendMessage(feature.id, { text: '' }, {
      featureTitle: feature.title,
      onSpecGenerated: async (markdown) => {
        await fetch(`/api/features/${feature.id}/spec`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ specMarkdown: markdown })
        });
        onFeatureUpdated();
      }
    });
  };

  const handleBuild = async () => {
    // Fetch the spec
    const res = await fetch(`/api/features/${feature.id}`);
    const { feature: fullFeature } = await res.json();
    const spec = fullFeature.specMarkdown || '';

    // Update status to current
    await fetch(`/api/features/${feature.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'current' })
    });
    onFeatureUpdated();

    // Start implementation stream
    const prompt = `The spec is ready. Let's implement this feature:\n\n${spec}`;
    sendMessage(feature.id, { text: prompt }, {
      featureTitle: feature.title,
      currentSpecMarkdown: spec
    });
  };

  const handleDone = async () => {
    await fetch(`/api/features/${feature.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' })
    });
    onFeatureUpdated();
  };

  return (
    <Button
      size="sm"
      variant={config.variant}
      onClick={handleClick}
      disabled={loading}
      className="h-6 text-[10px] px-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono uppercase tracking-wider"
    >
      {config.icon}
      {config.label}
    </Button>
  );
}

function getButtonConfig(status: string, hasChat: boolean) {
  switch (status) {
    case 'idea':
      return hasChat
        ? { label: 'Continue Refining', icon: <Compass weight="bold" className="size-3" />, action: 'continue', variant: 'secondary' as const }
        : { label: 'Explore with AI', icon: <Compass weight="bold" className="size-3" />, action: 'discover', variant: 'secondary' as const };
    case 'scoped':
      return { label: 'Start Building', icon: <Rocket weight="bold" className="size-3" />, action: 'build', variant: 'secondary' as const };
    case 'current':
      return { label: 'Done', icon: <Check weight="bold" className="size-3" />, action: 'done', variant: 'secondary' as const };
    default:
      return { label: '', icon: null, action: 'none', variant: 'secondary' as const };
  }
}
