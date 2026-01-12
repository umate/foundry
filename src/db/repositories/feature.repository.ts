import { eq, and, ne } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { Feature, NewFeature } from '@/db/schema';
import { featureMessageRepository } from './feature-message.repository';

export class FeatureRepository {
  async findById(id: string): Promise<Feature | null> {
    return await db.query.features.findFirst({
      where: eq(schema.features.id, id),
    }) ?? null;
  }

  async findByProjectId(projectId: string): Promise<Feature[]> {
    return await db.query.features.findMany({
      where: and(
        eq(schema.features.projectId, projectId),
        ne(schema.features.status, 'archived')
      ),
      orderBy: (features, { asc, desc }) => [
        asc(features.status),
        desc(features.priority),
        desc(features.createdAt),
      ],
    });
  }

  async findByProjectIdGrouped(projectId: string): Promise<{
    idea: (Feature & { messageCount?: number })[];
    scoped: (Feature & { messageCount?: number })[];
    current: (Feature & { messageCount?: number })[];
    done: (Feature & { messageCount?: number })[];
  }> {
    const features = await this.findByProjectId(projectId);

    // Fetch message counts for all features
    const featureIds = features.map(f => f.id);
    const messageCounts = await featureMessageRepository.getMessageCountsByFeatureIds(featureIds);

    // Enrich features with message counts
    const enrichedFeatures = features.map(f => ({
      ...f,
      messageCount: messageCounts.get(f.id) ?? 0,
    }));

    return {
      idea: enrichedFeatures.filter(f => f.status === 'idea'),
      scoped: enrichedFeatures.filter(f => f.status === 'scoped'),
      current: enrichedFeatures.filter(f => f.status === 'ready'),
      done: enrichedFeatures.filter(f => f.status === 'done'),
    };
  }

  async create(data: NewFeature): Promise<Feature> {
    const result = await db
      .insert(schema.features)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async createMany(data: NewFeature[]): Promise<Feature[]> {
    const result = await db
      .insert(schema.features)
      .values(
        data.map(d => ({
          ...d,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      )
      .returning();

    return result;
  }

  async update(id: string, data: Partial<NewFeature>): Promise<Feature | null> {
    const result = await db
      .update(schema.features)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.features.id, id))
      .returning();

    return result[0] ?? null;
  }

  async updatePriorities(updates: Array<{ id: string; priority: number }>): Promise<void> {
    await Promise.all(
      updates.map(({ id, priority }) =>
        db
          .update(schema.features)
          .set({ priority, updatedAt: new Date() })
          .where(eq(schema.features.id, id))
      )
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.features)
      .where(eq(schema.features.id, id))
      .returning();

    return result.length > 0;
  }
}

// Export singleton instance
export const featureRepository = new FeatureRepository();
