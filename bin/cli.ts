#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import * as readline from "node:readline";

// ── Constants ──────────────────────────────────────────────────────────────

const REPO_URL = "https://github.com/umate/foundry.git";
const DEFAULT_PORT = 5005;
const ENV_KEY_NAME = "AI_GATEWAY_API_KEY";
const PROJECT_NAME = "foundry-ai";

// ── Utilities ──────────────────────────────────────────────────────────────

function log(message: string) {
  console.log(`\x1b[36m[foundry]\x1b[0m ${message}`);
}

function logSuccess(message: string) {
  console.log(`\x1b[32m[foundry]\x1b[0m ${message}`);
}

function logError(message: string) {
  console.error(`\x1b[31m[foundry]\x1b[0m ${message}`);
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function run(cmd: string[], cwd: string, label?: string) {
  if (label) log(label);
  const result = Bun.spawnSync({
    cmd,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    logError(`Command failed: ${cmd.join(" ")}`);
    process.exit(1);
  }
}

function parseArgs(): { port: number; dir: string } {
  const args = process.argv.slice(2);
  let port = DEFAULT_PORT;
  let dir = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      const p = parseInt(args[i + 1], 10);
      if (!isNaN(p) && p > 0 && p < 65536) port = p;
      i++;
    } else if (args[i] === "--dir" && args[i + 1]) {
      dir = resolve(args[i + 1]);
      i++;
    }
  }

  return { port, dir };
}

// ── Detect existing Foundry project ────────────────────────────────────────

function isFoundryProject(dir: string): boolean {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.name === PROJECT_NAME;
  } catch {
    return false;
  }
}

// ── Ensure project exists ──────────────────────────────────────────────────

function ensureProject(dir: string): string {
  // Case 1: Already inside a Foundry project
  if (isFoundryProject(dir)) {
    log("Detected existing Foundry project.");
    run(["git", "pull"], dir, "Pulling latest changes...");
    run(["bun", "install"], dir, "Installing dependencies...");
    return dir;
  }

  // Case 2: ./foundry subdirectory exists
  const subDir = join(dir, "foundry");
  if (isFoundryProject(subDir)) {
    log("Found Foundry in ./foundry");
    run(["git", "pull"], subDir, "Pulling latest changes...");
    run(["bun", "install"], subDir, "Installing dependencies...");
    return subDir;
  }

  // Case 3: Clone fresh
  log("Cloning Foundry...");
  run(["git", "clone", REPO_URL, "foundry"], dir);
  run(["bun", "install"], subDir, "Installing dependencies...");
  return subDir;
}

// ── Ensure .env.local has API key ──────────────────────────────────────────

async function ensureEnvFile(projectDir: string): Promise<void> {
  const envFile = join(projectDir, ".env.local");
  let envContent = "";

  if (existsSync(envFile)) {
    envContent = readFileSync(envFile, "utf-8");
    const match = envContent.match(
      /^AI_GATEWAY_API_KEY\s*=\s*"?([^"\n]*)"?/m
    );
    if (match?.[1] && match[1] !== "your-api-key" && match[1] !== "your-vercel-ai-gateway-key" && match[1].length > 0) {
      logSuccess("API key found.");
      return;
    }
    log(".env.local exists but AI_GATEWAY_API_KEY is missing or empty.");
  } else {
    log("No .env.local found. Setting up environment...");
  }

  console.log("");
  console.log("  Foundry uses Vercel AI Gateway to route AI requests.");
  console.log("  Get a free key at: \x1b[4mhttps://vercel.com/ai-gateway\x1b[0m");
  console.log("");

  const apiKey = await prompt("  Paste your AI Gateway API key: ");

  if (!apiKey) {
    logError("No key provided. Set AI_GATEWAY_API_KEY in .env.local later.");
    process.exit(1);
  }

  if (existsSync(envFile) && envContent.includes(ENV_KEY_NAME)) {
    envContent = envContent.replace(
      /^AI_GATEWAY_API_KEY\s*=.*/m,
      `AI_GATEWAY_API_KEY="${apiKey}"`
    );
  } else if (existsSync(envFile)) {
    envContent = envContent.trimEnd() + `\nAI_GATEWAY_API_KEY="${apiKey}"\n`;
  } else {
    envContent = `NODE_ENV="development"\nAI_GATEWAY_API_KEY="${apiKey}"\n`;
  }

  writeFileSync(envFile, envContent, "utf-8");
  logSuccess("API key saved to .env.local");
}

// ── Run migrations ─────────────────────────────────────────────────────────

function runMigrations(projectDir: string) {
  mkdirSync(join(projectDir, "data"), { recursive: true });
  run(["bun", "run", "src/db/migrate.ts"], projectDir, "Running migrations...");
  logSuccess("Migrations complete.");
}

// ── Start dev server ───────────────────────────────────────────────────────

function startDevServer(projectDir: string, port: number) {
  log(`Starting Foundry at http://localhost:${port}`);
  console.log("");

  const child = Bun.spawn({
    cmd: ["bun", "--bun", "next", "dev", "--port", String(port)],
    cwd: projectDir,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  process.on("SIGINT", () => child.kill());
  process.on("SIGTERM", () => child.kill());

  child.exited.then((code) => {
    process.exit(code ?? 0);
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("  \x1b[1mFoundry\x1b[0m — AI-powered development orchestration");
  console.log("");

  const { port, dir } = parseArgs();
  const projectDir = ensureProject(dir);

  await ensureEnvFile(projectDir);
  runMigrations(projectDir);
  startDevServer(projectDir, port);
}

main().catch((err) => {
  logError(err.message);
  process.exit(1);
});
