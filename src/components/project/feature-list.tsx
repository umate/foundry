'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { FeatureCard } from './feature-card';

interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'scoped' | 'ready' | 'done';
  priority: number;
  requestCount: number;
}

interface FeatureListProps {
  features: {
    idea: Feature[];
    scoped: Feature[];
    ready: Feature[];
    done: Feature[];
  };
  projectId: string;
  onFeatureUpdated: () => void;
}

export function FeatureList({ features, projectId, onFeatureUpdated }: FeatureListProps) {
  const renderFeatureList = (featureList: Feature[]) => {
    if (featureList.length === 0) {
      return (
        <Card className="p-8 text-center">
          <p className="font-mono text-black/60">No features in this status</p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {featureList.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            projectId={projectId}
            onUpdated={onFeatureUpdated}
          />
        ))}
      </div>
    );
  };

  return (
    <Tabs defaultValue="idea" className="w-full">
      <TabsList>
        <TabsTrigger value="idea">
          Idea ({features.idea.length})
        </TabsTrigger>
        <TabsTrigger value="scoped">
          Scoped ({features.scoped.length})
        </TabsTrigger>
        <TabsTrigger value="ready">
          Ready ({features.ready.length})
        </TabsTrigger>
        <TabsTrigger value="done">
          Done ({features.done.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="idea" className="mt-6">
        {renderFeatureList(features.idea)}
      </TabsContent>

      <TabsContent value="scoped" className="mt-6">
        {renderFeatureList(features.scoped)}
      </TabsContent>

      <TabsContent value="ready" className="mt-6">
        {renderFeatureList(features.ready)}
      </TabsContent>

      <TabsContent value="done" className="mt-6">
        {renderFeatureList(features.done)}
      </TabsContent>
    </Tabs>
  );
}
