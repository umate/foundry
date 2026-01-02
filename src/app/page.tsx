import { redirect } from 'next/navigation';
import { projectRepository } from '@/db/repositories/project.repository';

export default async function HomePage() {
  const projects = await projectRepository.findMany({ limit: 1 });

  if (projects.length > 0) {
    redirect(`/projects/${projects[0].id}`);
  }

  // No projects - redirect to create project page
  redirect('/projects/new');
}
