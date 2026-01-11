ALTER TABLE "features" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "subtasks" jsonb DEFAULT '[]'::jsonb;