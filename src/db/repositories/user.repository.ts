import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { User, NewUser } from '@/db/schema';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return await db.query.users.findFirst({
      where: eq(schema.users.id, id),
    }) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    }) ?? null;
  }

  async findMany(options?: {
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    return await db.query.users.findMany({
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async create(data: NewUser): Promise<User> {
    const result = await db
      .insert(schema.users)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    const result = await db
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning();

    return result.length > 0;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
