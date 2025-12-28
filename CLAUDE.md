# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev          # Start development server (localhost:3000)
bun run build    # Production build
bun run lint     # Run ESLint

# Database
bun db:generate --name=<migration_name>  # Generate migration from schema
bun db:migrate                           # Apply migrations to database
bun db:studio                            # Open Drizzle Studio (visual DB browser)
```

## Architecture

This is a Next.js 16 App Router project using React 19 with a custom ShadCN UI design system.

### Stack
- **Framework**: Next.js 16 with App Router (`src/app/`)
- **UI Components**: ShadCN UI with heavy customizations (`src/components/ui/`)
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Icons**: Phosphor Icons (`@phosphor-icons/react`), NOT Lucide
- **Database**: PostgreSQL with Drizzle ORM
- **Runtime**: Bun

### Path Aliases
- `@/*` maps to `./src/*`

### Database Structure
- **Schema**: `src/db/schema.ts` (all table definitions)
- **Client**: `src/db/index.ts` (singleton database connection)
- **Repositories**: `src/db/repositories/` (data access layer)
- **Migrations**: `drizzle/migrations/` (SQL migration files)

## Design System

The UI follows a retro/industrial aesthetic that differs significantly from default ShadCN. See [docs/design-system.md](docs/design-system.md) for full details.

### Key Styling Rules
- **Fonts**: Space Mono (monospace) throughout; use `font-mono uppercase tracking-wider` for buttons/badges/tabs
- **Colors**: Sage/olive palette with black primary and orange (`#E85102`) secondary accent
- **Shapes**: Rectangular aesthetic - use `rounded-sm` or `rounded-md`, avoid `rounded-full`
- **Borders**: `border-2` on buttons, thin borders on inputs

### Component Conventions
- Buttons: uppercase, monospace, `border-2` matching bg color, hover uses opacity (`/80`)
- Badges: `rounded-sm` (not pill-shaped), uppercase monospace
- Toggle controls (checkbox, switch, radio): rectangular `rounded-sm` instead of rounded

### Icons
```tsx
import { User, Gear, Plus } from "@phosphor-icons/react";
<Button><Plus weight="bold" /> Create</Button>  // Use weight="bold" in buttons
```

## Adding ShadCN Components

```bash
npx shadcn@latest add <component>
```

After adding, customize to match the design system (rectangular shapes, monospace font, appropriate colors).

## Database Management

### Migration Workflow

1. **Edit Schema** - Modify `src/db/schema.ts`
2. **Generate Migration** - `bun db:generate --name=<semantic_name>`
3. **Review SQL** - Check generated file in `drizzle/migrations/`
4. **Apply Migration** - `bun db:migrate`
5. **Commit** - Add migration files to git

**Migration Naming:**
- Use snake_case: `create_posts_table`, `add_user_role_column`
- Start with action: `create_`, `add_`, `update_`, `remove_`
- Be specific: `add_email_index` not `update_users`

**Example:**
```bash
# Add new table to src/db/schema.ts
bun db:generate --name=create_posts_table
bun db:migrate
git add drizzle/migrations/
git commit -m "Add posts table"
```

**Important:** Migration SQL files in `drizzle/migrations/` should be committed to git. The `.gitignore` is configured to commit migrations while ignoring metadata files.

### Repository Pattern

**CRITICAL: NEVER access the database directly. Always use repositories.**

All database access must go through repository classes in `src/db/repositories/`. This ensures:
- Type safety
- Consistent data access patterns
- Easy testing and mocking
- Clear separation of concerns

**Creating a Repository:**

```typescript
// src/db/repositories/post.repository.ts
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { Post, NewPost } from '@/db/schema';

export class PostRepository {
  async findById(id: string): Promise<Post | null> {
    return await db.query.posts.findFirst({
      where: eq(schema.posts.id, id),
    }) ?? null;
  }

  async findMany(limit = 10, offset = 0): Promise<Post[]> {
    return await db.query.posts.findMany({ limit, offset });
  }

  async create(data: NewPost): Promise<Post> {
    const result = await db
      .insert(schema.posts)
      .values(data)
      .returning();
    return result[0];
  }
}

export const postRepository = new PostRepository();
```

**Using Repositories:**

```typescript
// ✅ CORRECT - Use repository
import { userRepository } from '@/db/repositories/user.repository';

const user = await userRepository.findByEmail('test@example.com');
const users = await userRepository.findMany({ limit: 10 });

// ❌ WRONG - Direct database access
import { db } from '@/db';
const user = await db.select().from(users); // NEVER DO THIS
```

### Schema Conventions

- **Table names**: Lowercase plural (`users`, `posts`, `comments`)
- **Column names**: snake_case (`created_at`, `user_id`, `email_address`)
- **Primary keys**: UUID with `defaultRandom()` (not auto-increment)
- **Timestamps**: Always include `created_at` and `updated_at`
- **Types**: Export from schema using `$inferSelect` and `$inferInsert`

**Example Table:**
```typescript
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

### Bun-Specific Notes

- Bun automatically loads `.env.local` when running scripts
- Use `bun run` for TypeScript files: `bun run src/db/migrate.ts`
- Migration runner at `src/db/migrate.ts` handles environment loading
- No need for `dotenv` package - Bun handles it natively
