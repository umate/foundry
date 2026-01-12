ALTER TABLE "features" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0;--> statement-breakpoint

-- Initialize sort_order for existing features based on current ordering (priority desc, created_at desc)
-- Features with higher sort_order appear first, so we assign higher values to older features with higher priority
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY project_id, status
           ORDER BY priority DESC, created_at DESC
         ) as rank_num,
         COUNT(*) OVER (PARTITION BY project_id, status) as total_in_status
  FROM features
)
UPDATE features
SET sort_order = (ranked.total_in_status - ranked.rank_num + 1) * 1000
FROM ranked
WHERE features.id = ranked.id;
