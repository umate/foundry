import fs from "fs";
import path from "path";

const templatesDir = path.dirname(new URL(import.meta.url).pathname);

export const DEFAULT_FEATURE_TEMPLATE = fs.readFileSync(
  path.join(templatesDir, "feature.md"),
  "utf-8"
);

export const DEFAULT_BUG_TEMPLATE = fs.readFileSync(
  path.join(templatesDir, "bug.md"),
  "utf-8"
);

export const DEFAULT_TEMPLATES = {
  feature: DEFAULT_FEATURE_TEMPLATE,
  bug: DEFAULT_BUG_TEMPLATE,
} as const;

export type TemplateType = keyof typeof DEFAULT_TEMPLATES;
