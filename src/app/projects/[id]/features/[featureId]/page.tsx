import { redirect } from 'next/navigation';

interface FeaturePageProps {
  params: Promise<{
    id: string;
    featureId: string;
  }>;
}

// Redirect old feature page URLs to project page with panel open
export default async function FeaturePage({ params }: FeaturePageProps) {
  const { id: projectId, featureId } = await params;
  redirect(`/projects/${projectId}?feature=${featureId}`);
}
