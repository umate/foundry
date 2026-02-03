import { existsSync } from "fs";
import { join } from "path";

export type PackageManager = "bun" | "npm" | "yarn" | "pnpm";

const LOCKFILE_MAP: Record<string, PackageManager> = {
  "bun.lockb": "bun",
  "bun.lock": "bun",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
};

/**
 * Detects the package manager used in a project by checking for lockfiles.
 * Priority: bun > pnpm > yarn > npm
 * Falls back to npm if no lockfile is found.
 */
export function detectPackageManager(repoPath: string): PackageManager {
  for (const [lockfile, pm] of Object.entries(LOCKFILE_MAP)) {
    if (existsSync(join(repoPath, lockfile))) {
      return pm;
    }
  }
  return "npm";
}

/**
 * Returns the dev command for the given package manager.
 */
export function getDevCommand(packageManager: PackageManager): string[] {
  switch (packageManager) {
    case "bun":
      return ["bun", "run", "dev"];
    case "pnpm":
      return ["pnpm", "run", "dev"];
    case "yarn":
      return ["yarn", "dev"];
    case "npm":
      return ["npm", "run", "dev"];
  }
}
