ALTER TABLE "features" ADD COLUMN "spec_markdown" text;--> statement-breakpoint
ALTER TABLE "features" DROP COLUMN "agent_spec";--> statement-breakpoint
ALTER TABLE "features" DROP COLUMN "prd_markdown";