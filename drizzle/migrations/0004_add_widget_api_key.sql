ALTER TABLE "features" DROP CONSTRAINT "features_parent_id_features_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "widget_api_key" text;