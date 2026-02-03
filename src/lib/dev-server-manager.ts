import { spawn, ChildProcess } from "child_process";
import { type PackageManager, getDevCommand, detectPackageManager } from "./package-manager";

// Removed "idle" - server is either running/starting or stopped/error
export type DevServerStatus = "starting" | "running" | "error" | "stopped";

export interface LogEntry {
  timestamp: number;
  type: "stdout" | "stderr";
  text: string;
}

export interface DevServerState {
  status: DevServerStatus;
  logs: LogEntry[];
  error?: string;
  startedAt?: number;
  packageManager: PackageManager;
}

interface InternalServerState {
  process: ChildProcess | null;
  status: DevServerStatus;
  logs: LogEntry[];
  error?: string;
  startedAt?: number;
  packageManager: PackageManager;
  subscribers: Set<(entry: LogEntry) => void>;
}

const MAX_LOG_LINES = 1000;

/**
 * Singleton dev server manager - only one server can run at a time.
 */
class DevServerManager {
  // Singleton: only one server at a time
  private currentServer: InternalServerState | null = null;
  private currentProjectId: string | null = null;

  /**
   * Get the project ID of the currently running server, if any.
   */
  getRunningProjectId(): string | null {
    if (
      this.currentServer &&
      (this.currentServer.status === "running" || this.currentServer.status === "starting")
    ) {
      return this.currentProjectId;
    }
    return null;
  }

  /**
   * Start a dev server for a project.
   * If a server is already running (for any project), it will be stopped first.
   * Returns the initial state.
   */
  start(
    projectId: string,
    repoPath: string,
    packageManagerOverride?: PackageManager | null
  ): DevServerState {
    // If already running/starting for this project, return current state
    if (
      this.currentProjectId === projectId &&
      this.currentServer?.process &&
      (this.currentServer.status === "running" || this.currentServer.status === "starting")
    ) {
      return this.getPublicState(this.currentServer);
    }

    // Stop any existing server (different project or error/stopped state)
    if (this.currentServer) {
      this.stopInternal();
    }

    // Detect or use override
    const packageManager = packageManagerOverride || detectPackageManager(repoPath);
    const [cmd, ...args] = getDevCommand(packageManager);

    // Create state
    const state: InternalServerState = {
      process: null,
      status: "starting",
      logs: [],
      startedAt: Date.now(),
      packageManager,
      subscribers: new Set(),
    };

    this.currentServer = state;
    this.currentProjectId = projectId;

    // Spawn process
    try {
      // Build enhanced PATH with common toolchain manager locations
      // This ensures tools managed by proto, nvm, volta, etc. are discoverable
      const homeDir = process.env.HOME || process.env.USERPROFILE || "";
      const additionalPaths = [
        // Proto (toolchain manager)
        `${homeDir}/.proto/shims`,
        `${homeDir}/.proto/bin`,

        // Node version managers
        `${homeDir}/.nvm/current/bin`,
        `${homeDir}/.fnm/current/bin`,
        `${homeDir}/.fnm/aliases/default/bin`,
        `${homeDir}/.volta/bin`,
        `${homeDir}/.asdf/shims`,
        `${homeDir}/.mise/shims`,
        `${homeDir}/.rtx/shims`,

        // Bun
        `${homeDir}/.bun/bin`,

        // Deno
        `${homeDir}/.deno/bin`,

        // Go
        `${homeDir}/go/bin`,
        `${homeDir}/.go/bin`,

        // Rust/Cargo
        `${homeDir}/.cargo/bin`,

        // Python
        `${homeDir}/.pyenv/shims`,
        `${homeDir}/.local/bin`,

        // Ruby
        `${homeDir}/.rbenv/shims`,
        `${homeDir}/.rvm/bin`,

        // Homebrew (macOS)
        "/opt/homebrew/bin",
        "/opt/homebrew/sbin",
        "/usr/local/bin",
        "/usr/local/sbin",

        // Linuxbrew
        `${homeDir}/.linuxbrew/bin`,
        "/home/linuxbrew/.linuxbrew/bin",

        // Common Linux paths
        "/snap/bin",
        "/usr/local/go/bin",
      ]
        .filter(Boolean)
        .join(":");

      const enhancedPath = additionalPaths + ":" + (process.env.PATH || "");

      const proc = spawn(cmd, args, {
        cwd: repoPath,
        shell: true,
        // detached: true creates a new process group, allowing us to kill all child processes
        detached: true,
        env: { ...process.env, PATH: enhancedPath, FORCE_COLOR: "1" },
      });

      state.process = proc;

      // Handle stdout
      proc.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        this.addLog("stdout", text);
      });

      // Handle stderr
      proc.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        this.addLog("stderr", text);
      });

      // Handle process exit
      proc.on("close", (code) => {
        if (this.currentServer) {
          if (code === 0 || code === null) {
            this.currentServer.status = "stopped";
          } else {
            this.currentServer.status = "error";
            this.currentServer.error = `Process exited with code ${code}`;
          }
          this.currentServer.process = null;
        }
      });

      proc.on("error", (err) => {
        if (this.currentServer) {
          this.currentServer.status = "error";
          this.currentServer.error = err.message;
          this.currentServer.process = null;
        }
      });

      // Mark as running after a brief delay to allow for startup errors
      setTimeout(() => {
        if (this.currentServer && this.currentServer.status === "starting") {
          this.currentServer.status = "running";
        }
      }, 500);

      return this.getPublicState(state);
    } catch (err) {
      state.status = "error";
      state.error = err instanceof Error ? err.message : "Failed to start server";
      return this.getPublicState(state);
    }
  }

  /**
   * Stop the dev server for a project.
   */
  stop(projectId: string): boolean {
    if (this.currentProjectId !== projectId || !this.currentServer) {
      return false;
    }
    return this.stopInternal();
  }

  /**
   * Internal stop method.
   * Kills the entire process group to ensure all child processes (like Vite) are terminated.
   */
  private stopInternal(): boolean {
    if (!this.currentServer) {
      return false;
    }

    if (this.currentServer.process && this.currentServer.process.pid) {
      const pid = this.currentServer.process.pid;

      try {
        // Kill the entire process group (negative PID) to ensure all child processes are terminated
        // This is crucial for dev servers that spawn child processes (Vite, webpack, etc.)
        process.kill(-pid, "SIGTERM");
      } catch {
        // If process group kill fails, try killing just the process
        try {
          this.currentServer.process.kill("SIGTERM");
        } catch {
          // Process may already be dead
        }
      }

      // Force kill after 3 seconds if still running
      const proc = this.currentServer.process;
      setTimeout(() => {
        if (proc && proc.pid && !proc.killed) {
          try {
            // Try to kill the process group with SIGKILL
            process.kill(-proc.pid, "SIGKILL");
          } catch {
            try {
              proc.kill("SIGKILL");
            } catch {
              // Process already dead
            }
          }
        }
      }, 3000);
    }

    this.currentServer.status = "stopped";
    this.currentServer.process = null;
    return true;
  }

  /**
   * Get the current status of a dev server.
   */
  getStatus(projectId: string): DevServerState | null {
    if (this.currentProjectId !== projectId || !this.currentServer) {
      return null;
    }
    return this.getPublicState(this.currentServer);
  }

  /**
   * Get all buffered logs for a project.
   */
  getLogs(projectId: string): LogEntry[] {
    if (this.currentProjectId !== projectId || !this.currentServer) {
      return [];
    }
    return this.currentServer.logs;
  }

  /**
   * Subscribe to log updates for a project.
   * Returns an unsubscribe function.
   */
  subscribe(projectId: string, callback: (entry: LogEntry) => void): () => void {
    if (this.currentProjectId !== projectId || !this.currentServer) {
      return () => {};
    }

    this.currentServer.subscribers.add(callback);
    return () => {
      this.currentServer?.subscribers.delete(callback);
    };
  }

  /**
   * Stop all running servers synchronously.
   * Called on process exit - must be synchronous to ensure cleanup before exit.
   */
  stopAll(): void {
    if (!this.currentServer?.process?.pid) {
      return;
    }

    const pid = this.currentServer.process.pid;

    try {
      // Kill the entire process group synchronously
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        this.currentServer.process.kill("SIGKILL");
      } catch {
        // Process already dead
      }
    }

    this.currentServer.status = "stopped";
    this.currentServer.process = null;
  }

  private addLog(type: "stdout" | "stderr", text: string): void {
    if (!this.currentServer) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      type,
      text,
    };

    this.currentServer.logs.push(entry);

    // Trim to max lines
    if (this.currentServer.logs.length > MAX_LOG_LINES) {
      this.currentServer.logs = this.currentServer.logs.slice(-MAX_LOG_LINES);
    }

    // Notify subscribers
    for (const subscriber of this.currentServer.subscribers) {
      try {
        subscriber(entry);
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  private getPublicState(state: InternalServerState): DevServerState {
    return {
      status: state.status,
      logs: state.logs,
      error: state.error,
      startedAt: state.startedAt,
      packageManager: state.packageManager,
    };
  }
}

// Singleton instance
export const devServerManager = new DevServerManager();

// Cleanup on process exit
process.on("exit", () => {
  devServerManager.stopAll();
});

process.on("SIGINT", () => {
  devServerManager.stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  devServerManager.stopAll();
  process.exit(0);
});
