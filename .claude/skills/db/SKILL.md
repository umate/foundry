# Database Skill (Drizzle ORM)

This skill provides database patterns for PostgreSQL with Drizzle ORM. Run `/db` for full reference.

## Project Structure

```
src/db/
├── index.ts           # Singleton db connection
├── schema.ts          # All table definitions
├── migrate.ts         # Migration runner
└── repositories/      # Data access layer (REQUIRED)
```

## CRITICAL: Always Use Repositories

**NEVER access db directly. Always use repository classes.**

```typescript
// ✅ CORRECT
import { featureRepository } from '@/db/repositories/feature.repository';
const feature = await featureRepository.findById(id);

// ❌ WRONG - Direct db access
import { db } from '@/db';
const feature = await db.select().from(features); // NEVER DO THIS
```

## Schema Definition

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('draft'),
  priority: integer('priority').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

### Schema Conventions
- **Table names**: lowercase plural (`users`, `posts`)
- **Column names**: snake_case (`created_at`, `user_id`)
- **Primary keys**: UUID with `defaultRandom()`
- **Timestamps**: Always include `created_at` and `updated_at`

## Repository Pattern

```typescript
// src/db/repositories/post.repository.ts
import { eq, and, desc, asc } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { Post, NewPost } from '@/db/schema';

export class PostRepository {
  async findById(id: string): Promise<Post | null> {
    return await db.query.posts.findFirst({
      where: eq(schema.posts.id, id),
    }) ?? null;
  }

  async findMany(limit = 10, offset = 0): Promise<Post[]> {
    return await db.query.posts.findMany({
      limit,
      offset,
      orderBy: desc(schema.posts.createdAt),
    });
  }

  async findByUserId(userId: string): Promise<Post[]> {
    return await db.query.posts.findMany({
      where: eq(schema.posts.userId, userId),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });
  }

  async create(data: NewPost): Promise<Post> {
    const result = await db
      .insert(schema.posts)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewPost>): Promise<Post | null> {
    const result = await db
      .update(schema.posts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, id))
      .returning();
    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.posts)
      .where(eq(schema.posts.id, id))
      .returning();
    return result.length > 0;
  }
}

export const postRepository = new PostRepository();
```

## Migration Workflow

```bash
# 1. Edit src/db/schema.ts
# 2. Generate migration
bun db:generate --name=create_posts_table

# 3. Review SQL in drizzle/migrations/
# 4. Apply migration
bun db:migrate

# 5. Commit migration files
git add drizzle/migrations/
```

### Migration Naming
- Use snake_case: `create_posts_table`, `add_user_role_column`
- Start with action: `create_`, `add_`, `update_`, `remove_`

## Common Query Patterns

### Filtering with Multiple Conditions
```typescript
import { eq, and, or, isNull, isNotNull, gt, lt, like } from 'drizzle-orm';

// AND conditions
where: and(
  eq(schema.posts.userId, userId),
  eq(schema.posts.status, 'published')
)

// OR conditions
where: or(
  eq(schema.posts.status, 'draft'),
  eq(schema.posts.status, 'review')
)

// NULL checks
where: isNull(schema.posts.deletedAt)

// Comparisons
where: gt(schema.posts.priority, 5)

// LIKE
where: like(schema.posts.title, '%search%')
```

### Ordering
```typescript
// Single column
orderBy: desc(schema.posts.createdAt)

// Multiple columns
orderBy: (posts, { asc, desc }) => [
  asc(posts.status),
  desc(posts.priority),
  desc(posts.createdAt),
]
```

### Relations (with query API)
```typescript
// In schema.ts - define relations
import { relations } from 'drizzle-orm';

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments),
}));

// In repository - query with relations
async findWithAuthor(id: string) {
  return await db.query.posts.findFirst({
    where: eq(schema.posts.id, id),
    with: {
      author: true,
      comments: true,
    },
  });
}
```

## Database Client Setup

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, {
  max: process.env.NODE_ENV === 'production' ? 10 : 1,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { schema };
```

## Common Imports

```typescript
// Schema and types
import { db, schema } from '@/db';
import type { Post, NewPost } from '@/db/schema';

// Query operators
import { eq, and, or, gt, lt, gte, lte, like, isNull, isNotNull, desc, asc } from 'drizzle-orm';

// Table definitions (for insert/update)
import { pgTable, uuid, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

// Relations
import { relations } from 'drizzle-orm';
```
