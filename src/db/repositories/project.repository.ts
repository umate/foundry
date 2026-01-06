import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { Project, NewProject } from '@/db/schema';
import { randomBytes } from 'crypto';

export class ProjectRepository {
  async findById(id: string): Promise<Project | null> {
    return await db.query.projects.findFirst({
      where: eq(schema.projects.id, id),
    }) ?? null;
  }

  async findMany(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    return await db.query.projects.findMany({
      limit: options?.limit,
      offset: options?.offset,
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });
  }

  async findManyWithFeatureCounts(): Promise<Array<Project & { featureCounts: { idea: number; scoped: number; current: number; done: number } }>> {
    const projects = await db.query.projects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });

    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const features = await db.query.features.findMany({
          where: eq(schema.features.projectId, project.id),
        });

        const featureCounts = {
          idea: features.filter(f => f.status === 'idea').length,
          scoped: features.filter(f => f.status === 'scoped').length,
          current: features.filter(f => f.status === 'ready').length,
          done: features.filter(f => f.status === 'done').length,
        };

        return { ...project, featureCounts };
      })
    );

    return projectsWithCounts;
  }

  async create(data: NewProject): Promise<Project> {
    const result = await db
      .insert(schema.projects)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async update(id: string, data: Partial<NewProject>): Promise<Project | null> {
    const result = await db
      .update(schema.projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, id))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.projects)
      .where(eq(schema.projects.id, id))
      .returning();

    return result.length > 0;
  }

  async findByApiKey(apiKey: string): Promise<Project | null> {
    return await db.query.projects.findFirst({
      where: eq(schema.projects.widgetApiKey, apiKey),
    }) ?? null;
  }

  async regenerateApiKey(id: string): Promise<string | null> {
    const newKey = `fnd_${randomBytes(16).toString('hex')}`;
    const result = await db
      .update(schema.projects)
      .set({
        widgetApiKey: newKey,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, id))
      .returning();

    return result[0]?.widgetApiKey ?? null;
  }
}

// Export singleton instance
export const projectRepository = new ProjectRepository();
