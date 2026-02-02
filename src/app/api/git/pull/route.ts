import { NextRequest, NextResponse } from "next/server";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";
import { getUncommittedCount, pullBranch } from "@/lib/git";

interface PullRequest {
  projectId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PullRequest = await request.json();
    const { projectId } = body;

    const result = await getProjectWithRepo(projectId);
    if (!result.success) return result.response;
    const { project } = result;

    // Block pull if there are uncommitted changes
    const uncommittedCount = await getUncommittedCount(project.repoPath);
    if (uncommittedCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot pull with uncommitted changes. Commit or discard your changes first.",
          code: "UNCOMMITTED_CHANGES",
        },
        { status: 409 }
      );
    }

    try {
      const { summary } = await pullBranch(project.repoPath);

      return NextResponse.json({
        success: true,
        summary,
      });
    } catch (pullError) {
      const errorMessage =
        pullError instanceof Error ? pullError.message : "Unknown error";

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

      if (errorMessage.includes("CONFLICT") || errorMessage.includes("merge conflict")) {
        return NextResponse.json(
          {
            error:
              "Pull resulted in merge conflicts. Please resolve them manually.",
            code: "MERGE_CONFLICT",
          },
          { status: 409 }
        );
      }

      console.error("Git pull failed:", pullError);
      return NextResponse.json(
        { error: "Failed to pull changes", code: "PULL_FAILED" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Pull error:", error);
    return NextResponse.json(
      { error: "Failed to pull changes" },
      { status: 500 }
    );
  }
}
