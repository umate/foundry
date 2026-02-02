import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface RemoteInfo {
  name: string;
  url: string;
}

export interface BranchList {
  current: string | null;
  local: string[];
  remote: { name: string; tracking: string }[];
}

export async function getCurrentBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync("git branch --show-current", { cwd });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function getRemotes(cwd: string): Promise<RemoteInfo[]> {
  try {
    const { stdout } = await execAsync("git remote -v", { cwd });
    const lines = stdout.trim().split("\n").filter(Boolean);
    const remotes: RemoteInfo[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\(push\)$/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        remotes.push({ name: match[1], url: match[2] });
      }
    }

    return remotes;
  } catch {
    return [];
  }
}

export async function listBranches(cwd: string): Promise<BranchList> {
  const current = await getCurrentBranch(cwd);

  // Get local branches
  let local: string[] = [];
  try {
    const { stdout } = await execAsync("git branch --list", { cwd });
    local = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => line.replace(/^\*?\s+/, "").trim())
      .filter(Boolean);
  } catch {
    // ignore
  }

  // Get remote branches
  let remote: { name: string; tracking: string }[] = [];
  try {
    const { stdout } = await execAsync("git branch -r", { cwd });
    remote = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => line.trim())
      .filter((line) => !line.includes("HEAD ->"))
      .map((line) => {
        // e.g. "origin/feature-x" → name: "feature-x", tracking: "origin/feature-x"
        const tracking = line;
        const slashIndex = line.indexOf("/");
        const name = slashIndex >= 0 ? line.slice(slashIndex + 1) : line;
        return { name, tracking };
      })
      // Filter out remote branches that already have a local counterpart
      .filter((rb) => !local.includes(rb.name));
  } catch {
    // ignore
  }

  return { current, local, remote };
}

export async function getUncommittedCount(cwd: string): Promise<number> {
  try {
    const { stdout } = await execAsync("git status --porcelain", {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.length;
  } catch {
    return 0;
  }
}

export async function getCommitsBehind(cwd: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      "git rev-list --count HEAD..@{upstream}",
      { cwd }
    );
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    // No upstream or other error
    return 0;
  }
}

export async function getCommitsAhead(cwd: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      "git rev-list --count @{upstream}..HEAD",
      { cwd }
    );
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    // No upstream or other error
    return 0;
  }
}

export async function checkoutBranch(
  cwd: string,
  branch: string,
  isRemote?: boolean
): Promise<void> {
  if (isRemote) {
    // Create local tracking branch from remote
    // e.g. "origin/feature-x" → git checkout -b feature-x origin/feature-x
    const localName = branch.includes("/")
      ? branch.slice(branch.indexOf("/") + 1)
      : branch;
    await execAsync(`git checkout -b ${localName} ${branch}`, { cwd });
  } else {
    await execAsync(`git checkout ${branch}`, { cwd });
  }
}

export async function pullBranch(
  cwd: string
): Promise<{ summary: string }> {
  const { stdout, stderr } = await execAsync("git pull", {
    cwd,
    timeout: 60000,
  });
  return { summary: stdout.trim() || stderr.trim() };
}

export async function discardAllChanges(cwd: string): Promise<void> {
  await execAsync("git checkout -- .", { cwd });
  await execAsync("git clean -fd", { cwd });
}

export async function fetchRemote(cwd: string): Promise<void> {
  try {
    await execAsync("git fetch --all", { cwd, timeout: 30000 });
  } catch {
    // Fetch failures are non-critical (offline, no remote, etc.)
  }
}
