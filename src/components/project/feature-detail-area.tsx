'use client';

import { useState } from 'react';
import { Lightbulb, PaperPlaneTilt } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FeatureChatPanel } from './feature-chat-panel';

interface FeatureDetailAreaProps {
  featureId: string | null;
  projectId: string;
  project: {
    name: string;
    description: string | null;
    stack: string | null;
  };
  onClose: () => void;
  onFeatureUpdated: () => void;
  onFeatureCreated: (featureId: string) => void;
}

function EmptyState({
  projectId,
  onFeatureCreated,
  onFeatureUpdated,
}: {
  projectId: string;
  onFeatureCreated: (featureId: string) => void;
  onFeatureUpdated: () => void;
}) {
  const [ideaText, setIdeaText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!ideaText.trim() || loading) return;

    setLoading(true);
    try {
      // Create the feature
      const response = await fetch(`/api/projects/${projectId}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaText: ideaText.trim(),
          createOnly: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to create feature');

      const { featureId } = await response.json();

      // Generate title/description
      await fetch(`/api/features/${featureId}/generate-title`, {
        method: 'POST',
      });

      setIdeaText('');
      onFeatureUpdated();
      onFeatureCreated(featureId);
    } catch (error) {
      console.error('Failed to create idea:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && ideaText.trim() && !loading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <Lightbulb className="size-10 text-secondary mx-auto" weight="bold" />
          <h2 className="text-lg font-semibold">What do you want to build?</h2>
          <p className="text-sm text-muted-foreground">
            Describe your idea and AI will help you shape it into a feature.
          </p>
        </div>

        <div className="space-y-3">
          <Textarea
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your idea..."
            className="min-h-[120px] resize-none"
            disabled={loading}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!ideaText.trim() || loading}
              shortcut={{ key: 'enter', meta: true }}
            >
              <PaperPlaneTilt weight="bold" className="size-4" />
              {loading ? 'Creating...' : 'Start Exploring'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureDetailArea({
  featureId,
  projectId,
  project,
  onClose,
  onFeatureUpdated,
  onFeatureCreated,
}: FeatureDetailAreaProps) {
  if (!featureId) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <EmptyState
          projectId={projectId}
          onFeatureCreated={onFeatureCreated}
          onFeatureUpdated={onFeatureUpdated}
        />
      </div>
    );
  }

  return (
    <FeatureChatPanel
      featureId={featureId}
      projectId={projectId}
      project={project}
      onClose={onClose}
      onFeatureUpdated={onFeatureUpdated}
    />
  );
}
