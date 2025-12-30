import { notFound } from 'next/navigation';
import { featureRepository } from '@/db/repositories/feature.repository';
import { projectRepository } from '@/db/repositories/project.repository';
import { featureMessageRepository } from '@/db/repositories/feature-message.repository';
import { FeaturePageClient } from '@/components/feature/feature-page-client';

interface FeaturePageProps {
  params: Promise<{
    id: string;
    featureId: string;
  }>;
}

export default async function FeaturePage({ params }: FeaturePageProps) {
  const { id: projectId, featureId } = await params;

  const [feature, project, messages] = await Promise.all([
    featureRepository.findById(featureId),
    projectRepository.findById(projectId),
    featureMessageRepository.findByFeatureId(featureId),
  ]);

  if (!feature || !project) {
    notFound();
  }

  // Verify feature belongs to project
  if (feature.projectId !== projectId) {
    notFound();
  }

  return <FeaturePageClient feature={feature} project={project} initialMessages={messages} />;
}
