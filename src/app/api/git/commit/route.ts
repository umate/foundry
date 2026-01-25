import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";

const execAsync = promisify(exec);

// Helper to run git commit with message via stdin (preserves newlines)
function gitCommitWithMessage(cwd: string, message: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", ["commit", "-F", "-"], { cwd });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data; });
    proc.stderr.on("data", (data) => { stderr += data; });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout));
      }
    });

    proc.stdin.write(message);
    proc.stdin.end();
  });
}

interface CommitRequest {
  projectId: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CommitRequest = await request.json();
    const { projectId, message } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Commit message is required" },
        { status: 400 }
      );
    }

    const result = await getProjectWithRepo(projectId);
    if (!result.success) return result.response;
    const { project } = result;

    // Stage all changes
    await execAsync("git add -A", { cwd: project.repoPath });

    // Commit with the provided message
    // Use -F - to pass message via stdin to preserve newlines properly
    const sanitizedMessage = message.trim();
    const stdout = await gitCommitWithMessage(project.repoPath, sanitizedMessage);

    // Extract commit hash from output
    const hashMatch = stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const commitHash = hashMatch ? hashMatch[1] : null;

    return NextResponse.json({
      success: true,
      commitHash,
      message: sanitizedMessage
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to commit:", error);

    // Handle specific git errors
    if (errorMessage.includes("nothing to commit")) {
      return NextResponse.json(
        { error: "No changes to commit" },
        { status: 400 }
      );
    }

    if (errorMessage.includes("not a git repository")) {
      return NextResponse.json(
        { error: "Not a git repository" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to commit changes" },
      { status: 500 }
    );
  }
}
