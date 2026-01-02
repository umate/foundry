import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  stack: text('stack'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const features = pgTable('features', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('idea'), // 'idea' | 'scoped' | 'ready' | 'done'
  priority: integer('priority').notNull().default(0),
  requestCount: integer('request_count').notNull().default(0),
  parentId: uuid('parent_id'),
  agentSpec: text('agent_spec'), // Original AI-generated PRD as JSON
  prdMarkdown: text('prd_markdown'), // User-editable PRD as markdown
  initialIdea: text('initial_idea'), // The raw idea text user submitted
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  source: text('source').notNull(), // 'interview' | 'idea'
  rawText: text('raw_text').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'triaged'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insights = pgTable('insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  feedbackId: uuid('feedback_id').notNull().references(() => feedback.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'pain_point' | 'feature_request' | 'praise'
  summary: text('summary').notNull(),
  linkedFeatureId: uuid('linked_feature_id').references(() => features.id),
  approved: integer('approved').notNull().default(0), // 0 = false, 1 = true (SQLite compatibility)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Feature = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;

export const featureMessages = pgTable('feature_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: jsonb('content').notNull(), // { text: "..." } or structured tool data
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type FeatureMessage = typeof featureMessages.$inferSelect;
export type NewFeatureMessage = typeof featureMessages.$inferInsert;
