import { eq, sql, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { FeatureMessage, NewFeatureMessage } from '@/db/schema';

export class FeatureMessageRepository {
  async create(message: NewFeatureMessage): Promise<FeatureMessage> {
    const result = await db
      .insert(schema.featureMessages)
      .values({ ...message, createdAt: new Date() })
      .returning();
    return result[0];
  }

  async findByFeatureId(featureId: string): Promise<FeatureMessage[]> {
    return await db.query.featureMessages.findMany({
      where: eq(schema.featureMessages.featureId, featureId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });
  }

  async createMany(messages: NewFeatureMessage[]): Promise<FeatureMessage[]> {
    if (messages.length === 0) return [];

    const result = await db
      .insert(schema.featureMessages)
      .values(messages.map(m => ({
        ...m,
        createdAt: new Date(),
      })))
      .returning();

    return result;
  }

  async deleteByFeatureId(featureId: string): Promise<void> {
    await db
      .delete(schema.featureMessages)
      .where(eq(schema.featureMessages.featureId, featureId));
  }

  async replaceAll(featureId: string, messages: Omit<NewFeatureMessage, 'featureId'>[]): Promise<FeatureMessage[]> {
    await this.deleteByFeatureId(featureId);

    if (messages.length === 0) return [];

    return await this.createMany(
      messages.map(m => ({ ...m, featureId }))
    );
  }

  async getMessageCountsByFeatureIds(featureIds: string[]): Promise<Map<string, number>> {
    if (featureIds.length === 0) return new Map();

    const counts = await db
      .select({
        featureId: schema.featureMessages.featureId,
        count: sql<number>`count(*)`,
      })
      .from(schema.featureMessages)
      .where(inArray(schema.featureMessages.featureId, featureIds))
      .groupBy(schema.featureMessages.featureId);

    return new Map(counts.map(c => [c.featureId, c.count]));
  }
}

export const featureMessageRepository = new FeatureMessageRepository();
