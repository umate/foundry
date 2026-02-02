import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";
import { getCurrentBranch, getRemotes } from "@/lib/git";

const execAsync = promisify(exec);

interface PushRequest {
  projectId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PushRequest = await request.json();
    const { projectId } = body;

    const result = await getProjectWithRepo(projectId);
    if (!result.success) return result.response;
    const { project } = result;

    // Check for remotes
    const remotes = await getRemotes(project.repoPath);
    if (remotes.length === 0) {
      return NextResponse.json(
        { error: "No remote repository configured" },
        { status: 400 }
      );
    }

    // Get current branch
    const branch = await getCurrentBranch(project.repoPath);
    if (!branch) {
      return NextResponse.json(
        { error: "Could not determine current branch" },
        { status: 400 }
      );
    }

    // Use the first remote (typically "origin")
    const remote = remotes[0];

    // Execute git push with upstream tracking
    try {
      await execAsync(`git push -u ${remote.name} ${branch}`, {
        cwd: project.repoPath,
        timeout: 60000, // 60 second timeout for push
      });
    } catch (pushError) {
      const errorMessage =
        pushError instanceof Error ? pushError.message : "Unknown error";

      // Handle specific push errors
      if (
        errorMessage.includes("rejected") ||
        errorMessage.includes("non-fast-forward")
      ) {
        return NextResponse.json(
          {
            error:
              "Push rejected: Remote contains work that you do not have locally. Pull the latest changes first.",
            code: "REJECTED",
          },
          { status: 409 }
        );
      }

      if (
        errorMessage.includes("Authentication failed") ||
        errorMessage.includes("could not read Username") ||
        errorMessage.includes("Permission denied")
      ) {
        return NextResponse.json(
          {
            error:
              "Authentication failed. Please check your git credentials or SSH keys.",
            code: "AUTH_FAILED",
          },
          { status: 401 }
        );
      }

      if (
        errorMessage.includes("Could not resolve host") ||
        errorMessage.includes("Network is unreachable") ||
        errorMessage.includes("Connection refused")
      ) {
        return NextResponse.json(
          {
            error:
              "Network error: Could not connect to remote repository. Please check your internet connection.",
            code: "NETWORK_ERROR",
          },
          { status: 503 }
        );
      }

      // Generic push error
      console.error("Git push failed:", pushError);
      return NextResponse.json(
        { error: "Failed to push changes", code: "PUSH_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      remote: remote.name,
      branch,
      url: remote.url,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Push error:", error);

    if (errorMessage.includes("not a git repository")) {
      return NextResponse.json(
        { error: "Not a git repository" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to push changes" },
      { status: 500 }
    );
  }
}

// GET endpoint to check remote status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const result = await getProjectWithRepo(searchParams.get("projectId"));
  if (!result.success) return result.response;
  const { project } = result;

  try {
    const remotes = await getRemotes(project.repoPath);
    const branch = await getCurrentBranch(project.repoPath);

    return NextResponse.json({
      hasRemote: remotes.length > 0,
      remotes,
      branch,
    });
  } catch (error) {
    console.error("Failed to check remote status:", error);
    return NextResponse.json(
      { error: "Failed to check remote status" },
      { status: 500 }
    );
  }
}
