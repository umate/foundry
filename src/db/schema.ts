import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import crypto from 'crypto';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  stack: text('stack'),
  widgetApiKey: text('widget_api_key'),
  repoPath: text('repo_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// SubTask type for checklist items within features
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

// FeatureImage type for images attached to features
export interface FeatureImage {
  id: string;        // Short unique ID (matches filename without extension)
  filename: string;  // Full filename with extension (e.g., "a1b2c3d4.png")
  mimeType: string;  // "image/png", "image/jpeg", etc.
  createdAt: string; // ISO timestamp
}

export const features = sqliteTable('features', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('idea'), // 'idea' | 'scoped' | 'ready' | 'done' | 'archived'
  priority: integer('priority').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  requestCount: integer('request_count').notNull().default(0),
  parentId: text('parent_id'),
  specMarkdown: text('spec_markdown'),
  wireframe: text('wireframe'),
  initialIdea: text('initial_idea'),
  summary: text('summary'),
  subtasks: text('subtasks', { mode: 'json' }).$type<SubTask[]>().default([]),
  images: text('images', { mode: 'json' }).$type<FeatureImage[]>().default([]),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  source: text('source').notNull(), // 'interview' | 'idea'
  rawText: text('raw_text').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'triaged'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const insights = sqliteTable('insights', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  feedbackId: text('feedback_id').notNull().references(() => feedback.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'pain_point' | 'feature_request' | 'praise'
  summary: text('summary').notNull(),
  linkedFeatureId: text('linked_feature_id').references(() => features.id),
  approved: integer('approved').notNull().default(0), // 0 = false, 1 = true
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
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

export const featureMessages = sqliteTable('feature_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  featureId: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type FeatureMessage = typeof featureMessages.$inferSelect;
export type NewFeatureMessage = typeof featureMessages.$inferInsert;
